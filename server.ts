import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { jsonrepair } from 'jsonrepair';
import { 
  findSmartCachedGraph,
  findGraphById, 
  saveGraphToDb, 
  saveNodeExpansionToDb,
  getNodeExpansionFromDb,
  saveNodeVideosToDb,
  getNodeVideosFromDb,
  searchDatabaseGraphs,
  getDatabaseStats,
  getGraphHistoryList, 
  deleteGraphById, 
  saveGraphChatMessage 
} from './server/database.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper: Gemini API generation with fast fallback models
async function generateContentWithRetryAndFallback(params: {
  contents: any;
  config?: any;
  preferredModel?: string;
}) {
  const models = [
    params.preferredModel || 'gemini-flash-latest',
    'gemini-3.7-flash',
    'gemini-3.1-flash-lite'
  ].filter((v, i, a) => a.indexOf(v) === i);

  let lastError: any = null;

  for (const modelName of models) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: params.contents,
        config: params.config
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const errStr = String(err?.message || err);
      console.warn(`[Gemini API] Call with model '${modelName}' failed (${errStr.slice(0, 120)}). Trying fallback model...`);
    }
  }

  throw lastError;
}

// Helper: Safely parse JSON even if truncated or wrapped in markdown fences
function safeParseJSON(text: string): any {
  if (!text) return {};
  let cleaned = text.trim();
  
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    try {
      const repairedText = jsonrepair(cleaned);
      return JSON.parse(repairedText);
    } catch (repairErr) {
      try {
        const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
        if (lastBrace > 0) {
          const truncated = cleaned.substring(0, lastBrace + 1);
          const repairedText2 = jsonrepair(truncated);
          return JSON.parse(repairedText2);
        }
      } catch (e) {
        console.error('All JSON parsing attempts failed:', e);
      }
      return {};
    }
  }
}

// Helper: Extract Wikipedia title and language from URL or string
function parseWikiTarget(input: string, defaultLang: string = 'vi'): { lang: string; title: string } {
  let cleanInput = input.trim();
  
  if (cleanInput.startsWith('http://') || cleanInput.startsWith('https://')) {
    try {
      const url = new URL(cleanInput);
      const hostParts = url.hostname.split('.');
      let lang = defaultLang;
      if (hostParts.length >= 3 && hostParts[1] === 'wikipedia') {
        lang = hostParts[0];
      }
      let pathname = url.pathname;
      if (pathname.startsWith('/wiki/')) {
        let rawTitle = pathname.replace('/wiki/', '');
        let title = decodeURIComponent(rawTitle).replace(/_/g, ' ');
        return { lang, title };
      }
    } catch (e) {
      // Fallback
    }
  }

  // Clean raw string input
  cleanInput = decodeURIComponent(cleanInput).replace(/_/g, ' ');
  const isVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(cleanInput);
  const lang = isVietnamese ? 'vi' : defaultLang;

  return { lang, title: cleanInput };
}

