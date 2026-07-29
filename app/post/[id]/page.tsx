'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import DocumentCard from '@/components/document-card';
import UserAvatar from '@/components/user-avatar';
import Link from 'next/link';
import { ArrowLeft, Loader2, MessageSquareText } from 'lucide-react';

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = use(params);

  const [post, setPost] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      if (session?.user) {
        supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => {
          if (data) setProfile(data);
        });
      }
    });

    fetchPostDetail();
  }, [postId]);

  const fetchPostDetail = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(*), comments(count)')
      .eq('id', postId)
      .single();

    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let formattedPost = {
      ...data,
      post_type: 'post',
      title: '',
      comments_count: data.comments?.[0]?.count || 0,
    };

    // Fetch trạng thái Upvote nếu đã đăng nhập
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUid = sessionData?.session?.user?.id;

    if (currentUid) {
      const { data: upvoteData } = await supabase
        .from('post_upvotes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', currentUid)
        .single();

      formattedPost.has_upvoted = !!upvoteData;
    }

    setPost(formattedPost);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#f0f2f5] text-slate-800 py-6 px-2 sm:px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header Quay Lại Trang Chủ */}
        <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Trang chủ</span>
          </Link>
          <span className="text-xs font-extrabold text-indigo-600 flex items-center gap-1.5">
            <MessageSquareText className="w-4 h-4" /> Bài viết
          </span>
        </div>

        {/* Nội dung Post Detail */}
        {loading ? (
          <div className="bg-white text-center py-16 rounded-2xl border border-slate-200 text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>Đang tải bài viết...</span>
          </div>
        ) : notFound || !post ? (
          <div className="bg-white text-center py-16 rounded-2xl border border-slate-200 space-y-3">
            <p className="text-base font-bold text-slate-700">Bài viết không tồn tại hoặc đã bị xóa!</p>
            <Link
              href="/"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Về trang chủ
            </Link>
          </div>
        ) : (
          <DocumentCard
            doc={post}
            currentUserId={currentUser?.id}
            currentUserPoints={profile?.points || 0}
            onDelete={() => {
              window.location.href = '/';
            }}
          />
        )}
      </div>
    </main>
  );
}