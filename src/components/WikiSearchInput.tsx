import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, Globe, Filter, X, ArrowRight, Loader2, BookOpen } from 'lucide-react';
import { SAMPLE_TOPICS, SAMPLE_TOPICS_EN, SampleTopic } from '../data/samples';

interface SearchInputProps {
  onSearch: (input: string, lang: string, focus: string) => void;
  isLoading: boolean;
  uiLanguage?: string;
}

export const WikiSearchInput: React.FC<SearchInputProps> = ({ onSearch, isLoading, uiLanguage = 'vi' }) => {
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState<'vi' | 'en'>(uiLanguage === 'en' ? 'en' : 'vi');
  const [focus, setFocus] = useState('all');
  const [suggestions, setSuggestions] = useState<Array<{ title: string; description: string; url: string }>>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearchingWiki, setIsSearchingWiki] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync language with parent uiLanguage if changed
  useEffect(() => {
    if (uiLanguage === 'en' || uiLanguage === 'vi') {
      setLanguage(uiLanguage);
    }
  }, [uiLanguage]);

  const isEn = language === 'en';
  const activeSamples = isEn ? SAMPLE_TOPICS_EN : SAMPLE_TOPICS;

  // Debounced search for Wikipedia suggestions
  useEffect(() => {
    if (!query || query.trim().length < 1 || query.startsWith('http')) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingWiki(true);
      try {
        const res = await fetch(`/api/wiki/search?q=${encodeURIComponent(query.trim())}&lang=${language}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data || []);
          setShowDropdown(data && data.length > 0);
        }
      } catch (e) {
        console.error('Failed to fetch wiki autocomplete', e);
      } finally {
        setIsSearchingWiki(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, language]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    setShowDropdown(false);
    onSearch(query.trim(), language, focus);
  };

  const handleSelectSuggestion = (item: { title: string; url: string }) => {
    setQuery(item.title);
    setShowDropdown(false);
    onSearch(item.title, language, focus);
  };

  const handleSelectSample = (sample: SampleTopic) => {
    setQuery(sample.title);
    setLanguage(sample.lang as 'vi' | 'en');
    onSearch(sample.wikiTitle, sample.lang, focus);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12">
      
      {/* Title & Tagline */}
      <div className="text-center mb-8 sm:mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#111827] border border-[#1f2937] text-xs font-semibold uppercase tracking-widest text-[#6366f1] shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#6366f1] animate-pulse" />
          <span>{isEn ? 'Transform Wikipedia Articles into AI Knowledge Graphs' : 'Biến văn bản bài viết thành Sơ đồ Tri thức AI'}</span>
        </div>
        
        <h1 style={{ fontFamily: 'Times New Roman', fontStyle: 'normal' }} className="text-3xl sm:text-5xl font-serif-title text-white tracking-tight leading-tight">
          {isEn ? (
            <>Explore <span className="text-[#6366f1]">Wikipedia</span> as an Interactive Graph</>
          ) : (
            <>Khám phá <span className="text-[#6366f1]">Wikipedia</span> dưới dạng Bản đồ</>
          )}
        </h1>
        
        <p className="text-sm sm:text-base text-[#9ca3af] max-w-2xl mx-auto leading-relaxed font-light">
          {isEn
            ? 'Paste any Wikipedia URL or enter any topic to explore as an interactive AI Knowledge Graph.'
            : 'Dán liên kết Wikipedia hoặc nhập bất kỳ chủ đề nào để tự động trích xuất Sơ đồ tri thức AI tương tác.'}
        </p>
      </div>

      {/* Main Search Card */}
      <div className="relative bg-[#0a0a0b] rounded-2xl shadow-2xl border border-[#1f2937] p-3 sm:p-5 transition-all">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="relative flex items-center" ref={dropdownRef}>
            <div className="absolute left-4 text-[#4b5563]">
              {isSearchingWiki ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#6366f1]" />
              ) : (
                <Search className="w-5 h-5 text-[#4b5563]" />
              )}
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.trim().length >= 1 && suggestions.length > 0 && setShowDropdown(true)}
              onClick={() => query.trim().length >= 1 && suggestions.length > 0 && setShowDropdown(true)}
              placeholder={isEn ? "https://en.wikipedia.org/wiki/Albert_Einstein or type a topic..." : "https://vi.wikipedia.org/wiki/Albert_Einstein hoặc gõ chủ đề..."}
              className="w-full pl-12 pr-32 py-3.5 sm:py-4 bg-[#111827] text-white placeholder-[#4b5563] text-sm sm:text-base rounded-xl border border-[#374151] focus:outline-none focus:border-[#6366f1] transition-all"
            />

            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setSuggestions([]); }}
                className="absolute right-32 p-1.5 text-[#9ca3af] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="absolute right-2 px-5 py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold uppercase tracking-wider rounded-lg shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">{isEn ? 'Generating...' : 'Đang tải...'}</span>
                </>
              ) : (
                <>
                  <span>{isEn ? 'Generate' : 'Tạo Sơ đồ'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Suggestions Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-[#111827] border border-[#374151] rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-[#1f2937]">
                {suggestions.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSuggestion(item)}
                    className="p-3 hover:bg-[#1f2937] cursor-pointer transition-colors flex items-start gap-2.5"
                  >
                    <BookOpen className="w-4 h-4 text-[#6366f1] mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">
                          {item.title}
                        </span>
                      </div>
                      {item.description && (
                        <div className="text-xs text-[#9ca3af] line-clamp-1 mt-0.5 font-light">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Controls Bar: Language & Focus Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1f2937] text-xs">
            
            {/* Language Selector */}
            <div className="flex items-center gap-2 text-[#9ca3af]">
              <Globe className="w-3.5 h-3.5 text-[#4b5563]" />
              <span>{isEn ? 'Wiki Source:' : 'Nguồn Wiki:'}</span>
              <div className="inline-flex rounded-md p-0.5 bg-[#111827] border border-[#1f2937]">
                <button
                  type="button"
                  onClick={() => setLanguage('vi')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    language === 'vi'
                      ? 'bg-[#374151] text-white shadow-xs'
                      : 'text-[#9ca3af] hover:text-white'
                  }`}
                >
                  🇻🇳 VI
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    language === 'en'
                      ? 'bg-[#374151] text-white shadow-xs'
                      : 'text-[#9ca3af] hover:text-white'
                  }`}
                >
                  🇬🇧 EN
                </button>
              </div>
            </div>

            {/* Focus Filter Dropdown */}
            <div className="flex items-center gap-2 text-[#9ca3af]">
              <Filter className="w-3.5 h-3.5 text-[#4b5563]" />
              <span>{isEn ? 'Perspective:' : 'Góc nhìn:'}</span>
              <select
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                className="bg-[#111827] text-white border border-[#1f2937] rounded-md px-2.5 py-1 text-xs font-medium focus:ring-1 focus:ring-[#6366f1] cursor-pointer"
              >
                {isEn ? (
                  <>
                    <option value="all">All Concepts & Entities</option>
                    <option value="people-events">People & Events Focus</option>
                    <option value="concepts">Concepts & Theories Focus</option>
                    <option value="timeline">Timeline & Eras Focus</option>
                  </>
                ) : (
                  <>
                    <option value="all">Toàn cảnh Khái niệm & Thực thể</option>
                    <option value="people-events">Tập trung Nhân vật & Sự kiện</option>
                    <option value="concepts">Tập trung Khái niệm & Lý thuyết</option>
                    <option value="timeline">Tập trung Mốc thời gian & Giai đoạn</option>
                  </>
                )}
              </select>
            </div>

          </div>

        </form>
      </div>

      {/* Featured Sample Topics */}
      <div className="mt-10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#9ca3af] tracking-widest uppercase">
            {isEn ? 'Suggested Topics:' : 'Chủ đề gợi ý:'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {activeSamples.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSelectSample(sample)}
              disabled={isLoading}
              className="group text-left p-3 rounded-xl bg-[#0a0a0b] border border-[#1f2937] hover:border-[#6366f1] transition-all flex flex-col justify-between cursor-pointer"
            >
              <div>
                <span className="inline-block text-[9px] font-bold text-[#fde68a] bg-[#111827] border border-[#374151] px-2 py-0.5 rounded mb-1.5 uppercase tracking-wider">
                  {sample.badge}
                </span>
                <h3 className="text-xs font-bold text-white group-hover:text-[#6366f1] line-clamp-1 transition-colors">
                  {sample.title}
                </h3>
                <p className="text-[11px] text-[#9ca3af] line-clamp-2 mt-1 leading-tight font-light">
                  {sample.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};
