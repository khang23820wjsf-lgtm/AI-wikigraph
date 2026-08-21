import React, { useState } from 'react';
import { KnowledgeGraphData } from '../types';
import { X, Download, FileCode, Image as ImageIcon, Copy, Check, Table, FileSpreadsheet } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: KnowledgeGraphData | null;
  language?: string; // 'vi' | 'en'
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  data,
  language = 'vi'
}) => {
  const [copied, setCopied] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const isEn = language === 'en';

  if (!isOpen || !data) return null;

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download JSON
  const handleDownloadJSON = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wikigraph-${data.title.toLowerCase().replace(/ /g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download SVG
  const handleDownloadSVG = () => {
    const svgEl = document.querySelector('svg.w-full.h-full') as SVGSVGElement;
    if (!svgEl) {
      alert(isEn ? 'Could not find graph SVG canvas.' : 'Không tìm thấy khung vẽ SVG của sơ đồ.');
      return;
    }

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgEl);

    // Add XML namespaces if missing
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wikigraph-${data.title.toLowerCase().replace(/ /g, '-')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download PNG Image
  const handleDownloadPNG = () => {
    const svgEl = document.querySelector('svg.w-full.h-full') as SVGSVGElement;
    if (!svgEl) {
      alert(isEn ? 'Could not find graph SVG canvas.' : 'Không tìm thấy khung vẽ SVG.');
      return;
    }

    setIsExportingImage(true);

    try {
      const bbox = svgEl.getBoundingClientRect();
      const width = bbox.width || 1200;
      const height = bbox.height || 800;

      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgEl);

      if (!svgString.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      const canvas = document.createElement('canvas');
      canvas.width = width * 2; // 2x resolution
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setIsExportingImage(false);
        return;
      }

      ctx.scale(2, 2);
      ctx.fillStyle = '#0a0a0b'; // dark background fill
      ctx.fillRect(0, 0, width, height);

      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);

        const imgUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = imgUrl;
        a.download = `wikigraph-${data.title.toLowerCase().replace(/ /g, '-')}.png`;
        a.click();
        setIsExportingImage(false);
      };

      img.onerror = () => {
        setIsExportingImage(false);
        alert(isEn ? 'Failed to render PNG image.' : 'Có lỗi khi xuất ảnh PNG.');
      };

      img.src = url;
    } catch (err) {
      console.error(err);
      setIsExportingImage(false);
    }
  };

  // Download CSV (Nodes & Links)
  const handleDownloadCSV = () => {
    // 1. Nodes CSV
    const nodeHeaders = ['ID', 'Label', 'Category', 'Summary', 'Importance', 'Period', 'SourceQuote', 'WikiUrl'];
    const nodeRows = data.nodes.map(n => [
      `"${n.id}"`,
      `"${(n.label || '').replace(/"/g, '""')}"`,
      `"${n.category}"`,
      `"${(n.summary || '').replace(/"/g, '""')}"`,
      n.importance,
      `"${n.yearOrPeriod || ''}"`,
      `"${(n.sourceQuote || '').replace(/"/g, '""')}"`,
      `"${n.wikiUrl || ''}"`
    ]);

    const nodesCSV = [nodeHeaders.join(','), ...nodeRows.map(r => r.join(','))].join('\n');

    const blobNodes = new Blob(['\uFEFF' + nodesCSV], { type: 'text/csv;charset=utf-8;' });
    const urlNodes = URL.createObjectURL(blobNodes);
    const aNodes = document.createElement('a');
    aNodes.href = urlNodes;
    aNodes.download = `wikigraph-${data.title.toLowerCase().replace(/ /g, '-')}-nodes.csv`;
    aNodes.click();
    URL.revokeObjectURL(urlNodes);

    // 2. Links CSV
    setTimeout(() => {
      const linkHeaders = ['Source', 'Target', 'Relation', 'Description', 'Strength'];
      const linkRows = data.links.map(l => {
        const s = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const t = typeof l.target === 'object' ? (l.target as any).id : l.target;
        return [
          `"${s}"`,
          `"${t}"`,
          `"${(l.relation || '').replace(/"/g, '""')}"`,
          `"${(l.description || '').replace(/"/g, '""')}"`,
          l.strength || 1
        ];
      });

      const linksCSV = [linkHeaders.join(','), ...linkRows.map(r => r.join(','))].join('\n');
      const blobLinks = new Blob(['\uFEFF' + linksCSV], { type: 'text/csv;charset=utf-8;' });
      const urlLinks = URL.createObjectURL(blobLinks);
      const aLinks = document.createElement('a');
      aLinks.href = urlLinks;
      aLinks.download = `wikigraph-${data.title.toLowerCase().replace(/ /g, '-')}-links.csv`;
      aLinks.click();
      URL.revokeObjectURL(urlLinks);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0f172a]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800/50 text-indigo-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEn ? 'Export Knowledge Graph' : 'Xuất Sơ đồ Tri thức'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEn
                  ? `Download visual & structured assets for "${data.title}"`
                  : `Tải về sơ đồ dạng hình ảnh hoặc dữ liệu cấu trúc cho "${data.title}"`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Grid */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Option 1: Image Exports (PNG & SVG) */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <ImageIcon className="w-4 h-4 text-indigo-400" />
              <span>{isEn ? 'Export as Image (PNG & SVG)' : 'Xuất định dạng Hình ảnh (PNG & SVG)'}</span>
            </div>
            <p className="text-xs text-slate-400">
              {isEn
                ? 'High-resolution graphic render suitable for presentations, papers, and sharing.'
                : 'Xuất đồ họa độ phân giải cao phục vụ thuyết trình, bài báo khoa học và chia sẻ.'}
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleDownloadPNG}
                disabled={isExportingImage}
                className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <ImageIcon className="w-4 h-4" />
                <span>{isExportingImage ? (isEn ? 'Rendering...' : 'Đang xuất PNG...') : 'Tải ảnh PNG'}</span>
              </button>

              <button
                onClick={handleDownloadSVG}
                className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <FileCode className="w-4 h-4 text-purple-400" />
                <span>Tải Vector SVG</span>
              </button>
            </div>
          </div>

          {/* Option 2: Data Exports (JSON & CSV) */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Table className="w-4 h-4 text-emerald-400" />
              <span>{isEn ? 'Export Structured Data (JSON & CSV)' : 'Xuất Dữ liệu cấu trúc (JSON & CSV)'}</span>
            </div>
            <p className="text-xs text-slate-400">
              {isEn
                ? 'Full database dump including entities, relation categories, AI summaries, and Wikipedia quotes.'
                : 'Trích xuất toàn bộ cơ sở dữ liệu thực thể, các quan hệ, tóm tắt AI và trích dẫn Wikipedia.'}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleDownloadJSON}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span>File .JSON</span>
              </button>

              <button
                onClick={handleDownloadCSV}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>File .CSV (Excel)</span>
              </button>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                onClick={handleCopyJSON}
                className="text-xs text-slate-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? (isEn ? 'Copied JSON!' : 'Đã sao chép JSON!') : (isEn ? 'Copy JSON to clipboard' : 'Sao chép JSON vào bộ nhớ')}</span>
              </button>
            </div>
          </div>

          {/* Graph Metrics */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {isEn ? 'GRAPH METRICS SUMMARY:' : 'THỐNG KÊ CHI TIẾT SƠ ĐỒ:'}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
              <div className="p-2 rounded bg-slate-900 border border-slate-800 truncate">
                {isEn ? 'Topic: ' : 'Chủ đề: '}<strong className="text-white">{data.title}</strong>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                {isEn ? 'Total Nodes: ' : 'Tổng Nodes: '}<strong className="text-indigo-400">{data.nodes.length}</strong>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                {isEn ? 'Total Links: ' : 'Tổng Liên kết: '}<strong className="text-purple-400">{data.links.length}</strong>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                {isEn ? 'Language: ' : 'Ngôn ngữ: '}<strong className="text-emerald-400">{data.language.toUpperCase()}</strong>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
