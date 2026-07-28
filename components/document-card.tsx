'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DocumentItem, CommentItem } from '@/types/database';
import FilePreview from '@/components/file-preview';
import { Heart, Bookmark, Eye, Download, MessageSquare, Send, Trash2, Loader2 } from 'lucide-react';
import UserAvatar from '@/components/user-avatar';
import CommentSection from '@/components/comment-section';
import DocPreviewModal from '@/components/doc-preview-modal';
import FriendButton from '@/components/friend-button';
import UserBadge from '@/components/user-badge';
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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

    const downloadUrl = `/api/file/${doc.file_id}?filename=${encodeURIComponent(doc.file_name)}&download=true`;
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

  const formatPostTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSec < 60) return 'Vừa xong';
    if (diffInSec < 3600) return `${Math.floor(diffInSec / 60)} phút trước`;
    if (diffInSec < 86400) return `${Math.floor(diffInSec / 3600)} giờ trước`;

    // Nếu quá 24h thì hiện format Giờ:Phút • Ngày/Tháng/Năm
    const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    return `${timeStr} • ${dateFormatted}`;
  };

  const isOwner = currentUserId === doc.user_id;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 space-y-4">
      {/* Header Post */}
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
            {/* 💥 FIX DÍNH VÀ LỆCH TÍCH BADGE Ở ĐÂY */}
            <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
              <span className="truncate">{doc.profiles?.full_name || 'Sinh viên TLU'}</span>
              <UserBadge badge={doc.profiles?.badge} size="sm" />
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>{doc.profiles?.faculty || doc.faculty}</span>
              <span>•</span>
              <span title={new Date(doc.created_at).toLocaleString('vi-VN')}>
                {formatPostTime(doc.created_at)}
              </span>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <FriendButton currentUserId={currentUserId} targetUserId={doc.user_id} />
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
          {/* Nút Con Mắt -> Mở Modal Preview */}
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Xem trực tiếp"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Nút Tải Về (-10đ) */}
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải về (-10đ)</span>
          </button>

          {/* Modal Xem Trực Tiếp */}
          <DocPreviewModal
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            fileUrl={`/api/file/${doc.file_id}?filename=${encodeURIComponent(doc.file_name)}`}
            fileName={doc.file_name}
            onDownload={handleDownload}
          />
        </div>
      </div>

      {/* KHUNG THẢO LUẬN / COMMENT SANG XIN CHUẨN MXH */}
      {showComments && (
        <CommentSection
          documentId={doc.id}
          currentUserId={currentUserId}
          onCommentCountChange={(count) => setCommentsCount(count)}
        />
      )}
    </div>
  );
}