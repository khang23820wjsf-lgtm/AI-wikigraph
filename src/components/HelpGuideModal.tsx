import React from 'react';
import { X, Network, MousePointerClick, GitBranchPlus, MessageSquare, Clock, Sparkles } from 'lucide-react';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
}

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({ isOpen, onClose, language = 'vi' }) => {
  if (!isOpen) return null;

  const isEn = language === 'en';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0a0a0b] border border-[#1f2937] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[#d1d5db]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#1f2937] flex items-center justify-between bg-[#0a0a0b]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#111827] border border-[#1f2937] text-[#6366f1]">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif-title font-medium text-white">
                {isEn ? 'WikiGraph AI User Guide' : 'Hướng dẫn sử dụng WikiGraph AI'}
              </h2>
              <p className="text-xs text-[#9ca3af] font-light">
                {isEn ? 'How to explore Wikipedia knowledge as an interactive visual graph' : 'Cách khám phá tri thức Wikipedia dưới dạng bản đồ trực quan'}
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-[#d1d5db]">
          
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#111827] border border-[#1f2937]">
            <div className="p-2 rounded-lg bg-[#0a0a0b] border border-[#374151] text-[#6366f1] shrink-0">
              <MousePointerClick className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm mb-1 uppercase tracking-wider">
                {isEn ? '1. Click Node for Details' : '1. Nhấp vào Node để xem chi tiết'}
              </h3>
              <p className="text-[#9ca3af] leading-relaxed font-light">
                {isEn
                  ? 'Clicking any entity reveals AI summaries, Wikipedia images, key facts, YouTube videos, and direct links to the original article.'
                  : 'Khi nhấp vào bất kỳ đối tượng nào trên bản đồ, bảng thông tin sẽ hiển thị tóm tắt do AI tổng hợp, hình ảnh Wikipedia, các chi tiết quan trọng và đường dẫn trực tiếp đến bài viết gốc.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#111827] border border-[#1f2937]">
            <div className="p-2 rounded-lg bg-[#0a0a0b] border border-[#374151] text-purple-400 shrink-0">
              <GitBranchPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm mb-1 uppercase tracking-wider">
                {isEn ? '2. Continuously Expand Graph' : '2. Mở rộng sơ đồ liên tục'}
              </h3>
              <p className="text-[#9ca3af] leading-relaxed font-light">
                {isEn
                  ? 'Click "Expand Sub-nodes" inside any node detail panel. AI automatically analyzes sub-topics to uncover new connections!'
                  : 'Bấm nút "Mở rộng Sơ đồ" trong bảng chi tiết của một node. AI sẽ tự động phân tích sâu bài viết đó và tìm thêm các node, mối quan hệ mới để nối tiếp vào bản đồ hiện tại!'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#111827] border border-[#1f2937]">
            <div className="p-2 rounded-lg bg-[#0a0a0b] border border-[#374151] text-emerald-400 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm mb-1 uppercase tracking-wider">
                {isEn ? '3. AI Deep Dive Chat' : '3. Hỏi AI Chuyên sâu (AI Deep Dive)'}
              </h3>
              <p className="text-[#9ca3af] leading-relaxed font-light">
                {isEn
                  ? 'Chat directly with AI about any concept or historical figure to understand context, impact, and causes.'
                  : 'Bạn có thể trò chuyện trực tiếp với AI về bất kỳ khái niệm hay nhân vật nào trong sơ đồ để hiểu rõ hơn về bối cảnh, nguyên nhân, hậu quả và tác động lịch sử.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#111827] border border-[#1f2937]">
            <div className="p-2 rounded-lg bg-[#0a0a0b] border border-[#374151] text-[#fde68a] shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm mb-1 uppercase tracking-wider">
                {isEn ? '4. Timeline View Switch' : '4. Chuyển đổi sang Chế độ Dòng thời gian'}
              </h3>
              <p className="text-[#9ca3af] leading-relaxed font-light">
                {isEn
                  ? 'Use the view switcher to arrange historical milestones, inventions, and figures chronologically.'
                  : 'Sử dụng bộ chuyển đổi giao diện để xem các sự kiện, phát minh và nhân vật theo thứ tự thời gian tăng dần.'}
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
