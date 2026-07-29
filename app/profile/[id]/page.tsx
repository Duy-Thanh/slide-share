'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { DocumentItem, Profile } from '@/types/database';
import DocumentCard from '@/components/document-card';
import { Coins, Folder, ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import UserAvatar from '@/components/user-avatar';
import UserBadge from '@/components/user-badge';
import FriendButton from '@/components/friend-button';
import FriendListModal from '@/components/friend-list-modal';
import MessageButton from '@/components/message-button';

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const targetUserId = resolvedParams.id;

  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [currentUserPoints, setCurrentUserPoints] = useState<number>(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userDocs, setUserDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFriendListOpen, setIsFriendListOpen] = useState(false);

  useEffect(() => {
    fetchPublicProfile();
  }, [targetUserId]);

  const fetchPublicProfile = async () => {
    setLoading(true);

    // 1. Lấy thông tin user hiện tại
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      setCurrentUserId(session.user.id);
      const { data: myProf } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', session.user.id)
        .single();
      if (myProf) setCurrentUserPoints(myProf.points || 0);
    }

    // 2. Lấy thông tin Profile của người được xem
    const { data: profData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (profData) {
      setProfile(profData);
    }

    // 3. Lấy danh sách tài liệu người này đã đăng
    const { data: docsData } = await supabase
      .from('documents')
      .select('*, profiles(*), comments(count)')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (docsData) {
      let formattedDocs = docsData.map((doc: any) => ({
        ...doc,
        comments_count: doc.comments?.[0]?.count || 0,
      }));

      if (session?.user?.id) {
        const [upvotesRes, bookmarksRes] = await Promise.all([
          supabase.from('upvotes').select('document_id').eq('user_id', session.user.id),
          supabase.from('bookmarks').select('document_id').eq('user_id', session.user.id),
        ]);

        const myUpvotedIds = new Set(upvotesRes.data?.map((u) => u.document_id) || []);
        const myBookmarkedIds = new Set(bookmarksRes.data?.map((b) => b.document_id) || []);

        formattedDocs = formattedDocs.map((doc) => ({
          ...doc,
          has_upvoted: myUpvotedIds.has(doc.id),
          has_bookmarked: myBookmarkedIds.has(doc.id),
        }));
      }

      setUserDocs(formattedDocs);
    }

    setLoading(false);
  };

  const handleDeleteInPublic = (docId: string) => {
    setUserDocs((prev) => prev.filter((doc) => doc.id !== docId));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
        Đang tải trang cá nhân...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center space-y-4">
        <p className="text-sm text-slate-500">Không tìm thấy sinh viên này.</p>
        <Link href="/" className="text-xs text-blue-600 font-bold hover:underline">
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-8 overflow-x-hidden">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        {/* Nút Quay Lại Trang Chủ */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại trang chủ
        </Link>

        {/* Card Header Profile Công Khai (Fixed Responsive) */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full sm:w-auto">
            <UserAvatar
              src={profile.avatar_url}
              name={profile.full_name}
              size="lg"
              className="ring-4 ring-blue-50 shrink-0"
            />
            <div className="space-y-1 min-w-0 flex-1">
              {/* TÊN HỌ + BADGE TÍCH UY TÍN */}
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                  {profile.full_name || 'Sinh viên TLU'}
                </h2>
                <UserBadge badge={profile.badge} size="md" />
              </div>

              <p className="text-xs text-slate-500 truncate">
                {profile.class_name ? `Lớp ${profile.class_name}` : 'Chưa cập nhật lớp'} • Khoa{' '}
                {profile.faculty || 'CNTT'}
              </p>
              {profile.student_code && (
                <p className="text-[11px] text-slate-400 font-mono">MSV: {profile.student_code}</p>
              )}
            </div>
          </div>

          {/* Cụm Nút Thao Tác (Responsive Flexbox) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-start sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            {/* NÚT KẾT BẠN */}
            {currentUserId && (
              <FriendButton currentUserId={currentUserId} targetUserId={targetUserId} />
            )}

            {/* NÚT NHẮN TIN */}
            {profile && currentUserId && (
              <MessageButton targetUser={profile} currentUserId={currentUserId} variant="full" />
            )}

            {/* NÚT XEM DANH SÁCH BẠN BÈ */}
            <button
              onClick={() => setIsFriendListOpen(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-slate-200/80 cursor-pointer"
            >
              <Users className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="hidden xs:inline">Danh sách bạn bè</span>
              <span className="xs:hidden">Bạn bè</span>
            </button>

            {/* TLU-COINS */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs sm:text-sm font-bold">
              <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 animate-bounce shrink-0" />
              <span>{profile.points || 0} Coins</span>
            </div>
          </div>
        </div>

        {/* Header Tiêu Đề Danh Sách Bài Đăng */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 font-bold text-slate-800 text-sm">
          <Folder className="w-4 h-4 text-blue-600" />
          <span>Tài Liệu Đã Đóng Góp ({userDocs.length})</span>
        </div>

        {/* Feed Danh Sách Tài Liệu Của User Này */}
        <div className="space-y-3 sm:space-y-4">
          {userDocs.length === 0 ? (
            <div className="bg-white text-center py-12 rounded-2xl border border-slate-200 text-slate-400 text-xs">
              Sinh viên này chưa đóng góp tài liệu nào.
            </div>
          ) : (
            userDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                currentUserId={currentUserId}
                currentUserPoints={currentUserPoints}
                onDelete={handleDeleteInPublic}
                onPointsChange={(newPoints) => setCurrentUserPoints(newPoints)}
              />
            ))
          )}
        </div>
      </div>

      {/* MODAL XEM DANH SÁCH BẠN BÈ CỦA USER NÀY */}
      {profile && (
        <FriendListModal
          userId={profile.id}
          isOpen={isFriendListOpen}
          onClose={() => setIsFriendListOpen(false)}
        />
      )}
    </main>
  );
}