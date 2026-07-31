'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DocumentItem, CommentItem } from '@/types/database';
import FilePreview from '@/components/file-preview';
import { Heart, Bookmark, Eye, Download, MessageSquare, Trash2, Share2 } from 'lucide-react';
import UserAvatar from '@/components/user-avatar';
import CommentSection from '@/components/comment-section';
import DocPreviewModal from '@/components/doc-preview-modal';
import FriendButton from '@/components/friend-button';
import UserBadge from '@/components/user-badge';
import Link from 'next/link';

interface Props {
  doc: DocumentItem & {
    post_type?: 'document' | 'post';
    content?: string;
    media_urls?: string[];
    media_type?: 'image' | 'video' | 'none';
  };
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

  // State Comment & Preview
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsCount, setCommentsCount] = useState<number>(doc.comments_count || 0);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Phân biệt bài đăng Social Post hay Tài liệu File
  const isPostMedia = doc.post_type === 'post' || (!doc.file_id && doc.media_urls && doc.media_urls.length > 0);
  const mediaUrls = doc.media_urls || [];

  useEffect(() => {
    setUpvoted(doc.has_upvoted || false);
    setUpvoteCount(doc.upvotes_count || 0);
    setBookmarked(doc.has_bookmarked || false);
    setCommentsCount(doc.comments_count || 0);
  }, [doc.has_upvoted, doc.upvotes_count, doc.has_bookmarked, doc.id, doc.comments_count, currentUserId]);

  // 💥 HELPER TRỪ COINS DÙNG CHUNG KHI XEM TRỰC TIẾP & TẢI VỀ
  const checkAndDeductPoints = async (actionName: string): Promise<boolean> => {
    if (!currentUserId) {
      alert(`Bạn cần đăng nhập để ${actionName}!`);
      return false;
    }

    // Chính chủ bài viết -> Miễn phí
    if (doc.user_id === currentUserId) return true;

    // Check số dư Coins
    if (currentUserPoints < 10) {
      alert(`Bạn không đủ TLU-Coins! Cần 10 Coins để ${actionName}. Hãy đăng tài liệu để nhận thêm xu nhé!`);
      return false;
    }

    // Trừ 10 Coins
    const nextPoints = currentUserPoints - 10;
    onPointsChange?.(nextPoints);

    const { error } = await supabase
      .from('profiles')
      .update({ points: nextPoints })
      .eq('id', currentUserId);

    if (error) {
      onPointsChange?.(currentUserPoints); // Rollback nếu lỗi DB
      console.error('Lỗi trừ điểm:', error.message);
      alert('Có lỗi xảy ra khi trừ TLU-Coins!');
      return false;
    }

    return true;
  };

  // 💥 Xem trực tiếp (Preview) -> Thu 10 Coins
  const handleOpenPreview = async () => {
    const success = await checkAndDeductPoints('xem trực tiếp tài liệu');
    if (success) {
      setIsPreviewOpen(true);
    }
  };

  // 💥 Tải File -> Thu 10 Coins
  const handleDownload = async () => {
    const success = await checkAndDeductPoints('tải tài liệu');
    if (!success) return;

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

  // Xử lý Thả tim Upvote
  const handleToggleUpvote = async () => {
    if (!currentUserId) return alert('Bạn phải đăng nhập mới thả tim được nhé!');

    const previousUpvoted = upvoted;
    const previousCount = upvoteCount;

    const nextUpvoted = !upvoted;
    const nextCount = nextUpvoted ? upvoteCount + 1 : Math.max(0, upvoteCount - 1);

    setUpvoted(nextUpvoted);
    setUpvoteCount(nextCount);

    const tableName = isPostMedia ? 'post_upvotes' : 'upvotes';
    const idKey = isPostMedia ? 'post_id' : 'document_id';

    try {
      if (previousUpvoted) {
        const { error } = await supabase.from(tableName).delete().match({ user_id: currentUserId, [idKey]: doc.id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from(tableName).insert({ user_id: currentUserId, [idKey]: doc.id });
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
    if (!currentUserId) return alert('Đăng nhập để lưu bài viết nhé!');

    const previousBookmarked = bookmarked;
    const nextBookmarked = !bookmarked;

    setBookmarked(nextBookmarked);
    onToggleBookmark?.(nextBookmarked);

    const tableName = isPostMedia ? 'post_bookmarks' : 'bookmarks';
    const idKey = isPostMedia ? 'post_id' : 'document_id';

    try {
      if (previousBookmarked) {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('user_id', currentUserId)
          .eq(idKey, doc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(tableName)
          .upsert(
            { user_id: currentUserId, [idKey]: doc.id },
            { onConflict: `user_id,${idKey}` }
          );
        if (error) throw error;
      }
    } catch (err: any) {
      setBookmarked(previousBookmarked);
      onToggleBookmark?.(previousBookmarked);
      alert('Không thể cập nhật trạng thái lưu: ' + err.message);
    }
  };

  // Lấy danh sách Comment
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

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    if (bytes < k * 1024) return `${(bytes / k).toFixed(1)} KB`;
    return `${(bytes / (k * k)).toFixed(1)} MB`;
  };

  const getFileBadge = (fileName: string, fileExt?: string) => {
    const ext = fileExt || fileName?.split('.').pop()?.toLowerCase() || '';

    if (['pdf'].includes(ext)) {
      return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200/60 rounded font-bold shrink-0">📄 PDF</span>;
    }
    if (['docx', 'doc'].includes(ext)) {
      return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded font-bold shrink-0">📝 WORD</span>;
    }
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded font-bold shrink-0">📊 EXCEL</span>;
    }
    if (['pptx', 'ppt'].includes(ext)) {
      return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded font-bold shrink-0">📊 SLIDE</span>;
    }
    return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200/60 rounded font-bold shrink-0">📁 FILE</span>;
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc muốn xóa bài viết này không?')) return;
    onDelete?.(doc.id);
    const tableName = isPostMedia ? 'posts' : 'documents';
    const { error } = await supabase.from(tableName).delete().eq('id', doc.id);
    if (error) {
      alert('Không xóa được bài viết: ' + error.message);
      onRefresh?.();
    }
  };

  const formatPostTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSec < 60) return 'Vừa xong';
    if (diffInSec < 3600) return `${Math.floor(diffInSec / 60)} phút trước`;
    if (diffInSec < 86400) return `${Math.floor(diffInSec / 3600)} giờ trước`;

    const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return `${timeStr} • ${dateFormatted}`;
  };

  const isOwner = currentUserId === doc.user_id;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 max-w-full overflow-hidden">
      {/* Header Post (Avatar, Tên, Nút Kết bạn) */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <Link
          href={currentUserId === doc.user_id ? '/profile' : `/profile/${doc.user_id}`}
          className="flex items-center gap-2.5 sm:gap-3 group cursor-pointer min-w-0 flex-1"
        >
          <UserAvatar
            src={doc.profiles?.avatar_url}
            name={doc.profiles?.full_name}
            size="md"
            className="group-hover:scale-105 transition-transform shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-1.5 min-w-0">
              <span className="truncate">{doc.profiles?.full_name || 'Sinh viên TLU'}</span>
              <UserBadge badge={doc.profiles?.badge} size="sm" />
            </h4>
            <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
              <span className="truncate max-w-[120px] sm:max-w-none">{doc.profiles?.faculty || doc.faculty || 'TLUer'}</span>
              <span className="shrink-0">•</span>
              <span className="shrink-0" title={new Date(doc.created_at).toLocaleString('vi-VN')}>
                {formatPostTime(doc.created_at)}
              </span>
            </div>
          </div>
        </Link>

        {/* Khung nút điều khiển bên phải header */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <FriendButton currentUserId={currentUserId} targetUserId={doc.user_id} />
          {doc.doc_type && (
            <span className="hidden sm:inline-block px-2.5 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 rounded-full shrink-0">
              {doc.doc_type}
            </span>
          )}
          {isOwner && (
            <button
              onClick={handleDelete}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
              title="Xóa bài viết của bạn"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Title & Description */}
      <div className="space-y-2">
        {doc.title && (
          <h3 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-2 leading-snug break-words">
            {doc.title}
          </h3>
        )}

        {(doc.content || doc.description) && (
          <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed break-words">
            {doc.content || doc.description}
          </p>
        )}

        {/* FILE HỌC TẬP (NẾU CÓ FILE ID) */}
        {doc.file_id && (
          <div className="space-y-2 pt-1">
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px]">
              {getFileBadge(doc.file_name, doc.file_ext)}
              {doc.subject && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-medium truncate max-w-[140px] sm:max-w-none">📖 {doc.subject}</span>}
              {doc.semester && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-medium shrink-0">🗓️ {doc.semester}</span>}
              {doc.file_size && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-medium shrink-0">💾 {formatFileSize(doc.file_size)}</span>}
            </div>

            <FilePreview fileId={doc.file_id} fileName={doc.file_name} fileExt={doc.file_ext} />
          </div>
        )}

        {/* MEDIA ẢNH/VIDEO */}
        {mediaUrls.length > 0 && (
          <div className="pt-2 rounded-xl overflow-hidden border border-slate-200/80 bg-slate-950">
            {doc.media_type === 'video' ? (
              <video src={mediaUrls[0]} controls preload="metadata" className="w-full max-h-[400px] sm:max-h-[450px] object-contain" />
            ) : (
              <div
                className={`grid gap-0.5 ${
                  mediaUrls.length === 1
                    ? 'grid-cols-1'
                    : 'grid-cols-2'
                }`}
              >
                {mediaUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className={`relative overflow-hidden bg-slate-100 ${
                      mediaUrls.length === 3 && idx === 0 ? 'col-span-2 aspect-video' : 'aspect-square'
                    }`}
                  >
                    <img
                      src={url}
                      alt="Post media"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                      onClick={() => window.open(url, '_blank')}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 📱 ACTION BAR FULL RESPONSIVE */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
        {/* Nhóm tương tác góc trái: Like, Comment, Bookmark */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={handleToggleUpvote}
            className={`flex items-center gap-1 sm:gap-1.5 text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${
              upvoted ? 'bg-rose-50 text-rose-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Heart className={`w-4 h-4 ${upvoted ? 'fill-rose-600' : ''}`} />
            <span>{upvoteCount}</span>
          </button>

          <button
            onClick={fetchComments}
            className={`flex items-center gap-1 sm:gap-1.5 text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${
              showComments ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden xs:inline">Thảo luận</span>
            <span>({commentsCount})</span>
          </button>

          <button
            onClick={handleToggleBookmark}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              bookmarked ? 'bg-amber-50 text-amber-600' : 'text-slate-400 hover:bg-slate-100'
            }`}
            title="Lưu bài viết"
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-amber-600' : ''}`} />
          </button>
        </div>

        {/* Nhóm hành động góc phải: Chia sẻ, Xem online, Tải về */}
        <div className="flex items-center gap-1 sm:gap-1.5 ml-auto shrink-0">
          <button
            onClick={() => {
              const baseUrl = window.location.origin;
              const shareUrl = doc.post_type === 'post'
                ? `${baseUrl}/post/${doc.id}`
                : `${baseUrl}/doc/${doc.id}`;

              navigator.clipboard.writeText(shareUrl);
              alert(`Đã sao chép liên kết bài viết:\n${shareUrl}`);
            }}
            className="flex items-center gap-1 px-2 py-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-slate-500 text-xs font-bold"
            title="Chia sẻ"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Chia sẻ</span>
          </button>

          {doc.file_id && (
            <>
              {/* Nút Xem online (-10 Coins) */}
              <button
                onClick={handleOpenPreview}
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                title="Xem trực tiếp (-10 Coins)"
              >
                <Eye className="w-4 h-4" />
                <span className="text-[10px] font-bold text-blue-600 sm:hidden">-10đ</span>
              </button>

              {/* Nút Tải về (-10 Coins) */}
              <button
                onClick={handleDownload}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tải về (-10đ)</span>
                <span className="sm:hidden">-10đ</span>
              </button>

              <DocPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                fileUrl={`/api/file/${doc.file_id}?filename=${encodeURIComponent(doc.file_name)}`}
                fileName={doc.file_name}
                onDownload={handleDownload}
              />
            </>
          )}
        </div>
      </div>

      {/* KHUNG BÌNH LUẬN */}
      {showComments && (
        <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <CommentSection
            documentId={!isPostMedia ? doc.id : undefined}
            postId={isPostMedia ? doc.id : undefined}
            currentUserId={currentUserId}
            onCommentCountChange={(count) => setCommentsCount(count)}
          />
        </div>
      )}
    </div>
  );
}