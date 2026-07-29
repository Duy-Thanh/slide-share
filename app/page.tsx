'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DocumentItem, Profile } from '@/types/database';
import DocumentCard from '@/components/document-card';
import AuthModal from '@/components/auth-modal';
import UploadModal from '@/components/upload-modal';
import UserAvatar from '@/components/user-avatar';
import FriendButton from '@/components/friend-button';
import Link from 'next/link';
import FriendRequestsPopover from '@/components/friend-requests-popover';
import UserBadge from '@/components/user-badge';
import ChatListPopover from '@/components/chat-list-popover';
import {
  Search,
  LogIn,
  LogOut,
  Coins,
  PlusCircle,
  Bookmark,
  Flame,
  Sparkles,
  Award,
  TrendingUp,
  BookOpen,
  X,
  Loader2,
} from 'lucide-react';

const PAGE_SIZE = 10; // Mỗi lần load đúng 10 bài để cứu RAM

export default function HomePage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // States cho Infinite Scroll
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('Tất cả');
  const [selectedDocType, setSelectedDocType] = useState('Tất cả');
  const [activeTab, setActiveTab] = useState<'newest' | 'popular' | 'bookmarked'>('newest');

  // Widgets Data
  const [topContributors, setTopContributors] = useState<Profile[]>([]);
  const [trendingSubjects, setTrendingSubjects] = useState<string[]>([]);

  // Observer Element Ref
  const observerTarget = useRef<HTMLDivElement | null>(null);

  // Handle click Hashtag Môn Học
  const handleSelectSubject = (subject: string) => {
    if (search.toLowerCase() === subject.toLowerCase()) {
      setSearch('');
    } else {
      setSearch(subject);
      setActiveTab('newest');
      setSelectedFaculty('Tất cả');

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  const fetchTrendingSubjects = async () => {
    const { data } = await supabase.from('documents').select('subject');
    if (data && data.length > 0) {
      const counts: Record<string, number> = {};
      data.forEach((item) => {
        const subj = item.subject?.trim();
        if (subj) counts[subj] = (counts[subj] || 0) + 1;
      });

      const sortedSubjects = Object.keys(counts)
        .sort((a, b) => counts[b] - counts[a])
        .slice(0, 6);

      setTrendingSubjects(sortedSubjects);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    fetchTopContributors();
    fetchTrendingSubjects();
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  };

  const fetchTopContributors = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('points', { ascending: false })
      .limit(5);
    if (data) setTopContributors(data);
  };

  // 💥 HÀM LOAD BÀI VIẾT PHÂN TRANG (PAGINATION / INFINITE SCROLL)
  const fetchDocuments = useCallback(
    async (isFirstLoad = false) => {
      if (loadingMore || (!hasMore && !isFirstLoad)) return;

      if (isFirstLoad) {
        setInitialLoading(true);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUid = session?.user?.id;

      // Xây dựng Query
      let query = supabase
        .from('documents')
        .select('*, profiles(*), comments(count)')
        .order('created_at', { ascending: false });

      // Nếu không phải lần load đầu tiên, lấy bài có created_at nhỏ hơn bài cuối cùng hiện tại
      if (!isFirstLoad && documents.length > 0) {
        const lastDocCreatedAt = documents[documents.length - 1].created_at;
        query = query.lt('created_at', lastDocCreatedAt);
      }

      query = query.limit(PAGE_SIZE);

      const { data, error } = await query;

      if (!error && data) {
        if (data.length < PAGE_SIZE) {
          setHasMore(false); // Hết bài để load
        }

        let docsFormatted = data.map((doc: any) => ({
          ...doc,
          comments_count: doc.comments?.[0]?.count || 0,
        }));

        if (currentUid && docsFormatted.length > 0) {
          const docIds = docsFormatted.map((d) => d.id);
          const [upvotesRes, bookmarksRes] = await Promise.all([
            supabase.from('upvotes').select('document_id').eq('user_id', currentUid).in('document_id', docIds),
            supabase.from('bookmarks').select('document_id').eq('user_id', currentUid).in('document_id', docIds),
          ]);

          const upvotedDocIds = new Set(upvotesRes.data?.map((u) => u.document_id));
          const bookmarkedDocIds = new Set(bookmarksRes.data?.map((b) => b.document_id));

          docsFormatted = docsFormatted.map((doc) => ({
            ...doc,
            has_upvoted: upvotedDocIds.has(doc.id),
            has_bookmarked: bookmarkedDocIds.has(doc.id),
          }));
        }

        if (isFirstLoad) {
          setDocuments(docsFormatted);
        } else {
          setDocuments((prev) => [...prev, ...docsFormatted]);
        }
      }

      setInitialLoading(false);
      setLoadingMore(false);
    },
    [documents, loadingMore, hasMore]
  );

  // Load trang đầu tiên khi đổi Tab/Filter
  useEffect(() => {
    fetchDocuments(true);
  }, [activeTab, selectedFaculty, selectedDocType]);

  // 💥 INTERSECTION OBSERVER BẮT SỰ KIỆN CUỘN XUỐNG ĐÍT TRANG
  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !initialLoading) {
          fetchDocuments(false);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(element);
    return () => {
      if (element) observer.unobserve(element);
    };
  }, [fetchDocuments, hasMore, loadingMore, initialLoading]);

  const handlePointsChange = (newPoints: number) => {
    if (profile) setProfile({ ...profile, points: newPoints });
  };

  const handleDeleteInHome = (docId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
  };

  const handleUploadSuccess = (newPoints: number) => {
    handlePointsChange(newPoints);
    fetchDocuments(true);
    fetchTopContributors();
    fetchTrendingSubjects();
  };

  // Filter Client side đối với bài đã load
  const filteredDocs = documents
    .filter((doc) => {
      const matchSearch =
        doc.title.toLowerCase().includes(search.toLowerCase()) ||
        doc.subject.toLowerCase().includes(search.toLowerCase());
      const matchFaculty = selectedFaculty === 'Tất cả' || doc.faculty === selectedFaculty;
      const matchType = selectedDocType === 'Tất cả' || doc.doc_type === selectedDocType;
      const matchBookmarked = activeTab !== 'bookmarked' || doc.has_bookmarked;

      return matchSearch && matchFaculty && matchType && matchBookmarked;
    })
    .sort((a, b) => {
      if (activeTab === 'popular') return (b.upvotes_count || 0) - (a.upvotes_count || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <main className="min-h-screen bg-[#f0f2f5] text-slate-800" suppressHydrationWarning>
      {/* 🟢 TOPBAR NAVIGATION RESPONSIVE */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs px-2 sm:px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-4">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <img src="/logo-tlu.png" alt="TLU Logo" className="h-7 sm:h-9 w-auto object-contain" />
            <span className="font-extrabold text-base sm:text-xl bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent tracking-tight hidden xs:inline">
              TLU Social
            </span>
          </Link>

          <div className="flex-1 max-w-md relative hidden md:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm kiếm môn học, đề thi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-full text-xs outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-full md:hidden cursor-pointer"
              title="Tìm kiếm"
            >
              {showMobileSearch ? <X className="w-4 h-4 text-slate-500" /> : <Search className="w-4 h-4" />}
            </button>

            {user && profile ? (
              <>
                <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-300/60 rounded-full text-amber-700 text-[11px] font-bold">
                  <Coins className="w-3.5 h-3.5 text-amber-500 animate-bounce shrink-0" />
                  <span>{profile.points}</span>
                </div>

                <Link href="/profile" className="flex items-center gap-1 hover:opacity-90 transition-opacity">
                  <UserAvatar src={profile.avatar_url} name={profile.full_name} size="sm" className="ring-1 ring-blue-500/30" />
                  <div className="hidden lg:flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-700">{profile.full_name || 'thanhdz167'}</span>
                    <UserBadge badge={profile.badge} size="sm" />
                  </div>
                </Link>

                <ChatListPopover currentUserId={user?.id} />
                <FriendRequestsPopover currentUserId={user?.id} />

                <button
                  onClick={() => supabase.auth.signOut()}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" /> <span>Đăng nhập</span>
              </button>
            )}
          </div>
        </div>

        {showMobileSearch && (
          <div className="mt-2 md:hidden animate-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                autoFocus
                placeholder="Tìm kiếm môn học, đề thi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-100 border-none rounded-full text-xs outline-none focus:ring-2 focus:ring-blue-500/50 font-medium"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* CONTAINER CHÍNH */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 items-start">
        
        {/* CỘT 1: LEFT SIDEBAR */}
        <aside className="hidden md:block space-y-4 sticky top-20 h-fit">
          {user && profile && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <UserAvatar src={profile.avatar_url} name={profile.full_name} size="lg" />
                <div className="truncate min-w-0">
                  <div className="flex items-center gap-1 truncate">
                    <p className="font-bold text-sm text-slate-800 truncate">{profile.full_name || 'Sinh viên TLU'}</p>
                    <UserBadge badge={profile.badge} size="sm" />
                  </div>
                  <p className="text-xs text-slate-500 truncate">{profile.faculty ? `Khoa ${profile.faculty}` : 'Chưa cập nhật Khoa'}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Kho Coins:</span>
                <span className="text-amber-600 font-bold">{profile.points} 🪙</span>
              </div>

              <Link
                href="/profile"
                className="block text-center w-full py-2 bg-slate-100 hover:bg-blue-50 text-blue-700 font-bold text-xs rounded-xl transition-colors"
              >
                Trang cá nhân
              </Link>
            </div>
          )}

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider px-1">Lối tắt</p>

            <button
              onClick={() => setActiveTab('newest')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'newest' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Bảng tin mới nhất</span>
            </button>

            <button
              onClick={() => setActiveTab('popular')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'popular' ? 'bg-rose-50 text-rose-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Flame className="w-4 h-4 text-rose-500" />
              <span>Đề thi & Slide Hot</span>
            </button>

            <button
              onClick={() => setActiveTab('bookmarked')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'bookmarked' ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Bookmark className="w-4 h-4 text-amber-500" />
              <span>Bài viết đã lưu</span>
            </button>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider px-1">Các Khoa TLU</p>
            <div className="space-y-1">
              {['Tất cả', 'CNTT', 'Thủy Lợi', 'Công Trình', 'Kinh Tế', 'Cơ Điện', 'Môi Trường'].map((fac) => (
                <button
                  key={fac}
                  onClick={() => setSelectedFaculty(fac)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    selectedFaculty === fac ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {fac === 'Tất cả' ? '🌐 Tất cả các Khoa' : `🎓 Khoa ${fac}`}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* CỘT 2 & 3: MAIN FEED */}
        <section className="md:col-span-2 space-y-4 min-w-0">
          
          <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-medium">
            {['Tất cả', 'CNTT', 'Thủy Lợi', 'Công Trình', 'Kinh Tế', 'Cơ Điện', 'Môi Trường'].map((fac) => (
              <button
                key={fac}
                onClick={() => setSelectedFaculty(fac)}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                  selectedFaculty === fac
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                {fac === 'Tất cả' ? '🌐 Tất cả Khoa' : fac}
              </button>
            ))}
          </div>

          {/* KHUNG TẠO BÀI VIẾT */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <UserAvatar src={profile?.avatar_url} name={profile?.full_name} size="md" />
              <button
                onClick={() => {
                  if (!user) return setIsAuthOpen(true);
                  setIsUploadOpen(true);
                }}
                className="flex-1 text-left px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 rounded-full text-xs font-medium text-slate-500 transition-colors cursor-pointer truncate"
              >
                {user ? `${profile?.full_name || 'Mày'} ơi, chia sẻ slide / đề thi (+20đ)...` : 'Đăng nhập để đăng đề thi & tích điểm...'}
              </button>
            </div>

            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-around text-xs font-bold text-slate-600">
              <button
                onClick={() => {
                  if (!user) return setIsAuthOpen(true);
                  setIsUploadOpen(true);
                }}
                className="flex items-center gap-2 hover:bg-blue-50 px-3 py-1.5 rounded-xl text-blue-600 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>Đăng tài liệu</span>
              </button>

              <button
                onClick={() => {
                  if (!user) return setIsAuthOpen(true);
                  setIsUploadOpen(true);
                }}
                className="flex items-center gap-2 hover:bg-amber-50 px-3 py-1.5 rounded-xl text-amber-600 transition-colors cursor-pointer"
              >
                <Coins className="w-4 h-4 shrink-0" />
                <span>Nhận +20 Coins</span>
              </button>
            </div>
          </div>

          {/* BỘ LỌC TABS */}
          <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-xs text-xs font-bold overflow-x-auto no-scrollbar gap-2">
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setActiveTab('newest')}
                className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap text-xs cursor-pointer ${
                  activeTab === 'newest' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Mới nhất
              </button>

              <button
                onClick={() => setActiveTab('popular')}
                className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap text-xs cursor-pointer ${
                  activeTab === 'popular' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                🔥 Môn Hot
              </button>

              {user && (
                <button
                  onClick={() => setActiveTab('bookmarked')}
                  className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap text-xs cursor-pointer ${
                    activeTab === 'bookmarked' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Bookmark
                </button>
              )}
            </div>

            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="bg-slate-100 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 outline-none shrink-0 cursor-pointer"
            >
              <option value="Tất cả">Tất cả loại tài liệu</option>
              <option value="Slide">Slide bài giảng</option>
              <option value="Đề thi">Đề thi / Đáp án</option>
              <option value="Đồ án">Đồ án mẫu</option>
              <option value="Đề cương">Đề cương</option>
            </select>
          </div>

          {/* BẢNG TIN BÀI VIẾT FEED */}
          <div className="space-y-4">
            {initialLoading ? (
              <div className="bg-white text-center py-12 rounded-2xl border border-slate-200 text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span>Đang tải bảng tin...</span>
              </div>
            ) : (
              filteredDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  currentUserId={user?.id}
                  currentUserPoints={profile?.points || 0}
                  onDelete={handleDeleteInHome}
                  onPointsChange={handlePointsChange}
                />
              ))
            )}

            {!initialLoading && filteredDocs.length === 0 && (
              <div className="bg-white text-center py-12 rounded-2xl border border-slate-200 text-slate-400 text-xs font-semibold space-y-2">
                <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
                <p>Chưa có tài liệu nào thuộc mục này.</p>
              </div>
            )}

            {/* 💥 VÙNG OBSERVER BẮT SỰ KIỆN SCROLL ĐỂ LOAD THÊM 10 BÀI */}
            <div ref={observerTarget} className="py-4 text-center">
              {loadingMore && (
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Đang tải thêm bài viết...</span>
                </div>
              )}
              {!hasMore && documents.length > 0 && (
                <p className="text-[11px] text-slate-400 font-semibold">🎉 Đã tải hết bài viết rồi con vợ!</p>
              )}
            </div>
          </div>
        </section>

        {/* CỘT 4: RIGHT SIDEBAR */}
        <aside className="hidden md:block space-y-4 sticky top-20 h-fit">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-amber-600 font-extrabold text-xs uppercase tracking-wider">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Top Đóng Góp TLU</span>
            </div>

            <div className="space-y-2.5">
              {topContributors.map((userItem, idx) => (
                <div key={userItem.id} className="flex items-center justify-between text-xs group">
                  <Link
                    href={userItem.id === user?.id ? '/profile' : `/profile/${userItem.id}`}
                    className="flex items-center gap-2 truncate flex-1 mr-2 min-w-0"
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${
                        idx === 0
                          ? 'bg-amber-400 text-white'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-700'
                          : idx === 2
                          ? 'bg-amber-700/60 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <UserAvatar src={userItem.avatar_url} name={userItem.full_name} size="sm" />
                    
                    <div className="flex items-center gap-1 truncate min-w-0">
                      <span className="font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                        {userItem.full_name || 'Sinh viên TLU'}
                      </span>
                      <UserBadge badge={userItem.badge} size="sm" />
                    </div>
                  </Link>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-extrabold text-amber-600 text-[11px]">{userItem.points} 🪙</span>
                    <FriendButton currentUserId={user?.id} targetUserId={userItem.id} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-blue-600 font-extrabold text-xs uppercase tracking-wider">
              <TrendingUp className="w-4 h-4" />
              <span>Môn Học Phổ Biến</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {trendingSubjects.length > 0 ? (
                trendingSubjects.map((subject) => (
                  <button
                    key={subject}
                    onClick={() => handleSelectSubject(subject)}
                    className={`px-2.5 py-1 font-bold text-[11px] rounded-lg transition-all cursor-pointer ${
                      search.toLowerCase() === subject.toLowerCase()
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600'
                    }`}
                  >
                    #{subject}
                  </button>
                ))
              ) : (
                <p className="text-[11px] text-slate-400 font-medium">Chưa có dữ liệu môn học.</p>
              )}
            </div>
          </div>

          <p className="text-[10px] text-slate-400 text-center font-medium">
            © {new Date().getFullYear()} CyberDay Studios • Được phát triển cho SV Thủy Lợi
          </p>
        </aside>
      </div>

      {user && (
        <UploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          userId={user.id}
          userPoints={profile?.points || 0}
          onUploadSuccess={handleUploadSuccess}
        />
      )}

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </main>
  );
}