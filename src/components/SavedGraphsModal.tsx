import React from 'react';
import { SavedGraph } from '../types';
import { X, Bookmark, Trash2, ArrowRight, Network, Clock } from 'lucide-react';

interface SavedGraphsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedGraphs: SavedGraph[];
  onLoadGraph: (graph: SavedGraph) => void;
  onDeleteGraph: (id: string) => void;
  language?: string;
}

export const SavedGraphsModal: React.FC<SavedGraphsModalProps> = ({
  isOpen,
  onClose,
  savedGraphs,
  onLoadGraph,
  onDeleteGraph,
  language = 'vi'
}) => {
  if (!isOpen) return null;

  const isEn = language === 'en';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0a0a0b] border border-[#1f2937] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[#d1d5db]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-[#1f2937] flex items-center justify-between bg-[#0a0a0b]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#111827] border border-[#1f2937] text-[#6366f1]">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif-title font-medium text-white">
                {isEn ? 'Saved Knowledge Graphs' : 'Sơ đồ Tri thức đã lưu'} ({savedGraphs.length})
              </h2>
              <p className="text-xs text-[#9ca3af] font-light">
                {isEn ? 'Knowledge graphs you generated and saved on this device.' : 'Các bản đồ tri thức bạn đã tạo và lưu trên thiết bị này.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#9ca3af] hover:text-white rounded-lg hover:bg-[#111827] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {savedGraphs.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Network className="w-10 h-10 text-[#374151] mx-auto" />
              <p className="text-sm font-medium text-[#9ca3af]">
                {isEn ? 'No saved knowledge graphs yet.' : 'Chưa có Sơ đồ tri thức nào được lưu.'}
              </p>
              <p className="text-xs text-[#4b5563]">
                {isEn ? 'When you create a graph from Wikipedia, click "Save Graph" to revisit anytime!' : 'Khi tạo xong sơ đồ từ Wikipedia, bấm "Lưu Sơ đồ" để xem lại bất kỳ lúc nào!'}
              </p>
            </div>
          ) : (
            savedGraphs.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-[#111827] border border-[#1f2937] hover:border-[#6366f1] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white group-hover:text-[#6366f1] transition-colors">
                      {item.title}
                    </h3>
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#0a0a0b] text-[#6366f1] border border-[#374151]">
                      {item.language === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
                    </span>
                  </div>

                  <p className="text-xs text-[#9ca3af] line-clamp-1 font-light">
                    {item.summary}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-[#4b5563] pt-1 font-mono">
                    <span>{item.nodeCount} NODES | {item.linkCount} LINKS</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#6366f1]" />
                      {new Date(item.createdAt).toLocaleDateString(isEn ? 'en-US' : 'vi-VN')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onLoadGraph(item)}
                    className="px-4 py-2 bg-white text-black hover:bg-[#6366f1] hover:text-white text-xs font-bold uppercase tracking-wider rounded-none flex items-center gap-1.5 transition-colors duration-200"
                  >
                    <span>{isEn ? 'Open Graph' : 'Mở sơ đồ'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDeleteGraph(item.id)}
                    className="p-2 text-[#9ca3af] hover:text-rose-400 hover:bg-[#1f2937] rounded-lg transition-colors"
                    title={isEn ? 'Delete graph' : 'Xóa sơ đồ này'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
