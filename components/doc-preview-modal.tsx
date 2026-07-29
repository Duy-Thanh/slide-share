'use client';

import { useState, useEffect, useRef } from 'react';
import { renderAsync } from 'docx-preview';
import XLSX from 'xlsx-js-style';
// @ts-ignore
import { PptxRenderer } from 'pptx-browser';
import { X, Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  fileUrl: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: () => void;
}

export default function DocPreviewModal({
  fileUrl,
  fileName,
  isOpen,
  onClose,
  onDownload,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [excelHtml, setExcelHtml] = useState<string | null>(null);

  // States cho PPTX
  const [pptxSlideCount, setPptxSlideCount] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const pptxRendererRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setErrorMsg(null);
    setExcelHtml(null);
    setPptxSlideCount(0);
    setCurrentSlide(0);

    // 1. File Word (.docx / .doc)
    if (ext === 'docx') {
      fetch(fileUrl)
        .then((res) => {
          if (!res.ok) throw new Error('Không tải được file');
          return res.blob();
        })
        .then((blob) => {
          if (docxContainerRef.current) {
            docxContainerRef.current.innerHTML = '';
            renderAsync(blob, docxContainerRef.current).then(() => setLoading(false));
          }
        })
        .catch((err) => {
          setErrorMsg('Lỗi render file Word: ' + err.message);
          setLoading(false);
        });
    } else if (ext === 'doc') {
      setLoading(false);
    }
    // 2. File Excel (.xlsx, .xls, .csv)
    else if (['xlsx', 'xls', 'csv'].includes(ext)) {
      fetch(fileUrl)
        .then((res) => {
          if (!res.ok) throw new Error('Không tải được file');
          return res.arrayBuffer();
        })
        .then((buffer) => {
          const workbook = XLSX.read(buffer, {
            type: 'array',
            cellStyles: true,
            cellFormula: true,
            cellDates: true,
          });

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const html = XLSX.utils.sheet_to_html(worksheet);

          setExcelHtml(html);
          setLoading(false);
        })
        .catch((err) => {
          setErrorMsg('Lỗi render file Excel: ' + err.message);
          setLoading(false);
        });
    }
    // 3. File PowerPoint (.pptx & .ppt)
    else if (['pptx', 'ppt'].includes(ext)) {
      if (ext === 'ppt') {
        setLoading(false);
        return;
      }

      fetch(fileUrl)
        .then((res) => {
          if (!res.ok) throw new Error('Không tải được file PPTX');
          return res.blob();
        })
        .then(async (blob) => {
          const renderer = new PptxRenderer();
          pptxRendererRef.current = renderer;

          await renderer.load(blob as any);
          setPptxSlideCount(renderer.slideCount);

          if (canvasRef.current && renderer.slideCount > 0) {
            await renderer.renderSlide(0, canvasRef.current, 1000);
          }
          setLoading(false);
        })
        .catch((err) => {
          setErrorMsg('Lỗi render file Slide PPTX: ' + err.message);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    return () => {
      if (pptxRendererRef.current) {
        try {
          pptxRendererRef.current.destroy();
        } catch (e) {}
        pptxRendererRef.current = null;
      }
    };
  }, [isOpen, fileUrl, ext]);

  const handleSlideChange = async (newIndex: number) => {
    if (!pptxRendererRef.current || !canvasRef.current) return;
    if (newIndex < 0 || newIndex >= pptxSlideCount) return;

    setCurrentSlide(newIndex);
    await pptxRendererRef.current.renderSlide(newIndex, canvasRef.current, 1000);
  };

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const absoluteFileUrl = `${origin}${fileUrl}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl h-[90vh] sm:h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border-b border-slate-200 shrink-0 gap-2">
          <span className="font-bold text-xs sm:text-sm text-slate-800 truncate flex-1 min-w-0">
            📄 {fileName}
          </span>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onDownload && (
              <button
                onClick={onDownload}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Tải về</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Khung Render Content */}
        <div className="flex-1 bg-slate-200/60 overflow-auto relative p-2 sm:p-6 flex justify-center items-start">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 gap-2 text-slate-500 text-xs font-semibold">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Đang tải file...</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex flex-col items-center justify-center text-rose-500 text-xs font-semibold space-y-2 py-12">
              <p className="text-center px-4">{errorMsg}</p>
            </div>
          )}

          {/* 1. PDF */}
          {ext === 'pdf' && (
            <iframe src={fileUrl} className="w-full h-full rounded-xl border-none shadow-sm" />
          )}

          {/* 2. Ảnh */}
          {['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext) && (
            <img src={fileUrl} alt={fileName} className="max-w-full max-h-full object-contain rounded-xl shadow-sm" />
          )}

          {/* 3. Word (.docx & .doc) */}
          {ext === 'docx' && (
            <div
              ref={docxContainerRef}
              className="w-full max-w-4xl bg-white p-4 sm:p-8 rounded-xl border border-slate-200 shadow-sm overflow-auto text-slate-900"
            />
          )}

          {ext === 'doc' && (
            <iframe
              src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(absoluteFileUrl)}`}
              className="w-full h-full rounded-xl border-none shadow-sm"
            />
          )}

          {/* 4. Excel (.xlsx, .xls, .csv) */}
          {['xlsx', 'xls', 'csv'].includes(ext) && excelHtml && (
            <div className="w-full max-w-full bg-white p-3 sm:p-6 rounded-xl border border-slate-300 shadow-sm overflow-x-auto">
              <div
                className="excel-table-wrapper w-full overflow-x-auto text-xs text-slate-900 font-sans
                  [&_table]:!w-full [&_table]:!max-w-none [&_table]:border-collapse [&_table]:border [&_table]:border-slate-300 [&_table]:table-auto
                  [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 sm:[&_td]:p-2.5 [&_td]:min-w-[70px] [&_td]:whitespace-nowrap [&_td]:text-left
                  [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 sm:[&_th]:p-2.5 [&_th]:bg-slate-100 [&_th]:font-bold [&_th]:whitespace-nowrap
                  [&_tr:nth-child(even)]:bg-slate-50/60"
                dangerouslySetInnerHTML={{ __html: excelHtml }}
              />
            </div>
          )}

          {/* 5. PowerPoint (.pptx Client & .ppt Fallback) */}
          {['pptx', 'ppt'].includes(ext) && (
            <>
              {ext === 'ppt' ? (
                <iframe
                  src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(absoluteFileUrl)}`}
                  className="w-full h-full rounded-xl border-none shadow-sm"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 w-full">
                  <div className="bg-white p-1.5 sm:p-2 rounded-2xl shadow-md border border-slate-200 max-w-full overflow-hidden flex justify-center">
                    <canvas ref={canvasRef} className="max-w-full h-auto rounded-lg" />
                  </div>

                  {pptxSlideCount > 0 && (
                    <div className="flex items-center gap-3 bg-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl border border-slate-200 shadow-sm">
                      <button
                        disabled={currentSlide === 0}
                        onClick={() => handleSlideChange(currentSlide - 1)}
                        className="p-1 sm:p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <span className="text-xs font-bold text-slate-700">
                        Slide {currentSlide + 1} / {pptxSlideCount}
                      </span>
                      <button
                        disabled={currentSlide >= pptxSlideCount - 1}
                        onClick={() => handleSlideChange(currentSlide + 1)}
                        className="p-1 sm:p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Fallback định dạng chưa hỗ trợ */}
          {!['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'pptx', 'ppt'].includes(ext) && !loading && (
            <div className="flex flex-col items-center justify-center text-slate-500 text-xs space-y-3 py-12">
              <p>Chưa hỗ trợ xem trực tiếp định dạng <b>.{ext}</b></p>
              {onDownload && (
                <button
                  onClick={onDownload}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Tải file về máy
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}