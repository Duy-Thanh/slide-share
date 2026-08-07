'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { supabase } from '@/lib/supabase';
import { DocumentItem, Profile } from '@/types/database';
import DocumentCard from '@/components/document-card';
import { Coins, Folder, ArrowLeft, Users, Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import UserAvatar from '@/components/user-avatar';
import UserBadge from '@/components/user-badge';
import FriendButton from '@/components/friend-button';
import FriendListModal from '@/components/friend-list-modal';
import MessageButton from '@/components/message-button';

const PAGE_SIZE = 10;

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const targetUserId = resolvedParams.id;
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [currentUserPoints, setCurrentUserPoints] = useState<number>(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userDocs, setUserDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBannedUser, setIsBannedUser] = useState(false);
  const [isFriendListOpen, setIsFriendListOpen] = useState(false);

  // States cho Infinite Scroll
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Ref phanh chống gọi API trùng lặp
  const isFetchingRef = useRef(false);
  const observerTarget = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchProfileHeader();
    fetchUserDocs(true);
  }, [targetUserId]);

  // 1. Fetch thông tin Profile header & Check BANNED STATUS
  const fetchProfileHeader = async () => {
    setLoading(true);

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

    const { data: profData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single();

    // 💥 NẾU PROFILE BỊ BAN HOẶC KHÔNG TỒN TẠI -> ĐÁNH DẤU BANNED
    if (error || !profData || profData.is_banned) {
      setIsBannedUser(true);
      setProfile(null);
    } else {
      setIsBannedUser(false);
      setProfile(profData);
    }

    setLoading(false);
  };

  // 2. Fetch tài liệu phân trang
  const fetchUserDocs = useCallback(
    async (isFirstLoad = false) => {
      if (isFetchingRef.current || isBannedUser) return;
      if (!isFirstLoad && !hasMore) return;

      isFetchingRef.current = true;

      if (isFirstLoad) {
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      let query = supabase
        .from('documents')
        .select('*, profiles(*), comments(count)')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (!isFirstLoad && userDocs.length > 0) {
        const lastCreatedAt = userDocs[userDocs.length - 1].created_at;
        query = query.lt('created_at', lastCreatedAt);
      }

      query = query.limit(PAGE_SIZE);

      const { data: docsData, error } = await query;

      if (!error && docsData) {
        if (docsData.length < PAGE_SIZE) {
          setHasMore(false);
        }

        let formattedDocs = docsData.map((doc: any) => ({
          ...doc,
          comments_count: doc.comments?.[0]?.count || 0,
        }));

        if (session?.user?.id && formattedDocs.length > 0) {
          const docIds = formattedDocs.map((d) => d.id);
          const [upvotesRes, bookmarksRes] = await Promise.all([
            supabase
              .from('upvotes')
              .select('document_id')
              .eq('user_id', session.user.id)
              .in('document_id', docIds),
            supabase
              .from('bookmarks')
              .select('document_id')
              .eq('user_id', session.user.id)
              .in('document_id', docIds),
          ]);

          const myUpvotedIds = new Set(upvotesRes.data?.map((u) => u.document_id) || []);
          const myBookmarkedIds = new Set(bookmarksRes.data?.map((b) => b.document_id) || []);

          formattedDocs = formattedDocs.map((doc) => ({
            ...doc,
            has_upvoted: myUpvotedIds.has(doc.id),
            has_bookmarked: myBookmarkedIds.has(doc.id),
          }));
        }

        if (isFirstLoad) {
          const uniqueDocs = Array.from(new Map(formattedDocs.map((d: any) => [d.id, d])).values());
          setUserDocs(uniqueDocs as DocumentItem[]);
        } else {
          setUserDocs((prev) => {
            const combined = [...prev, ...formattedDocs];
            const uniqueDocs = Array.from(new Map(combined.map((d) => [d.id, d])).values());
            return uniqueDocs as DocumentItem[];
          });
        }
      } else {
        if (isFirstLoad) setUserDocs([]);
        setHasMore(false);
      }

      setLoadingMore(false);
      isFetchingRef.current = false;
    },
    [targetUserId, userDocs, hasMore, isBannedUser]
  );

  // 3. Intersection Observer
  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingRef.current && !loading && !isBannedUser) {
          fetchUserDocs(false);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(element);
    return () => {
      if (element) observer.unobserve(element);
    };
  }, [fetchUserDocs, hasMore, loading, isBannedUser]);

  const handleDeleteInPublic = (docId: string) => {
    setUserDocs((prev) => prev.filter((doc) => doc.id !== docId));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm font-semibold gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <span>Đang tải trang cá nhân...</span>
      </div>
    );
  }

  // 💥 XỬ LÝ KHI TÀI KHOẢN BỊ BAN HOẶC KHÔNG TỒN TẠI
  if (isBannedUser || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center space-y-4 text-center">
        <div className="p-3 bg-rose-100 rounded-full text-rose-600">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900">Tài khoản không khả dụng</h2>
        <p className="text-xs text-slate-500 max-w-sm">
          Tài khoản sinh viên này không tồn tại hoặc đã bị khóa do vi phạm quy định cộng đồng
        </p>
        <Link
          href="/"
          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
        >
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        {/* Nút Quay Lại Trang Chủ */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại trang chủ
        </Link>

        {/* Card Header Profile Công Khai */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full sm:w-auto">
            <UserAvatar
              src={profile.avatar_url}
              name={profile.full_name}
              size="lg"
              className="ring-4 ring-blue-50 shrink-0"
            />
            <div className="space-y-1 min-w-0 flex-1">
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

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-start sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            {currentUserId && (
              <FriendButton currentUserId={currentUserId} targetUserId={targetUserId} />
            )}

            {profile && currentUserId && (
              <MessageButton targetUser={profile} currentUserId={currentUserId} variant="full" />
            )}

            <button
              onClick={() => setIsFriendListOpen(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-slate-200/80 cursor-pointer"
            >
              <Users className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="hidden xs:inline">Danh sách bạn bè</span>
              <span className="xs:hidden">Bạn bè</span>
            </button>

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
            userDocs.map((doc, idx) => (
              <DocumentCard
                key={`${doc.id}-${idx}`}
                doc={doc}
                currentUserId={currentUserId}
                currentUserPoints={currentUserPoints}
                onDelete={handleDeleteInPublic}
                onPointsChange={(newPoints) => setCurrentUserPoints(newPoints)}
              />
            ))
          )}

          {/* Vùng Observer Bắt Cuộn Trang */}
          <div ref={observerTarget} className="py-4 text-center min-h-[40px]">
            {loadingMore && (
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Đang tải thêm bài viết...</span>
              </div>
            )}
            {!hasMore && userDocs.length > 0 && (
              <p className="text-[11px] text-slate-400 font-semibold">🎉 Đã hiển thị toàn bộ bài đóng góp!</p>
            )}
          </div>
        </div>
      </div>

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