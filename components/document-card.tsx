'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DocumentItem, CommentItem } from '@/types/database';
import FilePreview from '@/components/file-preview';
import { Heart, Bookmark, Eye, Download, MessageSquare, Send, Trash2, Loader2 } from 'lucide-react';
import UserAvatar from '@/components/user-avatar';
import Link from 'next/link';

interface Props {
  doc: DocumentItem;
  currentUserId?: string;
  currentUserPoints?: number;
  onRefresh?: () => void;
  onToggleBookmark?: (isBookmarked: boolean) => void;
  onDelete?: (docId: string) => void;
  onPointsChange?: (newPoints: number) => void;
}

export default function DocumentCard({
  doc,
  currentUserId,
  currentUserPoints = 0,
  onRefresh,
  onToggleBookmark,
  onDelete,
  onPointsChange,
}: Props) {
  const [upvoted, setUpvoted] = useState(doc.has_upvoted || false);
  const [upvoteCount, setUpvoteCount] = useState(doc.upvotes_count || 0);
  const [bookmarked, setBookmarked] = useState(doc.has_bookmarked || false);

  // State Comment
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsCount, setCommentsCount] = useState<number>(doc.comments_count || 0);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    setUpvoted(doc.has_upvoted || false);
    setUpvoteCount(doc.upvotes_count || 0);
    setBookmarked(doc.has_bookmarked || false);
  }, [doc.has_upvoted, doc.upvotes_count, doc.has_bookmarked, doc.id]);

  // Xử lý Upvote / Un-upvote
  const handleToggleUpvote = async () => {
    if (!currentUserId) return alert('Mày phải đăng nhập mới thả tim được nhé!');

    const previousUpvoted = upvoted;
    const previousCount = upvoteCount;

    const nextUpvoted = !upvoted;
    const nextCount = nextUpvoted ? upvoteCount + 1 : Math.max(0, upvoteCount - 1);

    setUpvoted(nextUpvoted);
    setUpvoteCount(nextCount);

    try {
      if (previousUpvoted) {
        const { error } = await supabase.from('upvotes').delete().match({ user_id: currentUserId, document_id: doc.id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('upvotes').insert({ user_id: currentUserId, document_id: doc.id });
        if (error) throw error;
      }
    } catch (err) {
      setUpvoted(previousUpvoted);
      setUpvoteCount(previousCount);
      alert('Không thể thả tim, kiểm tra lại kết nối mạng!');
    }
  };

  // Xử lý Bookmark
  const handleToggleBookmark = async () => {
    if (!currentUserId) return alert('Đăng nhập để lưu tài liệu nhé!');

    const previousBookmarked = bookmarked;
    const nextBookmarked = !bookmarked;

    setBookmarked(nextBookmarked);
    onToggleBookmark?.(nextBookmarked);

    try {
      if (previousBookmarked) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', currentUserId)
          .eq('document_id', doc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bookmarks')
          .upsert(
            { user_id: currentUserId, document_id: doc.id },
            { onConflict: 'user_id,document_id' }
          );
        if (error) throw error;
      }
    } catch (err) {
      setBookmarked(previousBookmarked);
      onToggleBookmark?.(previousBookmarked);
      alert('Không thể cập nhật trạng thái lưu!');
    }
  };

  // Xử lý Lấy danh sách Comment
  const fetchComments = async () => {
    if (!showComments) {
      setLoadingComments(true);
      const { data } = await supabase
        .from('comments')
        .select('*, profiles(*)')
        .eq('document_id', doc.id)
        .order('created_at', { ascending: true });

      if (data) {
        setComments(data as any);
        setCommentsCount(data.length);
      }
      setLoadingComments(false);
    }
    setShowComments(!showComments);
  };

  // Gửi Comment mới (Optimistic UI)
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return alert('Vui lòng đăng nhập để bình luận!');
    if (!newComment.trim() || sendingComment) return;

    const commentText = newComment.trim();
    setNewComment('');
    setSendingComment(true);

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: currentUserId,
          document_id: doc.id,
          content: commentText,
        })
        .select('*, profiles(*)')
        .single();

      if (error) throw error;

      if (data) {
        setComments((prev) => [...prev, data as any]);
        setCommentsCount((prev) => prev + 1);
      }
    } catch (err: any) {
      alert('Không gửi được bình luận: ' + err.message);
      setNewComment(commentText);
    } finally {
      setSendingComment(false);
    }
  };

  // Xóa Comment (Chính chủ)
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Xóa bình luận này?')) return;

    // Lọc khỏi UI ngay lập tức
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setCommentsCount((prev) => Math.max(0, prev - 1));

    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) {
      alert('Lỗi xóa bình luận: ' + error.message);
      fetchComments(); // Fetch lại nếu lỗi
    }
  };

  // Xử lý Tải File
  const handleDownload = async () => {
    if (!currentUserId) return alert('Mày cần đăng nhập để tải tài liệu!');

    if (doc.user_id !== currentUserId) {
      if (currentUserPoints < 10) {
        return alert('Mày không đủ TLU-Coins! Cần 10 điểm để tải. Hãy upload bài mới để kiếm thêm xu nhé!');
      }

      const nextPoints = currentUserPoints - 10;
      onPointsChange?.(nextPoints);

      const { error } = await supabase
        .from('profiles')
        .update({ points: nextPoints })
        .eq('id', currentUserId);

      if (error) {
        onPointsChange?.(currentUserPoints);
        console.error('Lỗi trừ điểm:', error.message);
        return alert('Có lỗi xảy ra khi trừ TLU-Coins!');
      }
    }

    await supabase
      .from('documents')
      .update({ downloads_count: (doc.downloads_count || 0) + 1 })
      .eq('id', doc.id);

    const downloadUrl = `/api/file/${doc.file_id}?filename=${encodeURIComponent(doc.file_name)}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = doc.file_name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    if (bytes < k * 1024) return `${(bytes / k).toFixed(1)} KB`;
    return `${(bytes / (k * k)).toFixed(1)} MB`;
  };

  const getFileBadge = (fileName: string, fileExt?: string) => {
    const ext = fileExt || fileName.split('.').pop()?.toLowerCase() || '';

    if (['pdf'].includes(ext)) {
      return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold">📄 PDF</span>;
    }
    if (['docx', 'doc'].includes(ext)) {
      return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-bold">📝 WORD</span>;
    }
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold">📊 EXCEL</span>;
    }
    if (['pptx', 'ppt'].includes(ext)) {
      return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-bold">📊 SLIDE</span>;
    }
    return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-bold">📁 FILE</span>;
  };

  const handleDelete = async () => {
    if (!confirm('Mày có chắc muốn xóa tài liệu này không?')) return;
    onDelete?.(doc.id);
    const { error } = await supabase.from('documents').delete().eq('id', doc.id);
    if (error) {
      alert('Không xóa được bài viết: ' + error.message);
      onRefresh?.();
    }
  };

  // Helper format thời gian cmt đẹp mắt
  const formatCommentTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSec < 60) return 'Vừa xong';
    if (diffInSec < 3600) return `${Math.floor(diffInSec / 60)} phút trước`;
    if (diffInSec < 86400) return `${Math.floor(diffInSec / 3600)} giờ trước`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const isOwner = currentUserId === doc.user_id;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 space-y-4">
      {/* Header Post */}
      <div className="flex justify-between items-start">
        <Link
          href={currentUserId === doc.user_id ? '/profile' : `/profile/${doc.user_id}`}
          className="flex items-center gap-3 group cursor-pointer"
        >
          <UserAvatar
            src={doc.profiles?.avatar_url}
            name={doc.profiles?.full_name}
            size="md"
            className="group-hover:scale-105 transition-transform"
          />
          <div>
            <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
              {doc.profiles?.full_name || 'Sinh viên TLU'}
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{doc.profiles?.faculty || doc.faculty}</span>
              <span>•</span>
              <span>{new Date(doc.created_at).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full">
            {doc.doc_type}
          </span>
          {isOwner && (
            <button
              onClick={handleDelete}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              title="Xóa bài viết của bạn"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Title & Detail */}
      <div className="space-y-2">
        <h3 className="font-bold text-slate-900 text-base line-clamp-1">{doc.title}</h3>
        <p className="text-xs text-slate-500 line-clamp-2">{doc.description || 'Không có mô tả chi tiết'}</p>

        {/* Khung Thông Tin Tags */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
          {getFileBadge(doc.file_name, doc.file_ext)}
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">📖 {doc.subject}</span>
          {doc.semester && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">🗓️ {doc.semester}</span>}
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">💾 {formatFileSize(doc.file_size)}</span>
        </div>

        {/* Preview File */}
        <div className="pt-2">
          <FilePreview fileId={doc.file_id} fileName={doc.file_name} fileExt={doc.file_ext} />
        </div>
      </div>

      {/* Action Bar */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Nút Upvote */}
          <button
            onClick={handleToggleUpvote}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
              upvoted ? 'bg-rose-50 text-rose-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Heart className={`w-4 h-4 ${upvoted ? 'fill-rose-600' : ''}`} />
            <span>{upvoteCount}</span>
          </button>

          {/* Nút Comment kèm Badge Đếm Số Lượng */}
          <button
            onClick={fetchComments}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
              showComments ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Thảo luận ({commentsCount})</span>
          </button>

          {/* Nút Bookmark */}
          <button
            onClick={handleToggleBookmark}
            className={`p-1.5 rounded-lg transition-colors ${
              bookmarked ? 'bg-amber-50 text-amber-600' : 'text-slate-400 hover:bg-slate-100'
            }`}
            title="Lưu tài liệu"
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-amber-600' : ''}`} />
          </button>
        </div>

        {/* Nút Preview & Download */}
        <div className="flex items-center gap-2">
          <a
            href={`/api/file/${doc.file_id}?filename=${encodeURIComponent(doc.file_name)}`}
            target="_blank"
            rel="noreferrer"
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Xem trực tiếp"
          >
            <Eye className="w-4 h-4" />
          </a>

          <button
            onClick={handleDownload}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải về (-10đ)</span>
          </button>
        </div>
      </div>

      {/* KHUNG THẢO LUẬN / COMMENT SANG XIN CHUẨN MXH */}
      {showComments && (
        <div className="pt-3 border-t border-slate-100 space-y-3 bg-slate-50/70 p-3.5 rounded-2xl">
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {loadingComments ? (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-4">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Đang tải thảo luận...</span>
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                Chưa có bình luận nào. Hãy mở bát thảo luận ngay!
              </p>
            ) : (
              comments.map((c) => {
                const isMyComment = currentUserId === c.user_id;
                return (
                  <div key={c.id} className="flex gap-2.5 text-xs group">
                    <Link href={isMyComment ? '/profile' : `/profile/${c.user_id}`}>
                      <UserAvatar
                        src={c.profiles?.avatar_url}
                        name={c.profiles?.full_name}
                        size="sm"
                        className="mt-0.5 hover:scale-105 transition-transform"
                      />
                    </Link>

                    <div className="flex-1 bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-none space-y-1">
                      <div className="flex justify-between items-center">
                        <Link
                          href={isMyComment ? '/profile' : `/profile/${c.user_id}`}
                          className="font-bold text-slate-800 hover:text-blue-600 transition-colors"
                        >
                          {c.profiles?.full_name || 'Sinh viên TLU'}
                        </Link>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">
                            {formatCommentTime(c.created_at)}
                          </span>
                          {/* Nút Xóa Comment của chính mình */}
                          {isMyComment && (
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-all"
                              title="Xóa bình luận"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-700 leading-relaxed break-words">{c.content}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Form Comment */}
          <form onSubmit={handleSendComment} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              placeholder={currentUserId ? "Viết bình luận của mày..." : "Đăng nhập để bình luận..."}
              disabled={!currentUserId || sendingComment}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!currentUserId || !newComment.trim() || sendingComment}
              className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 flex-shrink-0"
            >
              {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}