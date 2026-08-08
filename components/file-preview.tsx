'use client';

import { FileText, FileSpreadsheet, Presentation, FileCode, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  fileId: string;
  fileName: string;
  fileExt?: string;
  onOpenPreview?: () => void; // Callback check login + 10 Coins từ DocumentCard
}

export default function FilePreview({ fileName, fileExt, onOpenPreview }: Props) {
  const ext = (fileExt || fileName.split('.').pop() || '').toLowerCase();

  // Handler xử lý mở Preview bảo mật (Phải đi qua check Coins)
  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOpenPreview) {
      onOpenPreview();
    } else {
      toast.warning('Bạn cần đăng nhập và dùng 10 Coins để xem trực tiếp!');
    }
  };

  const getStyleByExt = () => {
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      return {
        bg: 'bg-gradient-to-br from-emerald-500 to-teal-700',
        icon: <FileSpreadsheet className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-100 opacity-80" />,
        label: 'EXCEL SPREADSHEET',
      };
    }
    if (['docx', 'doc'].includes(ext)) {
      return {
        bg: 'bg-gradient-to-br from-blue-600 to-indigo-800',
        icon: <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-blue-100 opacity-80" />,
        label: 'WORD DOCUMENT',
      };
    }
    if (['pptx', 'ppt'].includes(ext)) {
      return {
        bg: 'bg-gradient-to-br from-amber-500 to-orange-700',
        icon: <Presentation className="w-8 h-8 sm:w-10 sm:h-10 text-amber-100 opacity-80" />,
        label: 'POWERPOINT SLIDE',
      };
    }
    if (['pdf'].includes(ext)) {
      return {
        bg: 'bg-gradient-to-br from-rose-600 to-red-800',
        icon: <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-rose-100 opacity-80" />,
        label: 'PDF DOCUMENT',
      };
    }
    return {
      bg: 'bg-gradient-to-br from-slate-600 to-slate-800',
      icon: <FileCode className="w-8 h-8 sm:w-10 sm:h-10 text-slate-200 opacity-80" />,
      label: 'TÀI LIỆU TLU',
    };
  };

  const style = getStyleByExt();

  return (
    <div className={`w-full h-36 ${style.bg} rounded-xl p-4 text-white flex flex-col justify-between shadow-inner relative overflow-hidden group`}>
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
          className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 active:scale-95 backdrop-blur-md text-white font-bold text-xs rounded-xl transition-all shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Xem trước (-10đ)</span>
        </button>
      </div>

      {/* Pattern trang trí chìm */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
    </div>
  );
}