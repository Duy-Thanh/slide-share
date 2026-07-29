'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import DocumentCard from '@/components/document-card';
import AuthModal from '@/components/auth-modal';
import UploadModal from '@/components/upload-modal';
import CreatePostModal from '@/components/create-post-modal';
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
  Image as ImageIcon,
  MessageSquareText,
} from 'lucide-react';

const PAGE_SIZE = 10;

export default function HomePage() {
  // Feed Type: 'docs' hoặc 'social'
  const [feedType, setFeedType] = useState<'docs' | 'social'>('docs');

  // Feed Data States
  const [docItems, setDocItems] = useState<any[]>([]);
  const [postItems, setPostItems] = useState<any[]>([]);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<any>(null);

  // Modals State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Infinite Scroll States
  const [hasMoreDocs, setHasMoreDocs] = useState(true);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Ref khóa phanh Observer chống trigger trùng lặp (Infinite Loop Fix)
  const isFetchingRef = useRef(false);

  // Filter States cho Tab Tài Liệu
  const [search, setSearch] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('Tất cả');
  const [selectedDocType, setSelectedDocType] = useState('Tất cả');
  const [activeTab, setActiveTab] = useState<'newest' | 'popular' | 'bookmarked'>('newest');

  // Widgets Data
  const [topContributors, setTopContributors] = useState<Profile[]>([]);
  const [trendingSubjects, setTrendingSubjects] = useState<string[]>([]);

  const observerTarget = useRef<HTMLDivElement | null>(null);

  const handleSelectSubject = (subject: string) => {
    if (search.toLowerCase() === subject.toLowerCase()) {
      setSearch('');
    } else {
      setSearch(subject);
      setFeedType('docs');
      setActiveTab('newest');
      setSelectedFaculty('Tất cả');
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // 💥 FETCH TÀI LIỆU HỌC TẬP (DOCS) - FIX CHUẨN 100%
  const fetchDocs = useCallback(
    async (isFirstLoad = false) => {
      if (isFetchingRef.current) return;
      if (!isFirstLoad && !hasMoreDocs) return;

      isFetchingRef.current = true;

      if (isFirstLoad) {
        setHasMoreDocs(true);
      } else {
        setLoadingMore(true);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUid = session?.user?.id;

      let query = supabase
        .from('documents')
        .select('*, profiles(*), comments(count)')
        .order('created_at', { ascending: false });

      if (!isFirstLoad && docItems.length > 0) {
        const lastCreatedAt = docItems[docItems.length - 1].created_at;
        query = query.lt('created_at', lastCreatedAt);
      }

      query = query.limit(PAGE_SIZE);

      const { data, error } = await query;

      if (!error && data) {
        if (data.length < PAGE_SIZE) setHasMoreDocs(false);

        let formattedDocs = data.map((doc: any) => ({
          ...doc,
          post_type: 'document',
          comments_count: doc.comments?.[0]?.count || 0,
        }));

        if (currentUid && formattedDocs.length > 0) {
          const docIds = formattedDocs.map((d) => d.id);
          const [upvotesRes, bookmarksRes] = await Promise.all([
            supabase.from('upvotes').select('document_id').eq('user_id', currentUid).in('document_id', docIds),
            supabase.from('bookmarks').select('document_id').eq('user_id', currentUid).in('document_id', docIds),
          ]);

          const upvotedDocIds = new Set(upvotesRes.data?.map((u) => u.document_id));
          const bookmarkedDocIds = new Set(bookmarksRes.data?.map((b) => b.document_id));

          formattedDocs = formattedDocs.map((doc) => ({
            ...doc,
            has_upvoted: upvotedDocIds.has(doc.id),
            has_bookmarked: bookmarkedDocIds.has(doc.id),
          }));
        }

        if (isFirstLoad) {
          setDocItems(formattedDocs);
        } else {
          setDocItems((prev) => {
            const existingIds = new Set(prev.map((i) => i.id));
            const newUnique = formattedDocs.filter((i) => !existingIds.has(i.id));
            return [...prev, ...newUnique];
          });
        }
      } else {
        if (isFirstLoad) setDocItems([]);
        setHasMoreDocs(false);
      }

      setInitialLoading(false);
      setLoadingMore(false);
      isFetchingRef.current = false;
    },
    [docItems, hasMoreDocs]
  );

  // 💥 FETCH BẢNG TIN BÀI ĐĂNG (POSTS) - FIX CHUẨN 100%
  const fetchPosts = useCallback(
    async (isFirstLoad = false) => {
      if (isFetchingRef.current) return;
      if (!isFirstLoad && !hasMorePosts) return;

      isFetchingRef.current = true;

      if (isFirstLoad) {
        setHasMorePosts(true);
      } else {
        setLoadingMore(true);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUid = session?.user?.id;

      let query = supabase
        .from('posts')
        .select('*, profiles(*), comments(count)')
        .order('created_at', { ascending: false });

      if (!isFirstLoad && postItems.length > 0) {
        const lastCreatedAt = postItems[postItems.length - 1].created_at;
        query = query.lt('created_at', lastCreatedAt);
      }

      query = query.limit(PAGE_SIZE);

      const { data, error } = await query;

      if (!error && data) {
        if (data.length < PAGE_SIZE) setHasMorePosts(false);

        let formattedPosts = data.map((post: any) => ({
          ...post,
          post_type: 'post',
          title: '',
          comments_count: post.comments?.[0]?.count || 0,
        }));

        if (currentUid && formattedPosts.length > 0) {
          const postIds = formattedPosts.map((p) => p.id);
          const { data: postUpvotes } = await supabase
            .from('post_upvotes')
            .select('post_id')
            .eq('user_id', currentUid)
            .in('post_id', postIds);

          const upvotedPostIds = new Set(postUpvotes?.map((p) => p.post_id));

          formattedPosts = formattedPosts.map((post) => ({
            ...post,
            has_upvoted: upvotedPostIds.has(post.id),
          }));
        }

        if (isFirstLoad) {
          setPostItems(formattedPosts);
        } else {
          setPostItems((prev) => {
            const existingIds = new Set(prev.map((i) => i.id));
            const newUnique = formattedPosts.filter((i) => !existingIds.has(i.id));
            return [...prev, ...newUnique];
          });
        }
      } else {
        if (isFirstLoad) setPostItems([]);
        setHasMorePosts(false);
      }

      setInitialLoading(false);
      setLoadingMore(false);
      isFetchingRef.current = false;
    },
    [postItems, hasMorePosts]
  );

  // Switch Tab / Filter
  useEffect(() => {
    isFetchingRef.current = false;
    if (feedType === 'docs') {
      if (docItems.length === 0) setInitialLoading(true);
      fetchDocs(true);
    } else {
      if (postItems.length === 0) setInitialLoading(true);
      fetchPosts(true);
    }
  }, [feedType, activeTab, selectedFaculty, selectedDocType]);

  // Filter cho Tài liệu
  const filteredDocs = docItems
    .filter((doc) => {
      const matchSearch =
        doc.title?.toLowerCase().includes(search.toLowerCase()) ||
        doc.subject?.toLowerCase().includes(search.toLowerCase());
      const matchFaculty = selectedFaculty === 'Tất cả' || doc.faculty === selectedFaculty;
      const matchType = selectedDocType === 'Tất cả' || doc.doc_type === selectedDocType;
      const matchBookmarked = activeTab !== 'bookmarked' || doc.has_bookmarked;

      return matchSearch && matchFaculty && matchType && matchBookmarked;
    })
    .sort((a, b) => {
      if (activeTab === 'popular') return (b.upvotes_count || 0) - (a.upvotes_count || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const currentHasMore = feedType === 'docs' ? hasMoreDocs : hasMorePosts;
  const currentFeedList = feedType === 'docs' ? filteredDocs : postItems;

  // OBSERVER CHỦ ĐỘNG KHÓA KHI ĐANG FETCH
  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingRef.current &&
          !initialLoading
        ) {
          if (feedType === 'docs' && hasMoreDocs) {
            fetchDocs(false);
          } else if (feedType === 'social' && hasMorePosts) {
            fetchPosts(false);
          }
        }
      },
      { threshold: 0.1, rootMargin: '100px' } // Load trước khi chạm đáy 100px
    );

    observer.observe(element);
    return () => {
      if (element) observer.unobserve(element);
    };
  }, [feedType, hasMoreDocs, hasMorePosts, initialLoading, fetchDocs, fetchPosts]);

  const handlePointsChange = (newPoints: number) => {
    if (profile) setProfile({ ...profile, points: newPoints });
  };

  const handleDeleteInHome = (id: string) => {
    if (feedType === 'docs') {
      setDocItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      setPostItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleRefreshFeed = () => {
    if (feedType === 'docs') fetchDocs(true);
    else fetchPosts(true);
    fetchTopContributors();
    fetchTrendingSubjects();
  };

  return (
    <main className="min-h-screen bg-[#f0f2f5] text-slate-800" suppressHydrationWarning>
      {/* 🟢 TOPBAR */}
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
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold">
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

              <Link href="/profile" className="block text-center w-full py-2 bg-slate-100 hover:bg-blue-50 text-blue-700 font-bold text-xs rounded-xl transition-colors">
                Trang cá nhân
              </Link>
            </div>
          )}

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider px-1">Lối tắt</p>
            <button
              onClick={() => {
                setFeedType('docs');
                setActiveTab('newest');
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                feedType === 'docs' && activeTab === 'newest' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Bảng tin mới nhất</span>
            </button>

            <button
              onClick={() => {
                setFeedType('docs');
                setActiveTab('popular');
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                feedType === 'docs' && activeTab === 'popular' ? 'bg-rose-50 text-rose-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Flame className="w-4 h-4 text-rose-500" />
              <span>Đề thi & Slide Hot</span>
            </button>

            <button
              onClick={() => {
                setFeedType('docs');
                setActiveTab('bookmarked');
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                feedType === 'docs' && activeTab === 'bookmarked' ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50'
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
                  onClick={() => {
                    setFeedType('docs');
                    setSelectedFaculty(fac);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    feedType === 'docs' && selectedFaculty === fac ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
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
          {/* TAB CHÍNH */}
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1 font-bold text-xs">
            <button
              onClick={() => setFeedType('docs')}
              className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                feedType === 'docs' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Kho tài liệu</span>
            </button>

            <button
              onClick={() => setFeedType('social')}
              className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                feedType === 'social' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MessageSquareText className="w-4 h-4" />
              <span>Bảng tin</span>
            </button>
          </div>

          <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-medium">
            {['Tất cả', 'CNTT', 'Thủy Lợi', 'Công Trình', 'Kinh Tế', 'Cơ Điện', 'Môi Trường'].map((fac) => (
              <button
                key={fac}
                onClick={() => {
                  setFeedType('docs');
                  setSelectedFaculty(fac);
                }}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                  selectedFaculty === fac ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600'
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
                  if (feedType === 'social') setIsCreatePostOpen(true);
                  else setIsUploadOpen(true);
                }}
                className="flex-1 text-left px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 rounded-full text-xs font-medium text-slate-500 transition-colors cursor-pointer truncate"
              >
                {user
                  ? feedType === 'social'
                    ? `${profile?.full_name || 'Bạn'} ơi, hôm nay có gì vui không? Cùng chia sẻ nhé...`
                    : `${profile?.full_name || 'Bạn'} ơi, chia sẻ tài liệu để giúp đỡ cộng đồng nhé...`
                  : 'Đăng nhập để đăng bài và chia sẻ tài liệu nhé!'}
              </button>
            </div>

            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-around text-xs font-bold text-slate-600">
              <button
                onClick={() => {
                  if (!user) return setIsAuthOpen(true);
                  setIsCreatePostOpen(true);
                }}
                className="flex items-center gap-2 hover:bg-indigo-50 px-3 py-1.5 rounded-xl text-indigo-600 transition-colors cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-indigo-500" />
                <span>Đăng bài & Ảnh/Video</span>
              </button>

              <button
                onClick={() => {
                  if (!user) return setIsAuthOpen(true);
                  setIsUploadOpen(true);
                }}
                className="flex items-center gap-2 hover:bg-blue-50 px-3 py-1.5 rounded-xl text-blue-600 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Đăng tài liệu (+20đ)</span>
              </button>
            </div>
          </div>

          {/* BỘ LỌC TABS (CHỈ HIỆN KHI Ở TAB TÀI LIỆU) */}
          {feedType === 'docs' && (
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
          )}

          {/* FEED HÀNG HÓA */}
          <div className="space-y-4">
            {initialLoading ? (
              <div className="bg-white text-center py-12 rounded-2xl border border-slate-200 text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span>Đang tải bài viết...</span>
              </div>
            ) : (
              currentFeedList.map((item, idx) => (
                <DocumentCard
                  key={`${item.post_type || 'item'}-${item.id}-${idx}`}
                  doc={item}
                  currentUserId={user?.id}
                  currentUserPoints={profile?.points || 0}
                  onDelete={handleDeleteInHome}
                  onPointsChange={handlePointsChange}
                />
              ))
            )}

            {!initialLoading && currentFeedList.length === 0 && (
              <div className="bg-white text-center py-12 rounded-2xl border border-slate-200 text-slate-400 text-xs font-semibold space-y-2">
                <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
                <p>{feedType === 'docs' ? 'Chưa có tài liệu nào thuộc mục này.' : 'Chưa có bài viết chém gió nào.'}</p>
              </div>
            )}

            {/* OBSERVER LOAD MORE */}
            <div ref={observerTarget} className="py-4 text-center min-h-[40px]">
              {loadingMore && (
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Đang tải thêm...</span>
                </div>
              )}
              {!currentHasMore && currentFeedList.length > 0 && (
                <p className="text-[11px] text-slate-400 font-semibold">🎉 Đã hiển thị toàn bộ bài viết mục này!</p>
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
            CURRENTLY IN BETA TESTING! INTERFACE AND FEATURES ARE SUBJECT TO CONSTANT CHANGE!
          </p>

          <p className="text-[10px] text-slate-400 text-center font-medium">
            © {new Date().getFullYear()} CyberDay Studios Publishing • All right reserved
          </p>
        </aside>
      </div>

      {/* MODALS */}
      {user && (
        <>
          <UploadModal
            isOpen={isUploadOpen}
            onClose={() => setIsUploadOpen(false)}
            userId={user.id}
            userPoints={profile?.points || 0}
            onUploadSuccess={handleRefreshFeed}
          />

          <CreatePostModal
            isOpen={isCreatePostOpen}
            onClose={() => setIsCreatePostOpen(false)}
            userId={user.id}
            onPostSuccess={handleRefreshFeed}
          />
        </>
      )}

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </main>
  );
}