// Helper: Fetch Wikipedia REST summary and lead content
async function fetchWikipediaContent(lang: string, rawTitle: string) {
  const cleanTitle = decodeURIComponent(rawTitle).replace(/_/g, ' ').trim();
  const headers = {
    'User-Agent': 'WikiGraphAI/1.0 (https://ais-dev-uvyr4lj3qrvl6sihr34ty5-421637756029.asia-east1.run.app; contact@wikigraph.app)'
  };

  let pageTitle = cleanTitle;
  let summaryData: any = null;

  // Try 1: REST API Summary
  try {
    const encoded = encodeURIComponent(cleanTitle.replace(/ /g, '_'));
    const summaryRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`, { headers });
    if (summaryRes.ok) {
      summaryData = await summaryRes.json();
      pageTitle = summaryData.title || cleanTitle;
    }
  } catch (e) {
    // Fallback below
  }

  // Try 2: Wikipedia Search API if summary not found or 404
  if (!summaryData) {
    try {
      const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanTitle)}&utf8=1&format=json`;
      const searchRes = await fetch(searchUrl, { headers });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const hits = searchData?.query?.search;
        if (hits && hits.length > 0) {
          pageTitle = hits[0].title;
          const encodedResolved = encodeURIComponent(pageTitle.replace(/ /g, '_'));
          const sumRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodedResolved}`, { headers });
          if (sumRes.ok) {
            summaryData = await sumRes.json();
          }
        }
      }
    } catch (err) {
      console.warn('Search fallback failed:', err);
    }
  }

  // Extract rich text using Action API
  let fullExtract = summaryData?.extract || '';
  let thumbnail = summaryData?.thumbnail?.source || summaryData?.originalimage?.source;
  let displayTitle = summaryData?.displaytitle ? summaryData.displaytitle.replace(/<[^>]+>/g, '') : pageTitle;
  let description = summaryData?.description || '';
  let pageUrl = summaryData?.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`;

  try {
    const actionUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages|info&exintro=1&explaintext=1&pithumbsize=800&inprop=url&titles=${encodeURIComponent(pageTitle)}&redirects=1&format=json`;
    const actionRes = await fetch(actionUrl, { headers });
    if (actionRes.ok) {
      const actionData = await actionRes.json();
      const pages = actionData?.query?.pages;
      if (pages) {
        const pageId = Object.keys(pages)[0];
        if (pageId && pageId !== '-1') {
          const page = pages[pageId];
          if (page.extract && page.extract.length > fullExtract.length) {
            fullExtract = page.extract;
          }
          if (page.thumbnail?.source && !thumbnail) {
            thumbnail = page.thumbnail.source;
          }
          if (page.fullurl && !pageUrl) {
            pageUrl = page.fullurl;
          }
          if (page.title) {
            pageTitle = page.title;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Action API query error:', err);
  }

  if (!fullExtract && !description) {
    throw new Error(`Không tìm thấy thông tin Wikipedia cho: "${cleanTitle}"`);
  }

  return {
    title: pageTitle,
    displayTitle: displayTitle || pageTitle,
    description,
    extract: fullExtract || description,
    url: pageUrl,
    thumbnail,
    lang
  };
}

// API Routes

// 1. Search Wikipedia Autocomplete + Community Database Matching
app.get('/api/wiki/search', async (req, res) => {
  try {
    const query = (req.query.q as string) || '';
    const lang = (req.query.lang as string) || 'vi';
    if (!query || query.length < 1) {
      return res.json([]);
    }

    // Step 1: Query already-generated graphs from the Community Database
    const dbMatches = await searchDatabaseGraphs(query, lang);

    const headers = {
      'User-Agent': 'WikiGraphApp/1.0 (https://wikigraph.app; contact@wikigraph.app) Mozilla/5.0'
    };

    let wikiResults: any[] = [];

    // Step 2: Try Wikipedia Opensearch API
    try {
      const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=10&format=json&origin=*`;
      const response = await fetch(searchUrl, { headers });
      
      if (response.ok) {
        const data = await response.json();
        const titles = data[1] || [];
        const descriptions = data[2] || [];
        const urls = data[3] || [];

        if (titles.length > 0) {
          wikiResults = titles.map((t: string, idx: number) => ({
            title: t,
            description: descriptions[idx] || '',
            url: urls[idx] || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`,
            cachedInDb: false
          }));
        }
      }
    } catch (e) {
      // ignore
    }

    // Step 3: Fallback to Wikipedia REST Title Search API if Opensearch was empty
    if (wikiResults.length === 0) {
      try {
        const restUrl = `https://${lang}.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(query)}&limit=10`;
        const restResponse = await fetch(restUrl, { headers });

        if (restResponse.ok) {
          const restData = await restResponse.json();
          const pages = restData?.pages || [];
          wikiResults = pages.map((p: any) => ({
            title: p.title || p.key,
            description: p.description || p.matched_title || '',
            url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent((p.key || p.title).replace(/ /g, '_'))}`,
            cachedInDb: false
          }));
        }
      } catch (e) {
        // ignore
      }
    }

    // Combine DB cached items (at the top) and deduplicate with Wiki items
    const dbTitles = new Set(dbMatches.map(m => m.title.toLowerCase().trim()));
    const filteredWiki = wikiResults.filter(w => !dbTitles.has(w.title.toLowerCase().trim()));

    res.json([...dbMatches, ...filteredWiki]);
  } catch (error) {
    console.error('Error in wiki search autocomplete:', error);
    res.json([]);
  }
});

// Database Global Stats Endpoint
app.get('/api/database/stats', async (req, res) => {
  try {
    const stats = await getDatabaseStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: 'Không thể lấy thống kê database.' });
  }
});

// 2. Generate Knowledge Graph endpoint (with Multi-User Community Database Cache Optimization)
app.post('/api/wiki/generate-graph', async (req, res) => {
  try {
    const { input, language = 'vi', focus = 'all', forceRefresh = false } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Vui lòng nhập từ khóa hoặc liên kết Wikipedia.' });
    }

    const target = parseWikiTarget(input, language);

    // Step 1: Instant Smart DB Check before hitting Wikipedia if not forceRefresh
    if (!forceRefresh) {
      const cachedGraph = await findSmartCachedGraph({
        rawQuery: input,
        language: target.lang,
        focus
      });
      if (cachedGraph) {
        console.log(`[Database Instant Reuse] Served "${cachedGraph.title}" from user cache (Reused: ${cachedGraph.reuseCount} times)`);
        return res.json({
          ...cachedGraph,
          fromCache: true,
          reuseCount: cachedGraph.reuseCount,
          timeSaved: '0.05s',
          tokensSaved: 4500
        });
      }
    }

    // Step 2: Fetch fresh Wikipedia Content (and resolve canonical title / redirects)
    const wikiData = await fetchWikipediaContent(target.lang, target.title);
    const isVi = target.lang === 'vi';
    const canonicalTitle = wikiData.title;

    // Step 3: Check Smart DB with resolved canonical Wikipedia Title (catches redirects e.g. "Anhxtanh" -> "Albert Einstein")
    if (!forceRefresh) {
      const canonicalCached = await findSmartCachedGraph({
        rawQuery: input,
        canonicalWikiTitle: canonicalTitle,
        language: target.lang,
        focus
      });
      if (canonicalCached) {
        console.log(`[Database Canonical Hit] Served "${canonicalCached.title}" via canonical redirect for "${input}"`);
        return res.json({
          ...canonicalCached,
          fromCache: true,
          reuseCount: canonicalCached.reuseCount,
          timeSaved: '0.05s',
          tokensSaved: 4500
        });
      }
    }

    // Step 4: System instruction for Gemini Knowledge Graph extraction
    const systemInstruction = `Bạn là một chuyên gia khoa học dữ liệu và phân tích sơ đồ tri thức (Knowledge Graph) hàng đầu.
Nhiệm vụ của bạn là đọc nội dung bài viết Wikipedia được cung cấp và trích xuất một Sơ đồ tri thức (Knowledge Graph) phong phú, chính xác và có tính hệ thống.

QUY TẮC TRÍCH XUẤT:
1. Tạo một Node trung tâm chính đại diện cho chủ đề chính bài viết: "${wikiData.displayTitle}". Node này bắt buộc phải có trong danh sách nodes.
2. Trích xuất từ 12 đến 22 Node quan trọng bao gồm các loại (category):
   - 'person': Nhân vật lịch sử, nhà khoa học, nhà lãnh đạo liên quan.
   - 'event': Sự kiện, cuộc chiến, mốc thời gian quan trọng.
   - 'location': Địa danh, quốc gia, địa điểm liên quan.
   - 'concept': Khái niệm, lý thuyết, nguyên lý, định luật.
   - 'organization': Tổ chức, học viện, chính phủ, công ty.
   - 'discovery': Phát minh, công trình, tác phẩm.
   - 'period': Thời kỳ, kỷ nguyên, giai đoạn lịch sử.
   - 'other': Loại khác.
3. Với mỗi Node, xác định:
   - 'id': Slug độc nhất bằng chữ tiếng Anh không dấu, viết thường liền nhau (ví dụ: 'albert-einstein', 'relativity-theory'). Node chính bài viết có id đơn giản trùng tên bài.
   - 'label': Tên hiển thị rõ ràng bằng ngôn ngữ bài viết (${isVi ? 'tiếng Việt' : 'tiếng Anh'}).
   - 'category': Một trong các loại ở trên.
   - 'summary': Tóm tắt ngắn gọn 1-2 câu giải thích đối tượng này là gì và có ý nghĩa gì trong ngữ cảnh bài viết.
   - 'sourceQuote': ĐOẠN TRÍCH DẪN NGUỒN nguyên văn ngắn (1-2 câu) trích từ bài viết Wikipedia làm bằng chứng cho thông tin của node này.
   - 'importance': Điểm quan trọng từ 1 đến 10 (Node chính = 10, node quan trọng = 7-9, node bổ trợ = 4-6).
   - 'yearOrPeriod': Năm hoặc giai đoạn xảy ra/xuất hiện nếu có (ví dụ: '1905', '1939-1945', 'Thế kỷ XIX').
   - 'wikiTitle': Tên chuẩn bài viết Wikipedia tương ứng nếu có để người dùng nhấp vào xem.
   - 'details': 2-3 sự thật/chi tiết ngắn tiêu biểu.
4. Trích xuất các Liên kết (Links) nối giữa các Node:
   - 'source': ID của node nguồn.
   - 'target': ID của node đích.
   - 'relation': Nhãn mối quan hệ động từ/quan hệ rõ ràng (2-4 từ, ví dụ: "ảnh hưởng", "sống tại", "tham gia", "là một phần của", "sáng tạo ra", "lãnh đạo", "liên minh với", "phát minh", "xảy ra tại" hoặc tiếng Anh tương ứng như "influenced", "lived in", "participated in", "part of", "created").
   - 'description': Mô tả ngắn gọn về mối quan hệ giữa 2 đối tượng.
   - 'strength': Mức độ gắn kết từ 1 đến 5.
5. Ngôn ngữ trả về hoàn toàn bằng ${isVi ? 'tiếng Việt' : 'ngôn ngữ bài viết'}.
Focus ưu tiên: ${focus}.`;

    const promptText = `Tên bài viết Wikipedia: ${wikiData.displayTitle}
Mô tả tóm tắt: ${wikiData.description}
Nội dung chính:
${wikiData.extract ? wikiData.extract.slice(0, 8000) : ''}`;

    const response = await generateContentWithRetryAndFallback({
      preferredModel: 'gemini-flash-latest',
      contents: promptText,
      config: {
        systemInstruction,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Tên bài viết chính' },
            summary: { type: Type.STRING, description: 'Tóm tắt tổng quan bài viết' },
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  category: {
                    type: Type.STRING,
                    description: 'One of: person, event, location, concept, organization, discovery, period, other'
                  },
                  summary: { type: Type.STRING },
                  sourceQuote: { type: Type.STRING, description: 'Trích dẫn đoạn văn nguồn từ Wikipedia' },
                  importance: { type: Type.NUMBER },
                  yearOrPeriod: { type: Type.STRING },
                  wikiTitle: { type: Type.STRING },
                  details: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ['id', 'label', 'category', 'summary', 'importance']
              }
            },
            links: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING },
                  target: { type: Type.STRING },
                  relation: { type: Type.STRING },
                  description: { type: Type.STRING },
                  strength: { type: Type.NUMBER }
                },
                required: ['source', 'target', 'relation']
              }
            }
          },
          required: ['title', 'summary', 'nodes', 'links']
        }
      }
    });

    const resultText = response.text || '{}';
    const parsed = safeParseJSON(resultText);

    const rawNodes = parsed.nodes || [];
    const rawLinks = parsed.links || [];

    // Find root main node (importance = 10 or first)
    const mainNode = rawNodes.find((n: any) => n.importance === 10) || rawNodes[0];
    if (mainNode && wikiData.thumbnail) {
      mainNode.thumbnail = wikiData.thumbnail;
    }
    if (mainNode) {
      mainNode.wikiUrl = wikiData.url;
      mainNode.wikiTitle = wikiData.title;
    }

    // Set parentId for hierarchy: non-main nodes connect to mainNode if not specified
    const processedNodes = rawNodes.map((n: any) => {
      if (mainNode && n.id !== mainNode.id && !n.parentId) {
        const parentLink = rawLinks.find((l: any) => l.target === n.id);
        const parentId = parentLink ? parentLink.source : mainNode.id;
        return { ...n, parentId };
      }
      return n;
    });

    const cacheKey = `${target.lang}:${(canonicalTitle || target.title).toLowerCase().trim()}:${focus}`;

    // Step 5: Save into Global Shared Database for all users
    const savedGraph = await saveGraphToDb({
      cacheKey,
      searchQuery: input,
      aliases: [input, target.title, canonicalTitle, wikiData.displayTitle],
      title: wikiData.displayTitle,
      wikiTitle: canonicalTitle,
      wikiUrl: wikiData.url,
      language: target.lang,
      summary: parsed.summary || wikiData.extract.slice(0, 300),
      thumbnailUrl: wikiData.thumbnail,
      focus,
      nodes: processedNodes,
      links: rawLinks,
      chatHistory: {}
    });

    console.log(`[Database Saved & Shared] Graph indexed in database for all users: "${savedGraph.title}" (${savedGraph.id})`);

    res.json({
      ...savedGraph,
      fromCache: false,
      reuseCount: 0
    });
  } catch (error: any) {
    console.error('Error generating Knowledge Graph:', error);
    res.status(500).json({
      error: error.message || 'Có lỗi xảy ra khi tạo Sơ đồ tri thức từ Wikipedia.'
    });
  }
});

// Database History Endpoints
app.get('/api/history', async (req, res) => {
  try {
    const historyList = await getGraphHistoryList();
    res.json(historyList);
  } catch (err: any) {
    res.status(500).json({ error: 'Không thể tải lịch sử sơ đồ.' });
  }
});

app.get('/api/history/:id', async (req, res) => {
  try {
    const graph = await findGraphById(req.params.id);
    if (!graph) return res.status(404).json({ error: 'Không tìm thấy sơ đồ trong lịch sử.' });
    res.json(graph);
  } catch (err: any) {
    res.status(500).json({ error: 'Không thể tải chi tiết sơ đồ.' });
  }
});

app.delete('/api/history/:id', async (req, res) => {
  try {
    const success = await deleteGraphById(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: 'Không thể xóa sơ đồ.' });
  }
});

// 3. Expand Node Endpoint (Explores sub-nodes in workspace & stores isolated expansion cache in DB)
app.post('/api/wiki/expand-node', async (req, res) => {
  try {
    const { node, existingNodeIds = [], language = 'vi', graphId } = req.body;

    if (!node || !node.label) {
      return res.status(400).json({ error: 'Node không hợp lệ.' });
    }

    const nodeLookupKey = node.label || node.id;

    // Check if this node already has expansion data cached in the database expansion pool
    if (graphId) {
      const cachedExpansion = await getNodeExpansionFromDb(graphId, nodeLookupKey);
      if (cachedExpansion && cachedExpansion.newNodes && cachedExpansion.newNodes.length > 0) {
        console.log(`[Expansion Cache Hit] Returning cached expansion for node "${nodeLookupKey}" in graph "${graphId}".`);
        // Filter out nodes that might already be in user's current session
        const currentSet = new Set(existingNodeIds);
        const filteredCachedNodes = cachedExpansion.newNodes
          .filter((n: any) => !currentSet.has(n.id))
          .map((n: any) => ({ ...n, parentId: node.id }));

        return res.json({
          newNodes: filteredCachedNodes.length > 0 ? filteredCachedNodes : cachedExpansion.newNodes,
          newLinks: cachedExpansion.newLinks || []
        });
      }
    }

    // Try to fetch Wikipedia details for this node if wikiTitle exists
    let extraContext = '';
    if (node.wikiTitle || node.label) {
      try {
        const wikiInfo = await fetchWikipediaContent(language, node.wikiTitle || node.label);
        extraContext = wikiInfo.extract;
      } catch (e) {
        // Use node summary
        extraContext = node.summary || '';
      }
    }

    const systemInstruction = `Bạn là một chuyên gia sơ đồ tri thức AI.
Nhiệm vụ của bạn là mở rộng sơ đồ tri thức bằng cách phân tích chuyên sâu về khái niệm/nhân vật/sự kiện: "${node.label}".
Hãy tìm thêm từ 4 đến 7 Node mới liên quan chặt chẽ đến "${node.label}" mà CHƯA CÓ trong danh sách node hiện tại: [${existingNodeIds.join(', ')}].

Tạo các liên kết trực tiếp nối từ node gốc "${node.id}" (hoặc giữa các node mới) tới các node mới này.
Ngôn ngữ sử dụng: ${language === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh'}.`;

    const promptText = `Đối tượng cần mở rộng: ${node.label} (${node.category})
Mô tả hiện tại: ${node.summary}
Thông tin bổ sung: ${extraContext ? extraContext.slice(0, 5000) : ''}`;

    const response = await generateContentWithRetryAndFallback({
      preferredModel: 'gemini-flash-latest',
      contents: promptText,
      config: {
        systemInstruction,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            newNodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  category: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  importance: { type: Type.NUMBER },
                  yearOrPeriod: { type: Type.STRING },
                  wikiTitle: { type: Type.STRING },
                  details: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ['id', 'label', 'category', 'summary', 'importance']
              }
            },
            newLinks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING },
                  target: { type: Type.STRING },
                  relation: { type: Type.STRING },
                  description: { type: Type.STRING },
                  strength: { type: Type.NUMBER }
                },
                required: ['source', 'target', 'relation']
              }
            }
          },
          required: ['newNodes', 'newLinks']
        }
      }
    });

    const parsed = safeParseJSON(response.text || '{}');
    const rawNewNodes = parsed.newNodes || [];
    const newLinks = parsed.newLinks || [];

    // Tag parentId on expanded sub-nodes with equal importance as main nodes
    const newNodes = rawNewNodes.map((n: any) => ({
      ...n,
      importance: Math.max(8, Number(n.importance) || 8),
      parentId: node.id
    }));

    // Save into isolated expansion pool in DB without modifying the Base Graph structure
    if (graphId) {
      await saveNodeExpansionToDb(graphId, nodeLookupKey, newNodes, newLinks);
      console.log(`[Expansion Pool Saved] Cached ${newNodes.length} expanded sub-nodes for node "${nodeLookupKey}" in graph "${graphId}" (Base Graph remains clean).`);
    }

    res.json({
      newNodes,
      newLinks
    });
  } catch (error: any) {
    console.error('Error expanding node:', error);
    res.status(500).json({ error: error.message || 'Không thể mở rộng node này.' });
  }
});

// 4. AI Deep Dive Chat endpoint
app.post('/api/wiki/deep-dive', async (req, res) => {
  try {
    const { node, graphTitle, question, history = [], language = 'vi', graphId } = req.body;

    const systemInstruction = `Bạn là một trợ lý giáo dục và khoa học AI cao cấp am hiểu sâu sắc về Wikipedia.
Người dùng đang khám phá Sơ đồ Tri thức (Knowledge Graph) về chủ đề: "${graphTitle}".
Đối tượng hiện tại đang trò chuyện: "${node.label}" (Phân loại: ${node.category}).
Tóm tắt đối tượng: ${node.summary}
${node.details && node.details.length > 0 ? 'Chi tiết tiêu biểu: ' + node.details.join('; ') : ''}

Nhiệm vụ của bạn:
1. Trả lời câu hỏi trực tiếp, sâu sắc, chính xác, có logic rõ ràng và mang giá trị tri thức cao.
2. Trình bày bằng Markdown đẹp mắt:
   - Dùng **chữ in đậm** cho khái niệm/nhân vật then chốt.
   - Dùng danh sách gạch đầu dòng (-) hoặc số thứ tự khi giải thích nhiều ý.
   - Chia đoạn văn ngắn gọn, dễ tiếp thu.
3. Luôn phản hồi bằng ${language === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh'}.`;

    // Construct contents array with chat history
    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });
    }
    contents.push({ role: 'user', parts: [{ text: question }] });

    const response = await generateContentWithRetryAndFallback({
      preferredModel: 'gemini-flash-latest',
      contents,
      config: { systemInstruction }
    });

    const aiText = response.text || '';

    // If graphId is present, persist in DB
    if (graphId) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await saveGraphChatMessage(
        graphId,
        node.label,
        { id: `user_${Date.now()}`, text: question, sender: 'user', timestamp: now },
        { id: `ai_${Date.now()}`, text: aiText, sender: 'ai', timestamp: now }
      );
    }

    res.json({ text: aiText });
  } catch (error: any) {
    console.error('Error in AI deep dive:', error);
    res.status(500).json({ error: error.message || 'Không thể phản hồi câu hỏi.' });
  }
});

