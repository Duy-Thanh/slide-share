'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadMediaToTelegram } from '@/lib/telegram';
import { X, Image as ImageIcon, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onPostSuccess: () => void;
}

export default function CreatePostModal({ isOpen, onClose, userId, onPostSuccess }: Props) {
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    setSelectedFiles((prev) => [...prev, ...files]);

    const newPreviews = files.map((file) => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? ('video' as const) : ('image' as const),
    }));

    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveMedia = (index: number) => {
    if (previews[index]?.url) {
      URL.revokeObjectURL(previews[index].url);
    }
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleResetForm = () => {
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    setContent('');
    setSelectedFiles([]);
    setPreviews([]);
  };

  const handleClose = () => {
    handleResetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && selectedFiles.length === 0) return;

    setUploading(true);
    try {
      // 💥 1. BẢO VỆ: CHECK TRẠNG THÁI BAN TRƯỚC KHIN UPLOAD MEDIA
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned')
        .eq('id', userId)
        .single();

      if (profile?.is_banned) {
        await supabase.auth.signOut();
        toast.error('Tài khoản bị khóa!', {
          description: 'Tài khoản của bạn đã bị BAN vĩnh viễn, không thể đăng bài.',
        });
        handleClose();
        window.location.href = '/';
        return;
      }

      // 2. Upload media lên Telegram Storage
      const uploadedUrls: string[] = [];
      for (const file of selectedFiles) {
        const telegramUrl = await uploadMediaToTelegram(file);
        uploadedUrls.push(telegramUrl);
      }

      const mediaType = selectedFiles.length === 0 
        ? 'none' 
        : selectedFiles[0].type.startsWith('video/') 
        ? 'video' 
        : 'image';

      // 3. Lưu Post vào Supabase
      const { error } = await supabase.from('posts').insert({
        user_id: userId,
        content: content.trim(),
        media_urls: uploadedUrls,
        media_type: mediaType,
      });

      if (error) throw error;

      toast.success('Đã đăng bài viết mới thành công! 🎉');
      handleResetForm();
      onPostSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Đăng bài thất bại!', { description: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-800 text-sm">Tạo bài viết mới</h3>
          <button onClick={handleClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <textarea
            rows={4}
            placeholder="Mày đang nghĩ gì đấy? Đăng meme, tâm sự xàm xì đi..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full text-xs font-medium text-slate-800 outline-none resize-none placeholder:text-slate-400"
          />

          {/* Grid Preview Media */}
          {previews.length > 0 && (
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
              {previews.map((item, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-black aspect-video">
                  {item.type === 'video' ? (
                    <video src={item.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={item.url} alt="preview" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(idx)}
                    className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Action Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1">
              <label className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold">
                <ImageIcon className="w-4 h-4" />
                <span className="hidden xs:inline">Ảnh/Video</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={uploading || (!content.trim() && selectedFiles.length === 0)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tải lên...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Đăng bài</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}