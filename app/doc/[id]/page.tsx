'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import DocumentCard from '@/components/document-card';
import Link from 'next/link';
import { ArrowLeft, Loader2, BookOpen, ShieldAlert } from 'lucide-react';

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: docId } = use(params);

  const [doc, setDoc] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) setProfile(data);
          });
      }
    });

    fetchDocDetail();
  }, [docId]);

  const fetchDocDetail = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('documents')
      .select('*, profiles(*), comments(count)')
      .eq('id', docId)
      .single();

    // 💥 CHẶN NGAY: NẾU KHÔNG CÓ DỮ LIỆU HOẶC NGƯỜI ĐĂNG TÀI LIỆU ĐÃ BỊ BAN
    if (error || !data || data.profiles?.is_banned) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let formattedDoc = {
      ...data,
      post_type: 'document',
      comments_count: data.comments?.[0]?.count || 0,
    };

    const { data: sessionData } = await supabase.auth.getSession();
    const currentUid = sessionData?.session?.user?.id;

    if (currentUid) {
      const [upvoteRes, bookmarkRes] = await Promise.all([
        supabase
          .from('upvotes')
          .select('id')
          .eq('document_id', docId)
          .eq('user_id', currentUid)
          .single(),
        supabase
          .from('bookmarks')
          .select('id')
          .eq('document_id', docId)
          .eq('user_id', currentUid)
          .single(),
      ]);

      formattedDoc.has_upvoted = !!upvoteRes.data;
      formattedDoc.has_bookmarked = !!bookmarkRes.data;
    }

    setDoc(formattedDoc);
    setLoading(false);
  };

  const handlePointsChange = (newPoints: number) => {
    if (profile) setProfile({ ...profile, points: newPoints });
  };

  return (
    <main className="min-h-screen bg-[#f0f2f5] text-slate-800 py-6 px-2 sm:px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header Navigation */}
        <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Trang chủ</span>
          </Link>
          <span className="text-xs font-extrabold text-blue-600 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" /> Tài liệu TLU
          </span>
        </div>

        {/* Detail Document View */}
        {loading ? (
          <div className="bg-white text-center py-16 rounded-2xl border border-slate-200 text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>Đang tải tài liệu...</span>
          </div>
        ) : notFound || !doc ? (
          <div className="bg-white text-center py-16 px-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <p className="text-base font-bold text-slate-800">
              Tài liệu không tồn tại hoặc đã bị xóa!
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tài liệu này có thể đã bị gỡ bởi tác giả hoặc tài khoản đóng góp đã bị khóa do vi phạm quy định hệ thống.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-md shadow-blue-500/20"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        ) : (
          <DocumentCard
            doc={doc}
            currentUserId={currentUser?.id}
            currentUserPoints={profile?.points || 0}
            onPointsChange={handlePointsChange}
            onDelete={() => {
              window.location.href = '/';
            }}
          />
        )}
      </div>
    </main>
  );
}