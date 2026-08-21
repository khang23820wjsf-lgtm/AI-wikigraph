import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Network, BookOpen, Layers, CheckCircle2, Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  searchTerm?: string;
  language?: string; // 'vi' | 'en'
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  searchTerm = '',
  language = 'vi'
}) => {
  const isEn = language === 'en';
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(5);

  const steps = isEn
    ? [
        { title: 'Connecting to Wikipedia API', desc: 'Fetching article summary, lead content, and media assets...' },
        { title: 'Gemini 3.6 AI Deep Analysis', desc: 'Extracting key entities, historical facts, and semantic connections...' },
        { title: 'Structuring Knowledge Graph', desc: 'Synthesizing categories, relation vectors, and source citations...' },
        { title: 'Optimizing Force-Directed Layout', desc: 'Balancing node repulsion, link elasticity, and label clarity...' }
      ]
    : [
        { title: 'Truy vấn Wikipedia REST API', desc: 'Tải dữ liệu bài viết, thông tin tóm tắt và hình ảnh minh họa...' },
        { title: 'Trí tuệ nhân tạo Gemini phân tích', desc: 'Trích xuất thực thể, dữ kiện lịch sử và các mối quan hệ ngữ nghĩa...' },
        { title: 'Xây dựng Sơ đồ Tri thức', desc: 'Tổng hợp phân loại node, vectơ liên kết và trích dẫn nguồn...' },
        { title: 'Tối ưu hóa Force-Directed Layout', desc: 'Tính toán lực hút đẩy, tránh đè chữ và cân bằng thị giác...' }
      ];

  const tips = isEn
    ? [
        'Tip: Double-click any node in the graph to discover deeper AI sub-connections!',
        'Tip: Click a node to highlight its direct relations and fade unrelated entities.',
        'Tip: Switch to Timeline View to inspect historical events in chronological order.',
        'Tip: Use the AI Deep Dive Chat to ask questions about any specific node.'
      ]
    : [
        'Mẹo: Nhấp đúp (Double-click) vào node bất kỳ để AI bung thêm các node con mới!',
        'Mẹo: Nhấp vào 1 node để làm nổi bật các mối quan hệ trực tiếp và mờ các node khác.',
        'Mẹo: Chuyển sang Dòng thời gian (Timeline) để xem các mốc lịch sử theo chuỗi thời gian.',
        'Mẹo: Dùng tính năng AI Deep Dive Chat để đặt câu hỏi chuyên sâu về đối tượng.'
      ];

  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    // Progress timer simulating 12-18 second generation with realistic pacing
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 96) return 96;
        const diff = Math.floor(Math.random() * 8) + 3;
        const next = prev + diff;
        
        if (next > 75) setCurrentStep(3);
        else if (next > 48) setCurrentStep(2);
        else if (next > 20) setCurrentStep(1);

        return next > 96 ? 96 : next;
      });
    }, 600);

    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 4000);

    return () => {
      clearInterval(interval);
      clearInterval(tipInterval);
    };
  }, [tips.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0b]/92 backdrop-blur-xl p-4">
      <div className="w-full max-w-xl bg-[#0f172a]/90 border border-indigo-500/30 rounded-2xl p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
        {/* Background Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

        {/* Central Animated Graphic */}
        <div className="relative mb-6 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full border-2 border-dashed border-indigo-500/40 animate-[spin_8s_linear_infinite]" />
          <div className="w-16 h-16 rounded-full border-2 border-indigo-400/60 animate-[spin_4s_linear_infinite_reverse] absolute" />
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 absolute">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white mb-1 tracking-wide">
          {isEn ? 'Building Knowledge Graph' : 'Đang khởi tạo Sơ đồ Tri thức'}
        </h3>
        {searchTerm && (
          <p className="text-sm text-indigo-300 font-medium mb-6 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full max-w-md truncate">
            "{searchTerm}"
          </p>
        )}

        {/* Progress Bar & Percentage */}
        <div className="w-full mb-6">
          <div className="flex justify-between items-center text-xs text-slate-400 font-mono mb-2">
            <span>{isEn ? 'AI Processing Progress' : 'Tiến trình xử lý AI'}</span>
            <span className="text-indigo-400 font-bold">{progress}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Step-by-Step Progress List */}
        <div className="w-full space-y-2.5 text-left mb-6">
          {steps.map((step, idx) => {
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;
            return (
              <div
                key={idx}
                className={`flex items-start gap-3 p-2.5 rounded-xl transition-all duration-300 border ${
                  isCurrent
                    ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-950/50'
                    : isDone
                    ? 'bg-slate-900/40 border-slate-800/60 text-slate-400'
                    : 'bg-slate-900/10 border-transparent opacity-40'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px] font-mono text-slate-500">
                      {idx + 1}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-semibold ${isCurrent ? 'text-indigo-200' : isDone ? 'text-slate-300' : 'text-slate-500'}`}>
                    {step.title}
                  </div>
                  {isCurrent && (
                    <p className="text-[11px] text-slate-400 mt-0.5 animate-fadeIn">
                      {step.desc}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Tip Footer */}
        <div className="w-full pt-4 border-t border-slate-800/80 flex items-center gap-2.5 text-xs text-slate-400 bg-slate-900/30 px-3 py-2 rounded-xl">
          <Brain className="w-4 h-4 text-purple-400 shrink-0" />
          <p className="text-slate-300 truncate font-sans text-left">
            {tips[tipIndex]}
          </p>
        </div>
      </div>
    </div>
  );
};
