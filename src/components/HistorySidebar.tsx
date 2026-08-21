import React, { useState, useEffect } from 'react';
import { HistorySummaryItem } from '../types';
import { 
  History, X, Search, Trash2, Clock, 
  RefreshCw, Layers
} from 'lucide-react';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGraph: (graphId: string) => void;
  currentGraphId?: string;
  language?: 'vi' | 'en';
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isOpen,
  onClose,
  onSelectGraph,
  currentGraphId,
  language = 'vi'
}) => {
  const [historyList, setHistoryList] = useState<HistorySummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data || []);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm(language === 'en' ? 'Delete this saved graph?' : 'Bạn có chắc muốn xóa sơ đồ này?')) {
      setDeletingId(id);
      try {
        const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setHistoryList((prev) => prev.filter((item) => item.id !== id));
        }
      } catch (err) {
        console.error('Error deleting history item:', err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const filteredItems = historyList.filter((item) => 
    item.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    item.summary.toLowerCase().includes(searchFilter.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-[#0e131f] border-r border-[#1f2937] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-[#1f2937] flex items-center justify-between bg-[#111827]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/20 text-[#6366f1]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{language === 'en' ? 'Explored Graphs' : 'Lịch Sử Sơ Đồ'}</span>
                <span className="px-2 py-0.5 rounded-full bg-[#1e1b4b] text-[#c7d2fe] text-[10px] font-mono border border-[#4338ca]/40">
                  {historyList.length}
                </span>
              </h2>
              <p className="text-[11px] text-[#9ca3af]">
                {language === 'en' ? 'Knowledge graphs cached on server' : 'Các sơ đồ tri thức đã tạo và lưu trên máy chủ'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="p-2 text-[#9ca3af] hover:text-white rounded-lg hover:bg-[#1f2937] transition-colors cursor-pointer"
              title={language === 'en' ? 'Reload history' : 'Tải lại danh sách'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#9ca3af] hover:text-white rounded-lg hover:bg-[#1f2937] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-[#1f2937] bg-[#0a0e17]">
          <div className="relative">
            <Search className="w-4 h-4 text-[#6b7280] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={language === 'en' ? 'Search history...' : 'Tìm kiếm sơ đồ đã lưu...'}
              className="w-full pl-9 pr-3 py-2 bg-[#111827] text-white text-xs rounded-lg border border-[#374151] focus:outline-none focus:border-[#6366f1] transition-colors placeholder-[#6b7280]"
            />
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
          {loading && historyList.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-7 h-7 text-[#6366f1] animate-spin mx-auto" />
              <p className="text-xs text-[#9ca3af]">
                {language === 'en' ? 'Loading history...' : 'Đang tải danh sách lịch sử...'}
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-2 px-4">
              <History className="w-10 h-10 text-[#374151] mx-auto" />
              <p className="text-sm font-semibold text-white">
                {language === 'en' ? 'No graphs in history' : 'Chưa có sơ đồ nào'}
              </p>
              <p className="text-xs text-[#9ca3af]">
                {language === 'en'
                  ? 'Knowledge graphs you explore will be saved on the server for quick access.'
                  : 'Các sơ đồ tri thức sau khi tạo sẽ tự động được lưu trữ trên máy chủ để xem lại nhanh chóng.'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = item.id === currentGraphId;
              const formattedDate = new Date(item.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectGraph(item.id);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'bg-[#1e1b4b]/50 border-[#6366f1] shadow-md shadow-[#1e1b4b]/50'
                      : 'bg-[#111827] border-[#1f2937] hover:border-[#374151] hover:bg-[#1f2937]/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail or Icon */}
                    {item.thumbnailUrl ? (
                      <img 
                        src={item.thumbnailUrl} 
                        alt={item.title}
                        className="w-12 h-12 rounded-lg object-cover border border-[#374151] shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center text-[#6366f1] shrink-0">
                        <Layers className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                          {item.title}
                        </h3>

                        <button
                          onClick={(e) => handleDelete(e, item.id)}
                          disabled={deletingId === item.id}
                          className="text-[#6b7280] hover:text-red-400 p-1 rounded hover:bg-red-950/50 transition-colors shrink-0 opacity-80 group-hover:opacity-100 cursor-pointer"
                          title={language === 'en' ? 'Delete' : 'Xóa'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-[11px] text-[#9ca3af] line-clamp-2 mt-1 leading-snug font-light">
                        {item.summary}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-[#1f2937]/60 text-[10px]">
                        <div className="flex items-center gap-2">
                          <span className="text-[#9ca3af] font-mono">
                            {item.nodeCount} nodes
                          </span>

                          <span className="uppercase px-1 rounded bg-[#1f2937] text-[#9ca3af] font-mono">
                            {item.language}
                          </span>
                        </div>

                        <span className="text-[#6b7280] flex items-center gap-1 font-mono">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{formattedDate}</span>
                        </span>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1f2937] bg-[#0a0e17] text-center">
          <p className="text-[11px] text-[#6b7280]">
            {language === 'en'
              ? 'Data is stored on server for instant recall.'
              : 'Dữ liệu được lưu trữ an toàn trên máy chủ để truy xuất tức thì.'}
          </p>
        </div>

      </div>
    </div>
  );
};
