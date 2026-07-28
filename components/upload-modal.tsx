'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PlusCircle, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userPoints: number;
  onUploadSuccess: (newPoints: number) => void;
}

export default function UploadModal({
  isOpen,
  onClose,
  userId,
  userPoints,
  onUploadSuccess,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [faculty, setFaculty] = useState('CNTT');
  const [docType, setDocType] = useState<
    'Slide' | 'Đề thi' | 'Đồ án' | 'Giáo trình' | 'Đề cương' | 'Khác'
  >('Slide');
  const [semester, setSemester] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !subject) return alert('Vui lòng điền đủ thông tin!');

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const tgData = await res.json();
      if (!res.ok) throw new Error(tgData.error);

      const { error: dbError } = await supabase.from('documents').insert([
        {
          title,
          subject,
          faculty,
          doc_type: docType,
          semester,
          description,
          file_id: tgData.fileId,
          file_name: tgData.fileName,
          file_size: tgData.fileSize,
          file_ext: file.name.split('.').pop(),
          user_id: userId,
        },
      ]);

      if (dbError) throw dbError;

      const updatedPoints = userPoints + 20;
      await supabase.from('profiles').update({ points: updatedPoints }).eq('id', userId);

      alert('Đăng bài thành công! +20 TLU-Coins đã được cộng vào tài khoản! 🎉');

      // Reset Form
      setFile(null);
      setTitle('');
      setSubject('');
      setDescription('');
      onClose();
      onUploadSuccess(updatedPoints);
    } catch (err: any) {
      alert('Lỗi đăng bài: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-5">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-blue-600" /> Đăng Bài & Tích Điểm (+20 Coins)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUpload} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tên tài liệu / Tiêu đề bài đăng</label>
            <input
              type="text"
              required
              placeholder="VD: Đề thi KTL322 - Cơ học thủy khí K64"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tên môn học</label>
              <input
                type="text"
                required
                placeholder="VD: Thủy văn"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Thuộc Khoa</label>
              <select
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                className="w-full px-2 py-2 border border-slate-200 rounded-xl outline-none bg-white font-medium"
              >
                <option value="CNTT">CNTT</option>
                <option value="Thủy Lợi">Thủy Lợi</option>
                <option value="Công Trình">Công Trình</option>
                <option value="Kinh Tế">Kinh Tế & Quản Lý</option>
                <option value="Cơ Điện">Cơ Điện</option>
                <option value="Môi Trường">Môi Trường</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Loại tài liệu</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as any)}
                className="w-full px-2 py-2 border border-slate-200 rounded-xl outline-none bg-white font-medium"
              >
                <option value="Slide">Slide bài giảng</option>
                <option value="Đề thi">Đề thi / Đáp án</option>
                <option value="Đồ án">Đồ án mẫu</option>
                <option value="Đề cương">Đề cương ôn tập</option>
                <option value="Giáo trình">Giáo trình</option>
                <option value="Khác">Tài liệu khác</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Học kỳ / Khóa</label>
              <input
                type="text"
                placeholder="VD: K64, HK2 2026"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Nội dung / Ghi chú</label>
            <textarea
              rows={2}
              placeholder="Viết đôi dòng chia sẻ về tài liệu này..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Đính kèm file (PDF, Word, Excel, PPTX)</label>
            <input
              type="file"
              required
              accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
            >
              {uploading ? 'Đang tải lên...' : 'Đăng Bài ngay (+20đ)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}