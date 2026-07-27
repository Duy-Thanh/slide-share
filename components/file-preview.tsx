'use client';

import { useState, useEffect } from 'react';
import { FileText, FileSpreadsheet, Presentation, FileCode, ExternalLink } from 'lucide-react';

interface Props {
  fileId: string;
  fileName: string;
  fileExt?: string;
}

export default function FilePreview({ fileId, fileName, fileExt }: Props) {
  const [isLocal, setIsLocal] = useState(true);
  const ext = (fileExt || fileName.split('.').pop() || '').toLowerCase();

  useEffect(() => {
    // Kiểm tra xem có phải đang chạy dưới localhost không
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      setIsLocal(isLocalhost);
    }
  }, []);

  const rawFileUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/file/${fileId}?filename=${encodeURIComponent(fileName)}`
    : `/api/file/${fileId}?filename=${encodeURIComponent(fileName)}`;

  // 1. NẾU LÀ FILE PDF & ĐÃ DEPLOY (HOẶC LOCAL): Render Iframe PDF
  if (ext === 'pdf') {
    return (
      <div className="w-full h-60 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative group">
        <iframe
          src={`${rawFileUrl}#toolbar=0&navpanes=0`}
          className="w-full h-full object-cover pointer-events-none"
          title={fileName}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity flex items-end p-3.5">
          <a
            href={rawFileUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-white bg-blue-600/90 hover:bg-blue-600 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-4 h-4" /> Xem trước trọn bộ PDF <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  // 2. NẾU LÀ OFFICE (WORD, EXCEL, PPTX) & ĐANG Ở DEPLOY PRODUCTION (KHÔNG PHẢI LOCALHOST)
  if (!isLocal && ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ext)) {
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawFileUrl)}`;

    return (
      <div className="w-full h-60 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative group">
        <iframe
          src={officeViewerUrl}
          className="w-full h-full border-0 pointer-events-none"
          title={fileName}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity flex items-end p-3.5">
          <a
            href={rawFileUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-white bg-blue-600/90 hover:bg-blue-600 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Đọc trực tuyến file {ext.toUpperCase()} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  // 3. BANNER PREVIEW SANG XIN MẠNG XÃ HỘI (Dùng cho Localhost & Mọi file khác)
  const getStyleByExt = () => {
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      return {
        bg: 'bg-gradient-to-br from-emerald-500 to-teal-700',
        icon: <FileSpreadsheet className="w-10 h-10 text-emerald-100 opacity-80" />,
        label: 'EXCEL SPREADSHEET',
      };
    }
    if (['docx', 'doc'].includes(ext)) {
      return {
        bg: 'bg-gradient-to-br from-blue-600 to-indigo-800',
        icon: <FileText className="w-10 h-10 text-blue-100 opacity-80" />,
        label: 'WORD DOCUMENT',
      };
    }
    if (['pptx', 'ppt'].includes(ext)) {
      return {
        bg: 'bg-gradient-to-br from-amber-500 to-orange-700',
        icon: <Presentation className="w-10 h-10 text-amber-100 opacity-80" />,
        label: 'POWERPOINT SLIDE',
      };
    }
    return {
      bg: 'bg-gradient-to-br from-slate-600 to-slate-800',
      icon: <FileCode className="w-10 h-10 text-slate-200 opacity-80" />,
      label: 'TAI LIEU TLU',
    };
  };

  const style = getStyleByExt();

  return (
    <div className={`w-full h-40 ${style.bg} rounded-xl p-5 text-white flex flex-col justify-between shadow-inner relative overflow-hidden group`}>
      <div className="flex justify-between items-start z-10">
        <span className="text-[10px] font-black tracking-wider bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-md uppercase">
          {style.label}
        </span>
        {style.icon}
      </div>

      <div className="z-10 space-y-1">
        <p className="font-bold text-sm line-clamp-1 drop-shadow-sm">{fileName}</p>
        <p className="text-[11px] opacity-80 font-medium">Bấm "Xem" hoặc "Tải về" để mở trọn bộ tài liệu này</p>
      </div>

      {/* Pattern trang trí chìm */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
    </div>
  );
}