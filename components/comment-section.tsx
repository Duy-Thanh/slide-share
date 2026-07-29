'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { CommentItem, Profile } from '@/types/database';
import UserAvatar from '@/components/user-avatar';
import Link from 'next/link';
import FriendButton from '@/components/friend-button';
import { Heart, Reply, Send, Trash2, Loader2, AtSign } from 'lucide-react';
import UserBadge from '@/components/user-badge';

interface Props {
  documentId: string;
  currentUserId?: string;
  onCommentCountChange?: (count: number) => void;
}

interface ExtendedComment extends CommentItem {
  parent_id?: string | null;
  likes_count?: number;
  has_liked?: boolean;
}

// Component parse text cmt thành link khi chứa @
// Helper render nội dung cmt, tự nhận diện @Mention để biến thành Link nhảy Profile
function FormattedCommentText({
  content,
  userList = [],
  currentUserId,
}: {
  content: string;
  userList?: Profile[];
  currentUserId?: string;
}) {
  const words = content.split(' ');

  return (
    <span>
      {words.map((word, idx) => {
        if (word.startsWith('@') && word.length > 1) {
          // Lấy tên đã được clean (loại bỏ dấu câu dính kèm)
          const cleanName = word.substring(1).replace(/_/g, ' ');

          // Tìm xem tên này thuộc về user nào trong database
          const matchedUser = userList.find(
            (u) =>
              u.full_name?.toLowerCase() === cleanName.toLowerCase() ||
              u.full_name?.replace(/\s+/g, '_').toLowerCase() === word.substring(1).toLowerCase()
          );

          if (matchedUser) {
            const profileHref =
              currentUserId === matchedUser.id ? '/profile' : `/profile/${matchedUser.id}`;

            return (
              <Link
                key={idx}
                href={profileHref}
                className="font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded transition-colors mr-1 cursor-pointer inline-block"
              >
                {word}
              </Link>
            );
          }

          // Nếu đéo tìm thấy ID cụ thể trong DB thì vẫn cho link tới trang chủ hoặc highlight
          return (
            <span
              key={idx}
              className="font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded mr-1 inline-block"
            >
              {word}
            </span>
          );
        }
        return word + ' ';
      })}
    </span>
  );
}

