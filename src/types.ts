export type NodeCategory =
  | 'person'
  | 'event'
  | 'location'
  | 'concept'
  | 'organization'
  | 'discovery'
  | 'period'
  | 'other';

export interface GraphNode {
  id: string;
  label: string;
  category: NodeCategory;
  summary: string;
  importance: number; // 1 - 10
  yearOrPeriod?: string;
  wikiTitle?: string;
  wikiUrl?: string;
  thumbnail?: string;
  sourceQuote?: string; // Wikipedia text quote/excerpt
  details?: string[];
  parentId?: string;
  isExpanded?: boolean;
  // D3 force properties optional
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  relation: string;
  description?: string;
  strength?: number;
}

export interface KnowledgeGraphData {
  id?: string;
  cacheKey?: string;
  title: string;
  wikiTitle: string;
  wikiUrl: string;
  language: string;
  summary: string;
  thumbnailUrl?: string;
  nodes: GraphNode[];
  links: GraphLink[];
  createdAt: string;
  fromCache?: boolean;
  reuseCount?: number;
  viewCount?: number;
  timeSaved?: string;
  tokensSaved?: number;
  chatHistory?: Record<string, DeepDiveMessage[]>;
}

export interface DatabaseStats {
  totalGraphs: number;
  totalNodes: number;
  totalLinks: number;
  totalReuses: number;
  totalCacheHits: number;
  totalAiTokensSaved: number;
  avgSpeedupSec: string;
  databaseStatus: string;
}

export interface TimelineEvent {
  nodeId: string;
  label: string;
  category: NodeCategory;
  yearOrPeriod: string;
  summary: string;
  thumbnail?: string;
}

export interface SavedGraph {
  id: string;
  title: string;
  wikiTitle: string;
  wikiUrl: string;
  language: string;
  summary: string;
  nodeCount: number;
  linkCount: number;
  reuseCount?: number;
  createdAt: string;
  data: KnowledgeGraphData;
}

export interface HistorySummaryItem {
  id: string;
  cacheKey?: string;
  title: string;
  wikiTitle?: string;
  summary: string;
  language: string;
  thumbnailUrl?: string;
  nodeCount: number;
  linkCount?: number;
  reuseCount?: number;
  viewCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeepDiveMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface YouTubeRecommendation {
  title: string;
  searchQuery: string;
  channelType: string;
  reason: string;
  durationHint?: string;
}
