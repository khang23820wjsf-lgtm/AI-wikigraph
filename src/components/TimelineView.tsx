import React from 'react';
import { GraphNode } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS_VI, CATEGORY_LABELS_EN } from '../data/samples';
import { Calendar, ChevronRight, Sparkles, Clock } from 'lucide-react';

interface TimelineViewProps {
  nodes: GraphNode[];
  onSelectNode: (node: GraphNode) => void;
  graphTitle: string;
  language?: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ nodes, onSelectNode, graphTitle, language = 'vi' }) => {
  const isEn = language === 'en';
  const categoryLabels = isEn ? CATEGORY_LABELS_EN : CATEGORY_LABELS_VI;

  // Filter nodes that have yearOrPeriod
  const timelineNodes = nodes
    .filter(n => n.yearOrPeriod && n.yearOrPeriod.trim() !== '')
    .sort((a, b) => {
      // Basic numeric year parser
      const getYear = (str: string) => {
        const match = str.match(/-?\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };
      return getYear(a.yearOrPeriod || '') - getYear(b.yearOrPeriod || '');
    });

  return (
    <div className="w-full bg-[#0a0a0b] rounded-2xl p-6 sm:p-8 border border-[#1f2937] shadow-2xl min-h-[550px] text-white">
      
      {/* Timeline Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1f2937]">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#6366f1] bg-[#111827] border border-[#1f2937] px-3 py-1 rounded-full mb-2">
            <Clock className="w-3.5 h-3.5" />
            <span>{isEn ? 'Historical Timeline View' : 'Góc nhìn Dòng thời gian Lịch sử'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif-title font-medium text-white">
            {isEn ? 'Timeline:' : 'Dòng thời gian:'} {graphTitle}
          </h2>
          <p className="text-xs sm:text-sm text-[#9ca3af] mt-1 font-light">
            {isEn
              ? 'Organize milestones, events, and key figures in chronological sequence.'
              : 'Sắp xếp các cột mốc, sự kiện và nhân vật theo trình tự thời gian.'}
          </p>
        </div>

        <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-[#111827] text-[#d1d5db] border border-[#1f2937]">
          {timelineNodes.length} {isEn ? 'MILESTONES' : 'MỐC THỜI GIAN'}
        </div>
      </div>

      {/* Timeline Stream */}
      {timelineNodes.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <Calendar className="w-12 h-12 text-[#374151] mx-auto" />
          <p className="text-sm text-[#9ca3af]">
            {isEn
              ? 'This topic does not have enough specific date markers for timeline rendering.'
              : 'Chủ đề này chưa có đủ thông tin mốc năm cụ thể để biểu diễn dòng thời gian.'}
          </p>
        </div>
      ) : (
        <div className="relative mt-8 pl-4 sm:pl-8 space-y-8 before:absolute before:left-2.5 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-[#6366f1] before:via-purple-500 before:to-pink-500">
          {timelineNodes.map((node) => {
            const categoryTheme = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.other;
            return (
              <div 
                key={node.id}
                onClick={() => onSelectNode(node)}
                className="relative pl-6 sm:pl-8 group cursor-pointer"
              >
                {/* Node Bullet Dot */}
                <div 
                  className="absolute left-[-5px] sm:left-[-3px] top-1.5 w-4 h-4 rounded-full border-2 border-[#0a0a0b] group-hover:scale-125 transition-transform duration-200"
                  style={{ backgroundColor: categoryTheme.dot }}
                />

                {/* Event Card */}
                <div className="p-4 sm:p-5 bg-[#111827] hover:bg-[#1f2937] border border-[#1f2937] hover:border-[#6366f1] rounded-xl transition-all shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    
                    <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded text-xs font-mono font-bold text-[#fde68a] bg-[#0a0a0b] border border-[#374151]">
                      <Calendar className="w-3 h-3 text-[#6366f1]" />
                      <span>{node.yearOrPeriod}</span>
                    </span>

                    <span 
                      className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded text-white"
                      style={{ backgroundColor: `${categoryTheme.dot}30`, border: `1px solid ${categoryTheme.dot}60` }}
                    >
                      {categoryLabels[node.category] || node.category}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-[#6366f1] transition-colors">
                    {node.label}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#9ca3af] mt-2 leading-relaxed line-clamp-2 font-light">
                    {node.summary}
                  </p>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#1f2937] text-xs text-[#9ca3af]">
                    <span>{isEn ? 'Importance:' : 'Tầm quan trọng:'} {node.importance}/10</span>
                    <span className="flex items-center gap-1 text-[#6366f1] font-medium group-hover:translate-x-1 transition-transform">
                      {isEn ? 'View node details' : 'Xem chi tiết node'} <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