export default function CommentSection({
  documentId,
  currentUserId,
  onCommentCountChange,
}: Props) {
  const [comments, setComments] = useState<ExtendedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [sending, setSending] = useState(false);

  // States cho Autocomplete @Tag
  const [userList, setUserList] = useState<Profile[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showMentionPopup, setShowMentionPopup] = useState(false);

  useEffect(() => {
    fetchComments();
    fetchUsersForMention();
  }, [documentId]);

  // Fetch danh sách sinh viên để sẵn cho menu @Tag
  const fetchUsersForMention = async () => {
    const { data } = await supabase.from('profiles').select('*').limit(20);
    if (data) setUserList(data);
  };

  const fetchComments = async () => {
    setLoading(true);

    // 1. Fetch danh sách comments + ĐẾM SỐ LƯỢT LIKE từ bảng comment_likes
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(*), comment_likes(count)') // 💥 Thêm comment_likes(count)
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      let formatted: ExtendedComment[] = data.map((c: any) => ({
        ...c,
        likes_count: c.comment_likes?.[0]?.count || 0, // 💥 Gán số lượt thích chuẩn từ DB
      }));

      // 2. Map trạng thái "Đã thích" (has_liked) của user hiện tại
      if (currentUserId) {
        const { data: commentLikes } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', currentUserId);

        const likedIds = new Set(commentLikes?.map((l) => l.comment_id) || []);
        formatted = formatted.map((c) => ({
          ...c,
          has_liked: likedIds.has(c.id),
        }));
      }

      setComments(formatted);
      onCommentCountChange?.(formatted.length);
    }
    setLoading(false);
  };

  // Bắt sự kiện gõ ô input để phát hiện ký tự '@'
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    const lastAtPos = val.lastIndexOf('@');
    if (lastAtPos !== -1 && lastAtPos >= val.length - 15) {
      const query = val.slice(lastAtPos + 1).toLowerCase();
      // Nếu không có dấu cách sau @
      if (!query.includes(' ')) {
        setMentionQuery(query);
        setShowMentionPopup(true);
        return;
      }
    }
    setShowMentionPopup(false);
  };

  // Khi chọn 1 user từ danh sách @Tag
  const handleSelectMentionUser = (fullName: string) => {
    const lastAtPos = inputText.lastIndexOf('@');
    if (lastAtPos !== -1) {
      const prefix = inputText.slice(0, lastAtPos);
      const newText = `${prefix}@${fullName.replace(/\s+/g, '_')} `;
      setInputText(newText);
    }
    setShowMentionPopup(false);
  };

  // Toggle Like Comment
  const handleToggleLikeComment = async (commentId: string, hasLiked?: boolean, currentLikes = 0) => {
    if (!currentUserId) return alert('Đăng nhập để thả tim bình luận nhé!');

    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            has_liked: !hasLiked,
            likes_count: hasLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1,
          };
        }
        return c;
      })
    );

    try {
      if (hasLiked) {
        await supabase
          .from('comment_likes')
          .delete()
          .match({ user_id: currentUserId, comment_id: commentId });
      } else {
        await supabase
          .from('comment_likes')
          .insert({ user_id: currentUserId, comment_id: commentId });
      }
    } catch (err) {
      fetchComments();
    }
  };

  // Gửi Bình Luận / Reply
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return alert('Vui lòng đăng nhập!');
    if (!inputText.trim() || sending) return;

    setSending(true);
    const contentToSend = inputText.trim();

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: currentUserId,
          document_id: documentId,
          content: contentToSend,
          parent_id: replyingTo?.id || null,
        })
        .select('*, profiles(*)')
        .single();

      if (error) throw error;

      if (data) {
        setComments((prev) => [...prev, data as any]);
        setInputText('');
        setReplyingTo(null);
        setShowMentionPopup(false);
        onCommentCountChange?.(comments.length + 1);
      }
    } catch (err: any) {
      alert('Không gửi được bình luận: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  // Xóa Comment
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bình luận này không?')) return;

    setComments((prev) => prev.filter((c) => c.id !== commentId && c.parent_id !== commentId));
    onCommentCountChange?.(Math.max(0, comments.length - 1));

    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) {
      alert('Lỗi xóa bình luận: ' + error.message);
      fetchComments();
    }
  };

  const handleStartReply = (c: ExtendedComment) => {
    setReplyingTo({ id: c.id, name: c.profiles?.full_name || 'Sinh viên' });
    const formattedName = (c.profiles?.full_name || 'TLUer').replace(/\s+/g, '_');
    setInputText(`@${formattedName} `);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSec < 60) return 'Vừa xong';
    if (diffInSec < 3600) return `${Math.floor(diffInSec / 60)}m`;
    if (diffInSec < 86400) return `${Math.floor(diffInSec / 3600)}h`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const filteredMentionUsers = userList.filter((u) =>
    (u.full_name || '').toLowerCase().includes(mentionQuery || '')
  );

  const parentComments = comments.filter((c) => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  return (
    <div className="pt-3 border-t border-slate-100 space-y-3 bg-slate-50/70 p-3.5 rounded-2xl relative">
      {/* Danh Sách Bình Luận */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-4">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Đang tải thảo luận...</span>
          </div>
        ) : parentComments.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">
            Chưa có bình luận nào. Hãy mở bát thảo luận ngay!
          </p>
        ) : (
          parentComments.map((parent) => {
            const isMyComment = currentUserId === parent.user_id;
            const replies = getReplies(parent.id);

            return (
              <div key={parent.id} className="space-y-2">
                {/* COMMENT CHA */}
                <div className="flex gap-2.5 text-xs group">
                  <Link href={isMyComment ? '/profile' : `/profile/${parent.user_id}`}>
                    <UserAvatar
                      src={parent.profiles?.avatar_url}
                      name={parent.profiles?.full_name}
                      size="sm"
                      className="mt-0.5 hover:scale-105 transition-transform"
                    />
                  </Link>

                  <div className="flex-1 bg-white p-2.5 rounded-2xl border border-slate-200/60 shadow-none space-y-1">
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <Link
                          href={isMyComment ? '/profile' : `/profile/${parent.user_id}`}
                          className="font-bold text-slate-800 hover:text-blue-600 transition-colors truncate"
                        >
                          {parent.profiles?.full_name || 'Sinh viên TLU'}
                        </Link>
                        <UserBadge badge={parent.profiles?.badge} />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* 💥 Nút Kết Bạn hiển thị nếu không phải comment của chính mình */}
                        {!isMyComment && (
                          <FriendButton currentUserId={currentUserId} targetUserId={parent.user_id} />
                        )}

                        <span className="text-[10px] text-slate-400">{formatTime(parent.created_at)}</span>

                        {isMyComment && (
                          <button
                            onClick={() => handleDeleteComment(parent.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-all"
                            title="Xóa bình luận"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* NỘI DUNG COMMENT BÌNH THƯỜNG (CÓ AUTO-LINK @TAG) */}
                    <p className="text-slate-700 leading-relaxed break-words">
                      <FormattedCommentText
                        content={parent.content}
                        userList={userList}
                        currentUserId={currentUserId}
                      />
                    </p>

                    <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-400 font-medium">
                      <button
                        onClick={() =>
                          handleToggleLikeComment(parent.id, parent.has_liked, parent.likes_count)
                        }
                        className={`flex items-center gap-1 hover:text-rose-600 transition-colors ${
                          parent.has_liked ? 'text-rose-600 font-bold' : ''
                        }`}
                      >
                        <Heart className={`w-3 h-3 ${parent.has_liked ? 'fill-rose-600' : ''}`} />
                        <span>{parent.likes_count || 0} Thích</span>
                      </button>

                      <button
                        onClick={() => handleStartReply(parent)}
                        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                      >
                        <Reply className="w-3 h-3" />
                        <span>Trả lời</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* REPLIES THỤT VÀO */}
                {replies.length > 0 && (
                <div className="pl-6 space-y-2 border-l-2 border-slate-200/80 ml-3 pt-1">
                  {replies.map((reply) => {
                    const isMyReply = currentUserId === reply.user_id;
                    return (
                      <div key={reply.id} className="flex gap-2 text-xs group">
                        <Link href={isMyReply ? '/profile' : `/profile/${reply.user_id}`}>
                          <UserAvatar
                            src={reply.profiles?.avatar_url}
                            name={reply.profiles?.full_name}
                            size="sm"
                            className="mt-0.5 hover:scale-105 transition-transform"
                          />
                        </Link>

                        <div className="flex-1 bg-white/90 p-2.5 rounded-2xl border border-slate-200/60 space-y-1 relative">
                          <div className="flex justify-between items-center gap-2">
                            <div className="flex items-center gap-2 truncate">
                              <Link
                                href={isMyReply ? '/profile' : `/profile/${reply.user_id}`}
                                className="font-bold text-slate-800 hover:text-blue-600 transition-colors truncate"
                              >
                                {reply.profiles?.full_name || 'Sinh viên TLU'}
                              </Link>
                              <UserBadge badge={reply.profiles?.badge} />
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* 💥 Nút Kết Bạn cho Comment Con */}
                              {!isMyReply && (
                                <FriendButton currentUserId={currentUserId} targetUserId={reply.user_id} />
                              )}

                              <span className="text-[10px] text-slate-400">{formatTime(reply.created_at)}</span>

                              {/* 💥 Nút Xóa Icon Trash2 góc phải, hover mới hiện */}
                              {isMyReply && (
                                <button
                                  onClick={() => handleDeleteComment(reply.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-all"
                                  title="Xóa bình luận"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-slate-700 leading-relaxed break-words">
                            <FormattedCommentText
                              content={reply.content}
                              userList={userList}
                              currentUserId={currentUserId}
                            />
                          </p>

                          {/* 💥 Nút Thích & Trả Lời cho Comment Con */}
                          <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-400 font-medium">
                            <button
                              onClick={() =>
                                handleToggleLikeComment(reply.id, reply.has_liked, reply.likes_count)
                              }
                              className={`flex items-center gap-1 hover:text-rose-600 transition-colors ${
                                reply.has_liked ? 'text-rose-600 font-bold' : ''
                              }`}
                            >
                              <Heart className={`w-3 h-3 ${reply.has_liked ? 'fill-rose-600' : ''}`} />
                              <span>{reply.likes_count || 0} Thích</span>
                            </button>

                            {/* 💥 Nút Trả Lời comment con */}
                            <button
                              onClick={() => handleStartReply(parent)}
                              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                            >
                              <Reply className="w-3 h-3" />
                              <span>Trả lời</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </div>
            );
          })
        )}
      </div>

      {/* Hiển thị Banner đang Reply ai */}
      {replyingTo && (
        <div className="flex items-center justify-between text-[11px] bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-200">
          <span>
            Đang trả lời <b>{replyingTo.name}</b>
          </span>
          <button
            onClick={() => {
              setReplyingTo(null);
              setInputText('');
            }}
            className="font-bold text-blue-900 hover:underline"
          >
            Hủy
          </button>
        </div>
      )}

      {/* Form Nhập Bình Luận */}
      <form onSubmit={handleSendComment} className="flex items-center gap-2 pt-1 relative">
        {/* POPUP AUTOCOMPLETE @TAG */}
        {showMentionPopup && filteredMentionUsers.length > 0 && (
          <div className="absolute bottom-full mb-2 left-0 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto p-1">
            <div className="text-[10px] font-bold text-slate-400 px-2 py-1 flex items-center gap-1 border-b border-slate-100">
              <AtSign className="w-3 h-3 text-blue-600" /> Chọn người để Tag
            </div>
            {filteredMentionUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleSelectMentionUser(u.full_name || 'TLUer')}
                className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 rounded-lg flex items-center gap-2 text-xs transition-colors"
              >
                <UserAvatar src={u.avatar_url} name={u.full_name} size="sm" />
                <div className="truncate">
                  <p className="font-bold text-slate-800 text-[11px]">{u.full_name || 'Sinh viên'}</p>
                  <p className="text-[9px] text-slate-400">{u.faculty || 'CNTT'}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <input
          type="text"
          placeholder={
            currentUserId
              ? 'Viết bình luận... (Gõ @ để tag người dùng)'
              : 'Đăng nhập để bình luận...'
          }
          disabled={!currentUserId || sending}
          value={inputText}
          onChange={handleInputChange}
          className="flex-1 px-3.5 py-2 text-xs bg-white text-slate-900 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 placeholder:text-slate-400 font-medium"
        />
        <button
          type="submit"
          disabled={!currentUserId || !inputText.trim() || sending}
          className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 flex-shrink-0"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}