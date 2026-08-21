import React from 'react';
import { Network, Bookmark, HelpCircle, Download, RefreshCw, Sparkles, History } from 'lucide-react';

interface HeaderProps {
  savedCount: number;
  onOpenSaved: () => void;
  onOpenHistory: () => void;
  onOpenHelp: () => void;
  onOpenExport: () => void;
  hasGraph: boolean;
  onReset: () => void;
  language: string;
  onLanguageChange: (lang: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  savedCount,
  onOpenSaved,
  onOpenHistory,
  onOpenHelp,
  onOpenExport,
  hasGraph,
  onReset,
  language,
  onLanguageChange
}) => {
  const isEn = language === 'en';

  return (
    <header className="sticky top-0 z-30 bg-[#0a0a0b]/90 backdrop-blur-md border-b border-[#1f2937] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={onReset}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 bg-[#f3f4f6] rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200">
            <div className="w-4 h-4 bg-[#0a0a0b] rotate-45 group-hover:rotate-90 transition-transform duration-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif-title font-medium text-lg tracking-wide text-white">
                WikiGraph AI
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-[#111827] text-[#6366f1] border border-[#1f2937]">
                <Sparkles className="w-2.5 h-2.5" />
                Wikipedia AI
              </span>
            </div>
            <p className="text-[11px] text-[#9ca3af] hidden sm:block font-light">
              {isEn ? 'Visual Interactive Knowledge Graphs from Wikipedia' : 'Sơ đồ tri thức trực quan từ Wikipedia'}
            </p>
          </div>
        </div>

        {/* Top Right Action Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Language Toggle (VI / EN) */}
          <div className="flex items-center bg-[#111827] border border-[#374151] rounded-lg p-0.5">
            <button
              onClick={() => onLanguageChange('vi')}
              className={`px-2 py-1 text-[11px] font-bold rounded transition-all ${
                language === 'vi' ? 'bg-[#6366f1] text-white' : 'text-[#9ca3af] hover:text-white'
              }`}
              title="Tiếng Việt"
            >
              🇻🇳 VI
            </button>
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-1 text-[11px] font-bold rounded transition-all ${
                language === 'en' ? 'bg-[#6366f1] text-white' : 'text-[#9ca3af] hover:text-white'
              }`}
              title="English"
            >
              🇺🇸 EN
            </button>
          </div>
          
          {hasGraph && (
            <>
              <button
                onClick={onOpenExport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#d1d5db] bg-[#111827] hover:bg-[#1f2937] border border-[#374151] rounded-md transition-all"
                title={isEn ? 'Export image or JSON data' : 'Xuất file hình ảnh hoặc JSON'}
              >
                <Download className="w-3.5 h-3.5 text-[#6366f1]" />
                <span className="hidden sm:inline">{isEn ? 'Export Graph' : 'Xuất Sơ đồ'}</span>
              </button>

              <button
                onClick={onReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#9ca3af] hover:text-white hover:bg-[#111827] rounded-md transition-colors"
                title={isEn ? 'Start new topic search' : 'Tạo sơ đồ chủ đề mới'}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{isEn ? 'New Topic' : 'Chủ đề mới'}</span>
              </button>
            </>
          )}

          <button
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#d1d5db] bg-[#111827] hover:bg-[#1f2937] border border-[#374151] rounded-md transition-all shadow-xs cursor-pointer"
            title={isEn ? 'Open Explored Graphs History' : 'Xem lịch sử các sơ đồ đã khám phá'}
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isEn ? 'History' : 'Lịch sử'}</span>
          </button>

          <button
            onClick={onOpenSaved}
            className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#d1d5db] bg-[#111827] hover:bg-[#1f2937] border border-[#374151] rounded-md transition-all"
          >
            <Bookmark className="w-3.5 h-3.5 text-[#6366f1]" />
            <span>{isEn ? 'Saved' : 'Đã lưu'}</span>
            {savedCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-bold text-white bg-[#6366f1] rounded-full">
                {savedCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenHelp}
            className="p-1.5 text-[#9ca3af] hover:text-white rounded-md hover:bg-[#111827] transition-colors"
            title={isEn ? 'User Guide' : 'Hướng dẫn sử dụng'}
          >
            <HelpCircle className="w-4 h-4" />
          </button>

        </div>
      </div>
    </header>
  );
};