// 5. AI Node YouTube Videos curation endpoint (with Database Cache)
app.post('/api/node-videos', async (req, res) => {
  try {
    const { node, graphTitle, language = 'vi', graphId } = req.body;

    if (!node || !node.label) {
      return res.status(400).json({ error: 'Node thông tin không hợp lệ.' });
    }

    // Step 1: Check Database Cache for this node's videos
    if (graphId) {
      const cachedVideos = await getNodeVideosFromDb(graphId, node.label);
      if (cachedVideos && cachedVideos.length > 0) {
        console.log(`[Database Video Hit] Loaded ${cachedVideos.length} cached videos for node: "${node.label}"`);
        return res.json({ videos: cachedVideos, fromCache: true });
      }
    }

    const systemInstruction = `Bạn là một trợ lý AI tuyển chọn tư liệu video YouTube giáo dục, khoa học, lịch sử hàng đầu.
Nhiệm vụ: Tạo ra từ 3 đến 4 truy vấn tìm kiếm YouTube và thông tin video đề xuất tối ưu nhất dành cho đối tượng: "${node.label}" (Thuộc chủ đề tổng quát: "${graphTitle}").

Yêu cầu cho mỗi video đề xuất:
1. 'title': Tiêu đề hoặc chủ đề video phim tài liệu/bài giảng hấp dẫn, chính xác nhất về "${node.label}".
2. 'searchQuery': Từ khóa tìm kiếm chuẩn xác trên YouTube để ra kết quả video chất lượng nhất (Ví dụ: "${node.label} phim tài liệu", "Khám phá ${node.label} lịch sử", "${node.label} explained").
3. 'channelType': Loại kênh/nội dung (ví dụ: 'Phim tài liệu', 'Bài giảng chuyên sâu', 'Tóm tắt nhanh', 'Khoa học phổ thức', 'Truyền hình VTV / Discovery').
4. 'reason': Lí do AI đề xuất video này (1-2 câu giải thích vì sao video giúp hiểu rõ hơn về ${node.label}).
5. 'durationHint': Thời lượng gợi ý (ví dụ: '5-10 phút', '15-30 phút', 'Đầy đủ').

Luôn phản hồi bằng ngôn ngữ: ${language === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh'}.`;

    const promptText = `Đối tượng cần tìm video: ${node.label} (${node.category})
Mô tả tóm tắt: ${node.summary}
Mốc thời gian / Chuỗi sự kiện: ${node.yearOrPeriod || 'N/A'}
Chủ đề tổng thể: ${graphTitle}`;

    const response = await generateContentWithRetryAndFallback({
      preferredModel: 'gemini-flash-latest',
      contents: promptText,
      config: {
        systemInstruction,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            videos: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  searchQuery: { type: Type.STRING },
                  channelType: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  durationHint: { type: Type.STRING }
                },
                required: ['title', 'searchQuery', 'channelType', 'reason']
              }
            }
          },
          required: ['videos']
        }
      }
    });

    const parsed = safeParseJSON(response.text || '{}');
    const videos = parsed.videos || [];

    // Save to Database cache for this node
    if (graphId && videos.length > 0) {
      await saveNodeVideosToDb(graphId, node.label, videos);
    }

    res.json({ videos, fromCache: false });
  } catch (error: any) {
    console.error('Error fetching node videos:', error);
    res.status(500).json({ error: error.message || 'Không thể tìm video YouTube.' });
  }
});

// Start Server with Vite Middleware or Production Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WikiGraph AI Server running on http://localhost:${PORT}`);
  });
}

startServer();
