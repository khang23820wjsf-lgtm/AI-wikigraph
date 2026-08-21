import React, { useState, useEffect, useRef } from 'react';
import { KnowledgeGraphData, GraphNode, GraphLink, SavedGraph } from './types';
import { Header } from './components/Header';
import { WikiSearchInput } from './components/WikiSearchInput';
import { KnowledgeGraphView } from './components/KnowledgeGraphView';
import { TimelineView } from './components/TimelineView';
import { NodeDetailPanel } from './components/NodeDetailPanel';
import { SavedGraphsModal } from './components/SavedGraphsModal';
import { ExportModal } from './components/ExportModal';
import { HelpGuideModal } from './components/HelpGuideModal';
import { LoadingOverlay } from './components/LoadingOverlay';
import { HistorySidebar } from './components/HistorySidebar';
import { 
  Network, Clock, Bookmark, Sparkles, AlertCircle, ArrowLeft,
  Check, RefreshCw, ChevronDown, Layers, Users, Calendar
} from 'lucide-react';

export default function App() {
  const [knowledgeGraph, setKnowledgeGraph] = useState<KnowledgeGraphData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentSearchTerm, setCurrentSearchTerm] = useState<string>('');
  const [uiLanguage, setUiLanguage] = useState<string>('vi');
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'timeline'>('graph');
  const [isExpandingNode, setIsExpandingNode] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPerspectiveDropdownOpen, setIsPerspectiveDropdownOpen] = useState(false);
  const perspectiveRef = useRef<HTMLDivElement>(null);

  // Modals & Sidebars
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Saved Graphs persistence
  const [savedGraphs, setSavedGraphs] = useState<SavedGraph[]>(() => {
    try {
      const stored = localStorage.getItem('wikigraph_saved_graphs');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wikigraph_saved_graphs', JSON.stringify(savedGraphs));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [savedGraphs]);

  // Click outside to close perspective dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (perspectiveRef.current && !perspectiveRef.current.contains(event.target as Node)) {
        setIsPerspectiveDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Generate Knowledge Graph handler
  const handleSearch = async (input: string, language: string, focus: string = 'all', forceRefresh: boolean = false) => {
    setIsLoading(true);
    setCurrentSearchTerm(input);
    setUiLanguage(language);
    setError(null);
    setSelectedNode(null);
    setIsPerspectiveDropdownOpen(false);

    try {
      const res = await fetch('/api/wiki/generate-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, language, focus, forceRefresh })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Không thể tạo Sơ đồ Tri thức từ Wikipedia.');
      }

      const data: KnowledgeGraphData = await res.json();
      setKnowledgeGraph(data);
      setViewMode('graph');

      if (forceRefresh) {
        showToast(
          language === 'en'
            ? `Generated new perspective for "${data.title}"!`
            : `Đã tạo góc nhìn sơ đồ mới cho "${data.title}"!`
        );
      } else {
        showToast(
          language === 'en'
            ? `Loaded graph for "${data.title}".`
            : `Đã tải sơ đồ "${data.title}".`
        );
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Có lỗi xảy ra khi tải bài viết Wikipedia.');
    } finally {
      setIsLoading(false);
    }
  };

  // Select Graph from History Sidebar
  const handleSelectHistoryGraph = async (graphId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/history/${graphId}`);
      if (!res.ok) throw new Error(uiLanguage === 'en' ? 'Unable to load graph from history' : 'Không thể tải sơ đồ từ lịch sử');
      const data = await res.json();
      setKnowledgeGraph(data);
      setSelectedNode(null);
      showToast(uiLanguage === 'en' ? `Loaded graph "${data.title}".` : `Đã tải sơ đồ "${data.title}".`);
    } catch (err: any) {
      console.error('Error loading history graph:', err);
      showToast(uiLanguage === 'en' ? 'Error loading graph from history.' : 'Có lỗi khi tải sơ đồ từ lịch sử.');
    } finally {
      setIsLoading(false);
    }
  };

  // Expand Node Handler (discovers new sub-nodes + saves to DB)
  const handleExpandNode = async (node: GraphNode) => {
    if (!knowledgeGraph || isExpandingNode) return;
    setIsExpandingNode(true);

    try {
      const existingNodeIds = knowledgeGraph.nodes.map(n => n.id);
      const res = await fetch('/api/wiki/expand-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node,
          existingNodeIds,
          language: uiLanguage,
          graphId: knowledgeGraph.id
        })
      });

      if (!res.ok) {
        throw new Error(uiLanguage === 'en' ? 'Unable to expand node.' : 'Không thể mở rộng node.');
      }

      const { newNodes, newLinks } = await res.json();

      if (!newNodes || newNodes.length === 0) {
        showToast(uiLanguage === 'en' ? `No additional relationships found for "${node.label}".` : `Không tìm thấy thêm mối quan hệ mới cho "${node.label}".`);
        return;
      }

      // Merge new nodes and links into knowledgeGraph
      setKnowledgeGraph(prev => {
        if (!prev) return prev;
        
        const existingSet = new Set(prev.nodes.map(n => n.id));
        const filteredNewNodes = newNodes.filter((n: GraphNode) => !existingSet.has(n.id));

        return {
          ...prev,
          nodes: [...prev.nodes, ...filteredNewNodes],
          links: [...prev.links, ...newLinks]
        };
      });

      showToast(uiLanguage === 'en' ? `Added ${newNodes.length} new sub-nodes!` : `Đã bổ sung ${newNodes.length} node mới vào sơ đồ!`);
    } catch (err: any) {
      console.error('Expand node error:', err);
      showToast(uiLanguage === 'en' ? 'An error occurred while expanding node.' : 'Có lỗi xảy ra khi mở rộng node.');
    } finally {
      setIsExpandingNode(false);
    }
  };

  // Add manual link between nodes handler
  const handleAddLink = (newLink: GraphLink) => {
    if (!knowledgeGraph) return;

    // Check if link already exists between the two nodes
    const exists = knowledgeGraph.links.some(l => {
      const sId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
      const tId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
      return (sId === newLink.source && tId === newLink.target) || (sId === newLink.target && tId === newLink.source);
    });

    if (exists) {
      showToast(uiLanguage === 'en' ? 'These two nodes are already linked!' : 'Hai node này đã có liên kết từ trước!');
      return;
    }

    const updatedGraph: KnowledgeGraphData = {
      ...knowledgeGraph,
      links: [...knowledgeGraph.links, newLink]
    };

    setKnowledgeGraph(updatedGraph);
    showToast(uiLanguage === 'en' ? 'New link added successfully!' : 'Đã tạo liên kết mới thành công!');
  };

  // Save current graph handler
  const handleSaveCurrentGraph = () => {
    if (!knowledgeGraph) return;

    const exists = savedGraphs.some(g => g.data.title === knowledgeGraph.title);
    if (exists) {
      showToast(uiLanguage === 'en' ? 'This graph is already saved!' : 'Sơ đồ này đã được lưu trước đó!');
      return;
    }

    const newSaved: SavedGraph = {
      id: Date.now().toString(),
      title: knowledgeGraph.title,
      wikiTitle: knowledgeGraph.wikiTitle,
      wikiUrl: knowledgeGraph.wikiUrl,
      language: knowledgeGraph.language,
      summary: knowledgeGraph.summary,
      nodeCount: knowledgeGraph.nodes.length,
      linkCount: knowledgeGraph.links.length,
      createdAt: new Date().toISOString(),
      data: knowledgeGraph
    };

    setSavedGraphs(prev => [newSaved, ...prev]);
    showToast(uiLanguage === 'en' ? `Saved "${knowledgeGraph.title}" to list!` : `Đã lưu "${knowledgeGraph.title}" vào danh sách!`);
  };

  // Load saved graph
  const handleLoadGraph = (saved: SavedGraph) => {
    setKnowledgeGraph(saved.data);
    setSelectedNode(null);
    setIsSavedModalOpen(false);
    showToast(uiLanguage === 'en' ? `Loaded graph "${saved.title}".` : `Đã tải sơ đồ "${saved.title}".`);
  };

  // Delete saved graph
  const handleDeleteGraph = (id: string) => {
    setSavedGraphs(prev => prev.filter(g => g.id !== id));
    showToast(uiLanguage === 'en' ? 'Deleted graph from saved list.' : 'Đã xóa sơ đồ khỏi danh sách đã lưu.');
  };

  // Check if current graph is saved
  const isCurrentGraphSaved = knowledgeGraph ? savedGraphs.some(g => g.data.title === knowledgeGraph.title) : false;

  const perspectives = [
    {
      id: 'all',
      title: uiLanguage === 'en' ? 'Comprehensive Overview' : 'Toàn cảnh Khái niệm & Thực thể',
      desc: uiLanguage === 'en' ? 'Balanced network of all key topics' : 'Bản đồ cân bằng đầy đủ các khía cạnh',
      icon: Layers
    },
    {
      id: 'people-events',
      title: uiLanguage === 'en' ? 'People & Events Focus' : 'Tập trung Nhân vật & Sự kiện',
      desc: uiLanguage === 'en' ? 'Key figures, organizations, and milestones' : 'Tập trung vào con người, tổ chức & sự kiện nổi bật',
      icon: Users
    },
    {
      id: 'concepts',
      title: uiLanguage === 'en' ? 'Concepts & Theories Focus' : 'Tập trung Khái niệm & Lý thuyết',
      desc: uiLanguage === 'en' ? 'Principles, terminology, and mechanisms' : 'Tập trung vào học thuyết, định lý & thuật ngữ',
      icon: Sparkles
    },
    {
      id: 'timeline',
      title: uiLanguage === 'en' ? 'Timeline & Eras Focus' : 'Tập trung Mốc thời gian & Giai đoạn',
      desc: uiLanguage === 'en' ? 'Historical periods, phases, and chronologies' : 'Tập trung theo trình tự thời gian & các thời kỳ',
      icon: Calendar
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#d1d5db] flex flex-col font-sans selection:bg-[#6366f1] selection:text-white transition-colors">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111827] text-white px-5 py-3 rounded-none shadow-2xl text-xs font-mono uppercase tracking-wider flex items-center gap-2.5 border border-[#374151] animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Sparkles className="w-4 h-4 text-[#6366f1]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <Header
        savedCount={savedGraphs.length}
        onOpenSaved={() => setIsSavedModalOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        hasGraph={!!knowledgeGraph}
        onReset={() => { setKnowledgeGraph(null); setSelectedNode(null); setError(null); }}
        language={uiLanguage}
        onLanguageChange={(lang) => setUiLanguage(lang)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
        
        {/* Rich Multi-step Loading Progress Screen */}
        {isLoading && (
          <LoadingOverlay
            searchTerm={currentSearchTerm}
            language={uiLanguage}
          />
        )}

        {/* Error Alert */}
        {error && !isLoading && (
          <div className="p-4 mb-6 rounded-xl bg-[#111827] border border-rose-900/50 text-rose-300 flex items-start gap-3 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold uppercase tracking-wider">{uiLanguage === 'en' ? 'Failed to generate graph:' : 'Không thể tạo sơ đồ:'}</span> {error}
            </div>
            <button 
              onClick={() => handleSearch(currentSearchTerm, uiLanguage, 'all', true)}
              className="text-xs font-semibold underline text-rose-400 hover:text-white cursor-pointer"
            >
              {uiLanguage === 'en' ? 'Retry' : 'Thử lại'}
            </button>
          </div>
        )}

        {/* Home Search View (When no graph is active) */}
        {!knowledgeGraph && !isLoading && (
          <WikiSearchInput
            onSearch={handleSearch}
            isLoading={isLoading}
            uiLanguage={uiLanguage}
          />
        )}

        {/* Active Knowledge Graph Workspace */}
        {knowledgeGraph && !isLoading && (
          <div className="flex-1 flex flex-col space-y-3">
            
            {/* Top Workspace Toolbar */}
            <div className="bg-[#0a0a0b] p-3 sm:p-4 rounded-xl border border-[#1f2937] shadow-xl flex flex-wrap items-center justify-between gap-3">
              
              {/* Subject Title & Wiki Source Badge */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setKnowledgeGraph(null)}
                  className="p-1.5 text-[#9ca3af] hover:text-white rounded-md hover:bg-[#111827] transition-colors cursor-pointer"
                  title={uiLanguage === 'en' ? 'Back to search' : 'Trở về trang tìm kiếm'}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="text-base sm:text-xl font-serif-title font-medium text-white tracking-wide leading-tight">
                    {knowledgeGraph.title}
                  </h1>
                  <p className="text-xs text-[#9ca3af] line-clamp-1 font-light">
                    {knowledgeGraph.summary}
                  </p>
                </div>
              </div>

              {/* View Mode Toggle, Perspective/Regenerate & Save Button */}
              <div className="flex items-center gap-2">
                
                {/* View Switcher: Graph vs Timeline */}
                <div className="inline-flex rounded-lg p-0.5 bg-[#111827] border border-[#1f2937]">
                  <button
                    onClick={() => setViewMode('graph')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                      viewMode === 'graph'
                        ? 'bg-[#374151] text-white shadow-xs'
                        : 'text-[#9ca3af] hover:text-white'
                    }`}
                  >
                    <Network className="w-3.5 h-3.5" />
                    <span>{uiLanguage === 'en' ? 'Network' : 'Mạng lưới'}</span>
                  </button>

                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                      viewMode === 'timeline'
                        ? 'bg-[#374151] text-white shadow-xs'
                        : 'text-[#9ca3af] hover:text-white'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{uiLanguage === 'en' ? 'Timeline' : 'Dòng thời gian'}</span>
                  </button>
                </div>

                {/* Regenerate / New Perspective Dropdown */}
                <div className="relative" ref={perspectiveRef}>
                  <button
                    onClick={() => setIsPerspectiveDropdownOpen(!isPerspectiveDropdownOpen)}
                    className="px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider bg-[#111827] hover:bg-[#1f2937] text-[#d1d5db] hover:text-white border border-[#374151] hover:border-indigo-500/50 flex items-center gap-1.5 transition-all cursor-pointer"
                    title={uiLanguage === 'en' ? 'Generate alternative perspectives or regenerate with AI' : 'Tạo sơ đồ với góc nhìn mới hoặc tạo lại bản khác'}
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{uiLanguage === 'en' ? 'New Perspective' : 'Tạo bản khác'}</span>
                    <ChevronDown className="w-3 h-3 text-[#9ca3af]" />
                  </button>

                  {/* Perspective Menu Popup */}
                  {isPerspectiveDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-[#111827] border border-[#374151] rounded-xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-2 border-b border-[#1f2937]">
                        <div className="text-xs font-bold text-white">
                          {uiLanguage === 'en' ? 'Choose Perspective' : 'Chọn góc nhìn tiếp cận'}
                        </div>
                        <div className="text-[11px] text-[#9ca3af] font-light">
                          {uiLanguage === 'en' ? 'AI will re-analyze the article with this focus' : 'AI sẽ phân tích lại bài viết theo trọng tâm bạn chọn'}
                        </div>
                      </div>

                      {perspectives.map((p) => {
                        const Icon = p.icon;
                        return (
                          <button
                            key={p.id}
                            onClick={() => handleSearch(currentSearchTerm || knowledgeGraph.title, uiLanguage, p.id, true)}
                            className="w-full text-left p-2.5 rounded-lg hover:bg-[#1f2937] transition-colors flex items-start gap-2.5 group cursor-pointer"
                          >
                            <div className="p-1.5 rounded-md bg-[#1f2937] group-hover:bg-[#6366f1]/20 text-[#9ca3af] group-hover:text-indigo-300 transition-colors mt-0.5 shrink-0">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                                {p.title}
                              </div>
                              <div className="text-[10px] text-[#9ca3af] line-clamp-1 font-light">
                                {p.desc}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Save Graph Button */}
                <button
                  onClick={handleSaveCurrentGraph}
                  disabled={isCurrentGraphSaved}
                  className={`px-3.5 py-1.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    isCurrentGraphSaved
                      ? 'bg-[#111827] text-emerald-400 border border-[#1f2937]'
                      : 'bg-white text-black hover:bg-[#6366f1] hover:text-white transition-colors duration-200'
                  }`}
                >
                  {isCurrentGraphSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{uiLanguage === 'en' ? 'Saved' : 'Đã lưu'}</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{uiLanguage === 'en' ? 'Save Graph' : 'Lưu Sơ đồ'}</span>
                    </>
                  )}
                </button>

              </div>

            </div>

            {/* Interactive View Container (Graph or Timeline) */}
            <div className="relative flex-1">
              {viewMode === 'graph' ? (
                <KnowledgeGraphView
                  nodes={knowledgeGraph.nodes}
                  links={knowledgeGraph.links}
                  selectedNodeId={selectedNode?.id}
                  onSelectNode={(node) => setSelectedNode(node)}
                  onExpandNode={handleExpandNode}
                  onAddLink={handleAddLink}
                  isExpandingNode={isExpandingNode}
                  graphTitle={knowledgeGraph.title}
                  language={uiLanguage}
                />
              ) : (
                <TimelineView
                  nodes={knowledgeGraph.nodes}
                  onSelectNode={(node) => setSelectedNode(node)}
                  graphTitle={knowledgeGraph.title}
                  language={uiLanguage}
                />
              )}

              {/* Sliding Node Detail Panel */}
              {selectedNode && (
                <NodeDetailPanel
                  node={selectedNode}
                  allNodes={knowledgeGraph.nodes}
                  allLinks={knowledgeGraph.links}
                  graphTitle={knowledgeGraph.title}
                  graphId={knowledgeGraph.id}
                  savedChatHistory={knowledgeGraph.chatHistory}
                  language={uiLanguage}
                  onClose={() => setSelectedNode(null)}
                  onSelectNode={(node) => setSelectedNode(node)}
                  onExpandNode={handleExpandNode}
                  isExpanding={isExpandingNode}
                />
              )}
            </div>

          </div>
        )}

      </main>

      {/* History Sidebar */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectGraph={handleSelectHistoryGraph}
        currentGraphId={knowledgeGraph?.id}
        language={uiLanguage === 'en' ? 'en' : 'vi'}
      />

      {/* Modals */}
      <SavedGraphsModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        savedGraphs={savedGraphs}
        onLoadGraph={handleLoadGraph}
        onDeleteGraph={handleDeleteGraph}
        language={uiLanguage}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        data={knowledgeGraph}
        language={uiLanguage}
      />

      <HelpGuideModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        language={uiLanguage}
      />

    </div>
  );
}
