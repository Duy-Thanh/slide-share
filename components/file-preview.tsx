'use client';

import { useState, useEffect } from 'react';
import { FileText, FileSpreadsheet, Presentation, FileCode, Eye } from 'lucide-react';

interface Props {
  fileId: string;
  fileName: string;
  fileExt?: string;
  onOpenPreview?: () => void; // 💥 Nhận callback check login + 10 Coins từ DocumentCard
}

export default function FilePreview({ fileId, fileName, fileExt, onOpenPreview }: Props) {
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

  // Handler xử lý mở Preview bảo mật (Phải đi qua check Coins)
  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOpenPreview) {
      onOpenPreview();
    } else {
      alert('Vui lòng đăng nhập và dùng 10 TLU-Coins để xem trực tiếp!');
    }
  };

  // 1. NẾU LÀ FILE PDF: Render Iframe PDF (Không cho mở link trực tiếp)
  if (ext === 'pdf') {
    return (
      <div className="w-full h-60 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative group">
        <iframe
          src={`${rawFileUrl}#toolbar=0&navpanes=0`}
          className="w-full h-full object-cover pointer-events-none select-none"
          title={fileName}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent opacity-90 group-hover:opacity-100 transition-opacity flex items-end p-3.5">
          <button
            onClick={handleButtonClick}
            className="w-full sm:w-auto text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 backdrop-blur-sm px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md active:scale-95"
          >
            <FileText className="w-4 h-4" />
            <span>Xem trước trọn bộ PDF (-10đ)</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. NẾU LÀ OFFICE (WORD, EXCEL, PPTX) & ĐANG Ở PRODUCTION (KHÔNG PHẢI LOCALHOST)
  if (!isLocal && ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ext)) {
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawFileUrl)}`;

    return (
      <div className="w-full h-60 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative group">
        <iframe
          src={officeViewerUrl}
          className="w-full h-full border-0 pointer-events-none select-none"
          title={fileName}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent opacity-90 group-hover:opacity-100 transition-opacity flex items-end p-3.5">
          <button
            onClick={handleButtonClick}
            className="w-full sm:w-auto text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 backdrop-blur-sm px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Đọc trực tuyến file {ext.toUpperCase()} (-10đ)</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. BANNER PREVIEW NẾU Ở LOCALHOST HOẶC FILE KHÁC
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
    <div className={`w-full h-40 ${style.bg} rounded-xl p-4 sm:p-5 text-white flex flex-col justify-between shadow-inner relative overflow-hidden group`}>
      <div className="flex justify-between items-start z-10">
        <span className="text-[10px] font-black tracking-wider bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-md uppercase">
          {style.label}
        </span>
        {style.icon}
      </div>

      <div className="z-10 flex items-end justify-between gap-2">
        <div className="space-y-0.5 min-w-0 flex-1">
          <p className="font-bold text-xs sm:text-sm line-clamp-1 drop-shadow-sm">{fileName}</p>
          <p className="text-[10px] sm:text-[11px] opacity-80 font-medium truncate">Cần 10 TLU-Coins để mở trọn bộ file</p>
        </div>

        <button
          onClick={handleButtonClick}
          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs rounded-lg transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Mở xem</span>
        </button>
      </div>

      {/* Pattern trang trí chìm */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
    </div>
  );
}