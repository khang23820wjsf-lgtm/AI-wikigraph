import React, { useState, useEffect } from 'react';
import { GraphNode, GraphLink, DeepDiveMessage, YouTubeRecommendation } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS_VI } from '../data/samples';
import { 
  X, ExternalLink, GitBranchPlus, MessageSquare, Send, Sparkles, 
  Loader2, ArrowRight, Layers, CheckCircle2, ChevronRight, BookOpen,
  Video, Play, Tv, Search, RefreshCw
} from 'lucide-react';

interface NodeDetailPanelProps {
  node: GraphNode;
  allNodes: GraphNode[];
  allLinks: GraphLink[];
  graphTitle: string;
  graphId?: string;
  savedChatHistory?: Record<string, DeepDiveMessage[]>;
  language?: string;
  onClose: () => void;
  onSelectNode: (node: GraphNode) => void;
  onExpandNode: (node: GraphNode) => Promise<void>;
  isExpanding: boolean;
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({
  node,
  allNodes,
  allLinks,
  graphTitle,
  graphId,
  savedChatHistory,
  language = 'vi',
  onClose,
  onSelectNode,
  onExpandNode,
  isExpanding
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'chat' | 'video'>('info');
  const [chatMessages, setChatMessages] = useState<DeepDiveMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  // AI YouTube Video Curation state
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeRecommendation[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [activeEmbedIndex, setActiveEmbedIndex] = useState<number | null>(0);
  const chatBottomRef = React.useRef<HTMLDivElement | null>(null);

  // Reset/restore states when selected node changes
  useEffect(() => {
    if (savedChatHistory && savedChatHistory[node.label]) {
      setChatMessages(savedChatHistory[node.label]);
    } else {
      setChatMessages([]);
    }
    setYoutubeVideos([]);
    setActiveEmbedIndex(0);
    setVideoError(null);
  }, [node.id, node.label, savedChatHistory]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (activeTab === 'video' && youtubeVideos.length === 0 && !isLoadingVideos) {
      handleFetchVideos();
    }
  }, [activeTab, node.id]);

  // Fetch AI recommended YouTube videos
  const handleFetchVideos = async () => {
    setIsLoadingVideos(true);
    setVideoError(null);
    try {
      const res = await fetch('/api/node-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node,
          graphTitle,
          language,
          graphId
        })
      });

      if (!res.ok) throw new Error('Không thể tải gợi ý video');
      const data = await res.json();
      setYoutubeVideos(data.videos || []);
    } catch (err: any) {
      console.error('Video fetch error:', err);
      setVideoError(language === 'en' ? 'Could not load YouTube recommendations.' : 'Có lỗi khi tìm gợi ý video YouTube.');
    } finally {
      setIsLoadingVideos(false);
    }
  };

  // Find connected links and neighbor nodes
  const connectedNeighbors = allLinks
    .filter(l => {
      const sourceId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
      const targetId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
      return sourceId === node.id || targetId === node.id;
    })
    .map(l => {
      const sourceId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
      const targetId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
      const otherId = sourceId === node.id ? targetId : sourceId;
      const neighbor = allNodes.find(n => n.id === otherId);
      return {
        neighbor,
        relation: l.relation,
        isOutgoing: sourceId === node.id
      };
    })
    .filter(item => item.neighbor !== undefined);

  // Simple Markdown text renderer helper
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lIdx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={lIdx} className="h-1.5" />;

      // Process bold **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-bold text-white">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <li key={lIdx} className="ml-3 list-disc space-y-0.5">
            {renderedParts}
          </li>
        );
      }

      return (
        <p key={lIdx} className="mb-1 leading-relaxed">
          {renderedParts}
        </p>
      );
    });
  };

  // Handle AI Chat Deep Dive
  const handleSendQuestion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuestion.trim() || isAsking) return;

    const userText = inputQuestion.trim();
    setInputQuestion('');

    const userMsg: DeepDiveMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedHistory = [...chatMessages, userMsg];
    setChatMessages(updatedHistory);
    setIsAsking(true);

    try {
      const res = await fetch('/api/wiki/deep-dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node,
          graphTitle,
          graphId,
          question: userText,
          history: updatedHistory,
          language
        })
      });

      if (!res.ok) throw new Error('Không thể phản hồi câu hỏi');
      const data = await res.json();

      const aiMsg: DeepDiveMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.text || 'Xin lỗi, tôi chưa thể trả lời câu hỏi này vào lúc này.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg: DeepDiveMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'Có lỗi xảy ra khi hỏi AI. Vui lòng thử lại sau.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAsking(false);
    }
  };

  const categoryTheme = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.other;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 lg:w-[420px] bg-[#0a0a0b] shadow-2xl border-l border-[#1f2937] z-50 flex flex-col animate-in slide-in-from-right duration-300 text-[#d1d5db]">
      
      {/* Header Bar */}
      <div className="p-4 border-b border-[#1f2937] flex items-center justify-between bg-[#0a0a0b]">
        <div className="flex items-center gap-2">
          <span 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: categoryTheme.dot }} 
          />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#6366f1]">
            {CATEGORY_LABELS_VI[node.category] || node.category}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-[#9ca3af] hover:text-white rounded-lg hover:bg-[#111827] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Node Identity Banner */}
      <div className="p-5 border-b border-[#1f2937] bg-[#0a0a0b]">
        
        {/* Optional Thumbnail Image */}
        {node.thumbnail && (
          <div className="mb-4 w-full h-36 rounded-xl overflow-hidden bg-[#111827] border border-[#1f2937] relative shadow-md">
            <img 
              src={node.thumbnail} 
              alt={node.label}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-transparent to-transparent" />
            <div className="absolute bottom-2 left-3 right-3 text-[#9ca3af] text-[10px] font-mono uppercase tracking-wider truncate">
              Wikipedia Media Asset
            </div>
          </div>
        )}

        <div className="space-y-2">
          <span className="text-[10px] text-[#6366f1] font-bold uppercase tracking-widest">Intelligence Output</span>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-2xl font-serif-title text-white leading-snug">
              {node.label}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {node.yearOrPeriod && (
              <span className="px-2.5 py-0.5 rounded bg-[#111827] text-[#fde68a] border border-[#374151] text-[10px] font-mono font-bold uppercase">
                🗓️ {node.yearOrPeriod}
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded bg-[#111827] text-[#9ca3af] border border-[#1f2937] text-[10px] font-mono font-bold uppercase">
              ⭐ Tầm quan trọng: {node.importance}/10
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mt-5 p-1 bg-[#111827] rounded-lg border border-[#1f2937]">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-1.5 px-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1 ${
              activeTab === 'info'
                ? 'bg-[#374151] text-white shadow-xs'
                : 'text-[#9ca3af] hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Overview' : 'Chi tiết'}</span>
          </button>
          
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-1.5 px-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1 ${
              activeTab === 'chat'
                ? 'bg-[#374151] text-white shadow-xs'
                : 'text-[#9ca3af] hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'AI Chat' : 'Hỏi AI'}</span>
          </button>

          <button
            onClick={() => setActiveTab('video')}
            className={`flex-1 py-1.5 px-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1 relative ${
              activeTab === 'video'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-[#9ca3af] hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-white" />
            <span>YouTube</span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping absolute top-1 right-1" />
          </button>
        </div>

      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {activeTab === 'info' ? (
          <>
            {/* AI Summary */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-white border-b border-[#1f2937] pb-1 tracking-wider uppercase">
                {language === 'en' ? 'AI SUMMARY' : 'TÓM TẮT TỪ AI'}
              </h3>
              <div className="p-4 rounded-lg bg-[#111827] border border-[#1f2937] text-sm text-[#9ca3af] font-light leading-relaxed">
                {node.summary}
              </div>
            </div>

            {/* Source Traceability: Wikipedia Citation Quote */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-[#1f2937] pb-1">
                <h3 className="text-xs font-semibold text-indigo-400 tracking-wider uppercase flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{language === 'en' ? 'WIKIPEDIA SOURCE CITATION' : 'TRÍCH DẪN NGUỒN WIKIPEDIA'}</span>
                </h3>
              </div>
              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-800/40 text-xs text-indigo-200/90 leading-relaxed relative overflow-hidden">
                <div className="absolute top-2 right-2 text-indigo-500/20 text-4xl font-serif-title select-none pointer-events-none">
                  “
                </div>
                <p className="font-sans relative z-10">
                  "{node.sourceQuote || node.summary}"
                </p>
                <div className="mt-2.5 pt-2 border-t border-indigo-900/50 flex items-center justify-between text-[10px] text-indigo-400/80 font-mono">
                  <span>Source: Wikipedia ({language === 'en' ? 'Verified Article' : 'Bài viết chính thức'})</span>
                  <a
                    href={node.wikiUrl || `https://${language}.wikipedia.org/wiki/${encodeURIComponent(node.wikiTitle || node.label)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center gap-1 text-indigo-300 font-sans"
                  >
                    <span>{language === 'en' ? 'Verify Source' : 'Đối chiếu nguồn'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Bullet Details */}
            {node.details && node.details.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-white border-b border-[#1f2937] pb-1 tracking-wider uppercase">
                  {language === 'en' ? 'KEY FACTS' : 'ĐIỂM NỔI BẬT'}
                </h3>
                <ul className="space-y-2">
                  {node.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-[#d1d5db]">
                      <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons: Wikipedia Link & Expand Node */}
            <div className="space-y-2.5 pt-2 border-t border-[#1f2937]">
              
              <button
                onClick={() => onExpandNode(node)}
                disabled={isExpanding}
                className="w-full py-3 bg-white text-black hover:bg-[#6366f1] hover:text-white transition-colors duration-300 disabled:opacity-50 text-xs font-bold uppercase tracking-widest rounded-none flex items-center justify-center gap-2"
              >
                {isExpanding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang mở rộng...</span>
                  </>
                ) : (
                  <>
                    <GitBranchPlus className="w-4 h-4" />
                    <span>Mở rộng Sơ đồ từ Node này</span>
                  </>
                )}
              </button>

              <a
                href={node.wikiUrl || `https://${language}.wikipedia.org/wiki/${encodeURIComponent(node.wikiTitle || node.label)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-[#111827] hover:bg-[#1f2937] border border-[#374151] text-white text-xs font-semibold uppercase tracking-wider rounded-none flex items-center justify-center gap-2 transition-colors"
              >
                <span>Xem bài viết Wikipedia →</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#6366f1]" />
              </a>

            </div>

            {/* Connected Nodes Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white border-b border-[#1f2937] pb-1 tracking-wider uppercase w-full">
                  LIÊN KẾT TRỰC TIẾP ({connectedNeighbors.length})
                </h3>
              </div>

              {connectedNeighbors.length === 0 ? (
                <p className="text-xs text-[#9ca3af]">Chưa có liên kết phụ.</p>
              ) : (
                <div className="space-y-2">
                  {connectedNeighbors.map((item, idx) => {
                    if (!item.neighbor) return null;
                    const neighborTheme = CATEGORY_COLORS[item.neighbor.category] || CATEGORY_COLORS.other;
                    return (
                      <div
                        key={idx}
                        onClick={() => item.neighbor && onSelectNode(item.neighbor)}
                        className="p-3 rounded-lg bg-[#111827] border border-[#1f2937] hover:border-[#6366f1] cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span 
                            className="w-2 h-2 rounded-full shrink-0" 
                            style={{ backgroundColor: neighborTheme.dot }} 
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white group-hover:text-[#6366f1] truncate transition-colors">
                              {item.neighbor.label}
                            </div>
                            <div className="text-[10px] text-[#9ca3af]">
                              {item.relation}
                            </div>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-[#4b5563] group-hover:text-[#6366f1] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'video' ? (
          /* AI Recommended YouTube Videos Tab */
          <div className="space-y-4">
            
            <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/40 text-xs text-red-200 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Video className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">Tư liệu Video YouTube AI tuyển chọn</span>
                  <p className="text-[11px] text-red-300/80">
                    Phim tài liệu & bài giảng tương ứng cho <strong>{node.label}</strong>.
                  </p>
                </div>
              </div>

              <button
                onClick={handleFetchVideos}
                disabled={isLoadingVideos}
                className="p-1.5 text-red-300 hover:text-white rounded hover:bg-red-900/50 transition-colors shrink-0"
                title="Tải lại gợi ý"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingVideos ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {isLoadingVideos ? (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin mx-auto" />
                <p className="text-xs text-[#9ca3af] font-medium">
                  AI đang phân tích ngữ cảnh & tìm kiếm video YouTube chất lượng nhất...
                </p>
              </div>
            ) : videoError ? (
              <div className="p-4 rounded-lg bg-[#111827] border border-[#1f2937] text-center space-y-3">
                <p className="text-xs text-red-400">{videoError}</p>
                <button
                  onClick={handleFetchVideos}
                  className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-bold uppercase tracking-wider"
                >
                  Thử lại
                </button>
              </div>
            ) : youtubeVideos.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Tv className="w-8 h-8 text-[#374151] mx-auto" />
                <p className="text-xs text-[#9ca3af]">Chưa có gợi ý video nào cho node này.</p>
                <button
                  onClick={handleFetchVideos}
                  className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-bold"
                >
                  Tìm video bằng AI
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {youtubeVideos.map((v, idx) => (
                  <div 
                    key={idx}
                    className="p-4 rounded-xl bg-[#111827] border border-[#1f2937] hover:border-red-500/50 transition-all space-y-3 shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800/40 text-[9px] font-bold uppercase tracking-wider">
                            {v.channelType}
                          </span>
                          {v.durationHint && (
                            <span className="text-[10px] text-[#9ca3af] font-mono">
                              ⏱️ {v.durationHint}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-white leading-snug">
                          {v.title}
                        </h4>
                      </div>
                    </div>

                    <p className="text-xs text-[#9ca3af] font-light leading-relaxed bg-[#0a0a0b]/60 p-2.5 rounded-lg border border-[#1f2937]">
                      💡 <strong>Lí do AI đề xuất:</strong> {v.reason}
                    </p>

                    {/* Direct link to YouTube */}
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(v.searchQuery)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-red-900/30"
                    >
                      <Video className="w-4 h-4 fill-current text-white shrink-0" />
                      <span>Xem Video trên YouTube (Tab mới)</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>

                  </div>
                ))}

                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(node.label + ' ' + (node.yearOrPeriod || 'phim tài liệu'))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-[#111827] hover:bg-[#1f2937] border border-[#374151] text-[#d1d5db] text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors mt-4"
                >
                  <Search className="w-3.5 h-3.5 text-red-400" />
                  <span>Tìm thêm kết quả về "{node.label}" trên YouTube →</span>
                </a>
              </div>
            )}

          </div>
        ) : (
          /* AI Deep Dive Chat Tab */
          <div className="h-full flex flex-col space-y-4">
            
            <div className="p-3 rounded-lg bg-[#111827] border border-[#1f2937] text-xs text-[#d1d5db] flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#6366f1] shrink-0 mt-0.5" />
              <span>Hỏi bất kỳ điều gì về <strong>{node.label}</strong>. AI sẽ giải thích dựa trên ngữ cảnh sơ đồ!</span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 space-y-3 min-h-[220px] max-h-[360px] overflow-y-auto pr-1">
              {chatMessages.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <MessageSquare className="w-8 h-8 text-[#374151] mx-auto" />
                  <p className="text-xs text-[#9ca3af]">Chưa có câu hỏi nào.</p>
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={() => { setInputQuestion(`Vai trò chính của ${node.label} là gì?`); }}
                      className="text-left text-xs p-2.5 rounded bg-[#111827] text-[#d1d5db] hover:border-[#6366f1] border border-[#1f2937] transition-colors"
                    >
                      💡 Vai trò chính của {node.label} là gì?
                    </button>
                    <button
                      onClick={() => { setInputQuestion(`${node.label} đã tác động thế nào đến lịch sử / khoa học?`); }}
                      className="text-left text-xs p-2.5 rounded bg-[#111827] text-[#d1d5db] hover:border-[#6366f1] border border-[#1f2937] transition-colors"
                    >
                      💡 {node.label} đã tác động thế nào?
                    </button>
                  </div>
                </div>
              ) : (
                chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[90%] p-3 rounded-lg text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[#6366f1] text-white'
                          : 'bg-[#111827] text-[#d1d5db] border border-[#1f2937]'
                      }`}
                    >
                      {msg.sender === 'user' ? msg.text : renderFormattedText(msg.text)}
                    </div>
                    <span className="text-[10px] text-[#4b5563] mt-1 px-1 font-mono">
                      {msg.timestamp}
                    </span>
                  </div>
                ))
              )}

              {isAsking && (
                <div className="flex items-center gap-2 text-xs text-[#6366f1] font-medium p-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI đang suy nghĩ câu trả lời...</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendQuestion} className="relative pt-2 border-t border-[#1f2937]">
              <input
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder={`Hỏi về ${node.label}...`}
                className="w-full pl-3.5 pr-10 py-2.5 bg-[#111827] text-white placeholder-[#4b5563] text-xs rounded-lg border border-[#374151] focus:outline-none focus:border-[#6366f1]"
              />
              <button
                type="submit"
                disabled={!inputQuestion.trim() || isAsking}
                className="absolute right-2 top-3.5 p-1.5 text-[#6366f1] hover:text-white disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>
        )}

      </div>

    </div>
  );
};
