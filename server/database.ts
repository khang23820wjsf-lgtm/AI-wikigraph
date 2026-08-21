import { JSONFilePreset } from 'lowdb/node';
import path from 'path';
import fs from 'fs';

export interface SavedGraph {
  id: string;
  cacheKey: string;
  normalizedKey: string;
  aliases: string[];
  title: string;
  wikiTitle: string;
  wikiUrl: string;
  language: string;
  summary: string;
  thumbnailUrl?: string;
  focus?: string;
  nodes: any[]; // Base Graph nodes only (clean and reusable)
  links: any[]; // Base Graph links only (clean and reusable)
  expansions?: Record<string, { nodeKey?: string; newNodes: any[]; newLinks: any[]; createdAt: string }>; // Hidden separate expansion pool
  chatHistory?: Record<string, any[]>;
  nodeVideos?: Record<string, any[]>;
  nodeCount: number;
  linkCount: number;
  reuseCount: number;
  viewCount: number;
  lastReusedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseSchema {
  graphs: SavedGraph[];
  stats: {
    totalSearches: number;
    totalCacheHits: number;
    totalAiTokensSavedEst: number;
  };
}

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const defaultData: DatabaseSchema = {
  graphs: [],
  stats: {
    totalSearches: 0,
    totalCacheHits: 0,
    totalAiTokensSavedEst: 0
  }
};

// Normalize strings for matching across languages, accents, spacing and cases
export function normalizeKey(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove vietnamese / accents
    .replace(/[_\-\+–—\.\,\;\:\!\?\'\"\(\)\[\]\{\}\/\\#&]/g, ' ') // replace punctuation with space
    .replace(/\s+/g, ' ') // multiple spaces to single
    .trim();
}

// Initialize database instance
export async function getDb() {
  const dbPath = path.join(dbDir, 'wikigraph_db.json');
  return await JSONFilePreset<DatabaseSchema>(dbPath, defaultData);
}

// Smart multi-level search in Database
export async function findSmartCachedGraph(params: {
  rawQuery: string;
  canonicalWikiTitle?: string;
  language: string;
  focus?: string;
}): Promise<SavedGraph | null> {
  try {
    const db = await getDb();
    await db.read();
    if (!db.data.graphs || db.data.graphs.length === 0) return null;

    const { rawQuery, canonicalWikiTitle, language, focus = 'all' } = params;
    const normQuery = normalizeKey(rawQuery);
    const normCanonical = canonicalWikiTitle ? normalizeKey(canonicalWikiTitle) : '';
    const exactCacheKey = `${language}:${(canonicalWikiTitle || rawQuery).toLowerCase().trim()}:${focus}`;

    // 1. Exact CacheKey match
    let match = db.data.graphs.find(g => g.cacheKey === exactCacheKey);
    if (match) {
      await recordGraphHit(db, match.id);
      return match;
    }

    // 2. Canonical Wiki Title Match in same language
    if (canonicalWikiTitle) {
      match = db.data.graphs.find(g => 
        (g.language === language || !g.language) &&
        (normalizeKey(g.wikiTitle) === normCanonical || normalizeKey(g.title) === normCanonical)
      );
      if (match) {
        // Tag query as alias if not already present
        await addAliasToGraph(db, match.id, rawQuery);
        await recordGraphHit(db, match.id);
        return match;
      }
    }

    // 3. Normalized Title / WikiTitle match
    match = db.data.graphs.find(g => 
      (g.language === language || !g.language) &&
      (normalizeKey(g.wikiTitle) === normQuery || normalizeKey(g.title) === normQuery || g.normalizedKey === normQuery)
    );
    if (match) {
      await addAliasToGraph(db, match.id, rawQuery);
      await recordGraphHit(db, match.id);
      return match;
    }

    // 4. Aliases array match
    match = db.data.graphs.find(g => 
      Array.isArray(g.aliases) && g.aliases.some(a => normalizeKey(a) === normQuery || (normCanonical && normalizeKey(a) === normCanonical))
    );
    if (match) {
      await addAliasToGraph(db, match.id, rawQuery);
      await recordGraphHit(db, match.id);
      return match;
    }

    // 5. Wiki URL slug match
    const cleanSlug = rawQuery.replace(/^https?:\/\/[^\/]+\/wiki\//i, '').replace(/_/g, ' ');
    const normSlug = normalizeKey(cleanSlug);
    if (normSlug && normSlug !== normQuery) {
      match = db.data.graphs.find(g => 
        normalizeKey(g.wikiTitle) === normSlug || normalizeKey(g.title) === normSlug
      );
      if (match) {
        await addAliasToGraph(db, match.id, rawQuery);
        await recordGraphHit(db, match.id);
        return match;
      }
    }

    // 6. Cross-language / Exact universal title match (e.g., 'Albert Einstein')
    if (normQuery.length >= 4) {
      match = db.data.graphs.find(g => 
        normalizeKey(g.title) === normQuery || normalizeKey(g.wikiTitle) === normQuery
      );
      if (match) {
        await addAliasToGraph(db, match.id, rawQuery);
        await recordGraphHit(db, match.id);
        return match;
      }
    }

    return null;
  } catch (err) {
    console.error('Error finding smart cached graph:', err);
    return null;
  }
}

// Helper to record reuse / cache hit stats
async function recordGraphHit(db: any, graphId: string) {
  try {
    const graph = db.data.graphs.find((g: SavedGraph) => g.id === graphId);
    if (graph) {
      graph.reuseCount = (graph.reuseCount || 0) + 1;
      graph.viewCount = (graph.viewCount || 0) + 1;
      graph.lastReusedAt = new Date().toISOString();
      if (!db.data.stats) {
        db.data.stats = { totalSearches: 0, totalCacheHits: 0, totalAiTokensSavedEst: 0 };
      }
      db.data.stats.totalCacheHits = (db.data.stats.totalCacheHits || 0) + 1;
      db.data.stats.totalAiTokensSavedEst = (db.data.stats.totalAiTokensSavedEst || 0) + 4500;
      await db.write();
    }
  } catch (e) {
    console.error('Error recording graph hit:', e);
  }
}

// Add alternate search query as alias to existing graph
async function addAliasToGraph(db: any, graphId: string, alias: string) {
  try {
    if (!alias || alias.length < 2) return;
    const graph = db.data.graphs.find((g: SavedGraph) => g.id === graphId);
    if (graph) {
      if (!graph.aliases) graph.aliases = [];
      const cleanAlias = alias.trim();
      if (!graph.aliases.includes(cleanAlias)) {
        graph.aliases.push(cleanAlias);
        await db.write();
      }
    }
  } catch (e) {
    // silent
  }
}

// Find graph by unique ID
export async function findGraphById(id: string): Promise<SavedGraph | null> {
  try {
    const db = await getDb();
    await db.read();
    const graph = db.data.graphs.find((g) => g.id === id);
    if (graph) {
      graph.viewCount = (graph.viewCount || 0) + 1;
      await db.write();
    }
    return graph || null;
  } catch (err) {
    console.error('Error finding graph by id:', err);
    return null;
  }
}

// Save or update graph in database (with auto normalization & alias indexing)
export async function saveGraphToDb(
  graphData: Omit<SavedGraph, 'id' | 'createdAt' | 'updatedAt' | 'nodeCount' | 'linkCount' | 'reuseCount' | 'viewCount' | 'normalizedKey' | 'aliases'> & {
    id?: string;
    aliases?: string[];
    searchQuery?: string;
  }
): Promise<SavedGraph> {
  const db = await getDb();
  await db.read();

  const id = graphData.id || `graph_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const normalizedKey = normalizeKey(graphData.title || graphData.wikiTitle);

  const initialAliases: string[] = Array.from(
    new Set([
      graphData.title,
      graphData.wikiTitle,
      graphData.searchQuery,
      ...(graphData.aliases || [])
    ].filter(Boolean) as string[])
  );

  const existingIndex = db.data.graphs.findIndex((g) => 
    g.id === id || 
    g.cacheKey === graphData.cacheKey ||
    (g.language === graphData.language && g.normalizedKey === normalizedKey)
  );

  const existingGraph = existingIndex >= 0 ? db.data.graphs[existingIndex] : null;

  const newGraph: SavedGraph = {
    ...graphData,
    id: existingGraph ? existingGraph.id : id,
    normalizedKey,
    aliases: existingGraph ? Array.from(new Set([...(existingGraph.aliases || []), ...initialAliases])) : initialAliases,
    nodeCount: graphData.nodes ? graphData.nodes.length : 0,
    linkCount: graphData.links ? graphData.links.length : 0,
    reuseCount: existingGraph ? existingGraph.reuseCount : 0,
    viewCount: existingGraph ? existingGraph.viewCount + 1 : 1,
    lastReusedAt: existingGraph?.lastReusedAt,
    chatHistory: existingGraph?.chatHistory ? { ...existingGraph.chatHistory, ...graphData.chatHistory } : (graphData.chatHistory || {}),
    nodeVideos: existingGraph?.nodeVideos ? { ...existingGraph.nodeVideos, ...graphData.nodeVideos } : (graphData.nodeVideos || {}),
    createdAt: existingGraph ? existingGraph.createdAt : now,
    updatedAt: now
  };

  if (existingIndex >= 0) {
    db.data.graphs[existingIndex] = newGraph;
  } else {
    db.data.graphs.unshift(newGraph); // newest at the top
  }

  if (!db.data.stats) {
    db.data.stats = { totalSearches: 0, totalCacheHits: 0, totalAiTokensSavedEst: 0 };
  }
  db.data.stats.totalSearches = (db.data.stats.totalSearches || 0) + 1;

  await db.write();
  return newGraph;
}

// Save node expansion as hidden isolated data in DB without polluting the base graph
export async function saveNodeExpansionToDb(
  graphId: string,
  nodeKey: string,
  newNodes: any[],
  newLinks: any[]
): Promise<void> {
  try {
    if (!graphId || !nodeKey) return;
    const db = await getDb();
    await db.read();

    const graph = db.data.graphs.find((g) => g.id === graphId);
    if (!graph) return;

    if (!graph.expansions) {
      graph.expansions = {};
    }

    const cleanKey = normalizeKey(nodeKey);
    graph.expansions[cleanKey] = {
      nodeKey,
      newNodes,
      newLinks,
      createdAt: new Date().toISOString()
    };
    graph.updatedAt = new Date().toISOString();

    await db.write();
  } catch (err) {
    console.error('Error saving node expansion to DB:', err);
  }
}

// Retrieve cached hidden node expansion if it exists
export async function getNodeExpansionFromDb(
  graphId: string,
  nodeKey: string
): Promise<{ newNodes: any[]; newLinks: any[] } | null> {
  try {
    if (!graphId || !nodeKey) return null;
    const db = await getDb();
    await db.read();

    const graph = db.data.graphs.find((g) => g.id === graphId);
    if (!graph || !graph.expansions) return null;

    const cleanKey = normalizeKey(nodeKey);
    if (graph.expansions[cleanKey]) {
      return {
        newNodes: graph.expansions[cleanKey].newNodes || [],
        newLinks: graph.expansions[cleanKey].newLinks || []
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

// Cache YouTube video recommendations inside database graph
export async function saveNodeVideosToDb(graphId: string, nodeLabel: string, videos: any[]) {
  try {
    if (!graphId || !nodeLabel || !videos || videos.length === 0) return;
    const db = await getDb();
    await db.read();
    const graph = db.data.graphs.find((g) => g.id === graphId);
    if (graph) {
      if (!graph.nodeVideos) graph.nodeVideos = {};
      graph.nodeVideos[nodeLabel] = videos;
      await db.write();
    }
  } catch (err) {
    console.error('Error saving node videos cache:', err);
  }
}

// Get cached YouTube video recommendations for a node
export async function getNodeVideosFromDb(graphId: string, nodeLabel: string): Promise<any[] | null> {
  try {
    if (!graphId || !nodeLabel) return null;
    const db = await getDb();
    await db.read();
    const graph = db.data.graphs.find((g) => g.id === graphId);
    if (graph && graph.nodeVideos && graph.nodeVideos[nodeLabel]) {
      return graph.nodeVideos[nodeLabel];
    }
    return null;
  } catch (err) {
    return null;
  }
}

// Get list of community & saved graphs with full stats
export async function getGraphHistoryList() {
  try {
    const db = await getDb();
    await db.read();

    return db.data.graphs.map((g) => ({
      id: g.id,
      cacheKey: g.cacheKey,
      title: g.title,
      wikiTitle: g.wikiTitle,
      summary: g.summary,
      language: g.language,
      thumbnailUrl: g.thumbnailUrl,
      nodeCount: g.nodeCount || (g.nodes ? g.nodes.length : 0),
      linkCount: g.linkCount || (g.links ? g.links.length : 0),
      reuseCount: g.reuseCount || 0,
      viewCount: g.viewCount || 1,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt
    }));
  } catch (err) {
    console.error('Error getting graph history list:', err);
    return [];
  }
}

// Search community database for autocomplete matches
export async function searchDatabaseGraphs(query: string, language: string = 'vi'): Promise<any[]> {
  try {
    const db = await getDb();
    await db.read();
    if (!query || query.trim().length < 1) return [];

    const normQuery = normalizeKey(query);

    const matches = db.data.graphs.filter(g => {
      const matchLang = !language || g.language === language || g.language === 'en';
      if (!matchLang) return false;

      const normTitle = normalizeKey(g.title);
      const normWiki = normalizeKey(g.wikiTitle);
      const inAliases = Array.isArray(g.aliases) && g.aliases.some(a => normalizeKey(a).includes(normQuery));

      return normTitle.includes(normQuery) || normWiki.includes(normQuery) || inAliases;
    });

    return matches.slice(0, 5).map(g => ({
      id: g.id,
      title: g.title,
      description: g.summary ? (g.summary.length > 120 ? g.summary.slice(0, 120) + '...' : g.summary) : '',
      url: g.wikiUrl,
      cachedInDb: true,
      reuseCount: g.reuseCount || 0,
      nodeCount: g.nodeCount || (g.nodes?.length || 0),
      thumbnail: g.thumbnailUrl
    }));
  } catch (err) {
    return [];
  }
}

// Get global database metrics & savings
export async function getDatabaseStats() {
  try {
    const db = await getDb();
    await db.read();

    const totalGraphs = db.data.graphs.length;
    let totalNodes = 0;
    let totalLinks = 0;
    let totalReuses = 0;

    for (const g of db.data.graphs) {
      totalNodes += g.nodeCount || (g.nodes ? g.nodes.length : 0);
      totalLinks += g.linkCount || (g.links ? g.links.length : 0);
      totalReuses += g.reuseCount || 0;
    }

    return {
      totalGraphs,
      totalNodes,
      totalLinks,
      totalReuses,
      totalCacheHits: db.data.stats?.totalCacheHits || totalReuses,
      totalAiTokensSaved: db.data.stats?.totalAiTokensSavedEst || (totalReuses * 4500),
      avgSpeedupSec: '0.05s (Tức thì)',
      databaseStatus: 'Active & Optimized'
    };
  } catch (err) {
    return {
      totalGraphs: 0,
      totalNodes: 0,
      totalLinks: 0,
      totalReuses: 0,
      totalCacheHits: 0,
      totalAiTokensSaved: 0,
      avgSpeedupSec: '0.05s',
      databaseStatus: 'Active'
    };
  }
}

// Delete graph by ID from database
export async function deleteGraphById(id: string) {
  try {
    const db = await getDb();
    await db.read();
    db.data.graphs = db.data.graphs.filter((g) => g.id !== id);
    await db.write();
    return true;
  } catch (err) {
    console.error('Error deleting graph from history:', err);
    return false;
  }
}

// Save deep dive chat messages into graph history
export async function saveGraphChatMessage(graphId: string, nodeLabel: string, userMsg: any, aiMsg: any) {
  try {
    const db = await getDb();
    await db.read();
    const graph = db.data.graphs.find((g) => g.id === graphId);
    if (graph) {
      if (!graph.chatHistory) graph.chatHistory = {};
      if (!graph.chatHistory[nodeLabel]) graph.chatHistory[nodeLabel] = [];
      graph.chatHistory[nodeLabel].push(userMsg, aiMsg);
      graph.updatedAt = new Date().toISOString();
      await db.write();
    }
  } catch (err) {
    console.error('Error saving chat message to db:', err);
  }
}
