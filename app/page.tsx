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
import BetaBanner from '@/components/beta-banner';
import { toast } from 'sonner';
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
  MessageCircle,
  UserPlus,
  ShieldCheck
} from 'lucide-react';

const PAGE_SIZE = 10;

export default function HomePage() {
  const [feedType, setFeedType] = useState<'docs' | 'social'>('docs');

  const [docItems, setDocItems] = useState<any[]>([]);
  const [postItems, setPostItems] = useState<any[]>([]);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<any>(null);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const [hasMoreDocs, setHasMoreDocs] = useState(true);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const isFetchingRef = useRef(false);

  const [search, setSearch] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('Tất cả');
  const [selectedDocType, setSelectedDocType] = useState('Tất cả');
  const [activeTab, setActiveTab] = useState<'newest' | 'popular' | 'bookmarked'>('newest');

  const [topContributors, setTopContributors] = useState<Profile[]>([]);
  const [trendingSubjects, setTrendingSubjects] = useState<string[]>([]);

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [isBottomMenuOpen, setIsBottomMenuOpen] = useState(false);
  const bottomMenuRef = useRef<HTMLDivElement>(null);

  const [pendingFriendRequestsCount, setPendingFriendRequestsCount] = useState(0);

  const observerTarget = useRef<HTMLDivElement | null>(null);

  const handleSignOut = async () => {
    setIsProfileMenuOpen(false);
    setIsBottomMenuOpen(false);

    if (user?.id) {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
    }
    await supabase.auth.signOut();
  };

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

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bottomMenuRef.current && !bottomMenuRef.current.contains(event.target as Node)) {
        setIsBottomMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Friend requests count
  useEffect(() => {
    if (!user?.id) return;

    const fetchFriendRequestsCount = async () => {
      const { count } = await supabase
        .from('friends')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      setPendingFriendRequestsCount(count || 0);
    };

    fetchFriendRequestsCount();

    const handleUpdate = () => fetchFriendRequestsCount();
    window.addEventListener('friendshipUpdated', handleUpdate);

    return () => {
      window.removeEventListener('friendshipUpdated', handleUpdate);
    };
  }, [user?.id]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      if (data.is_banned) {
        toast.error('Tài khoản bị khóa vĩnh viễn!', { description: 'Bạn đã bị cấm truy cập hệ thống.' });
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        return;
      }
      setProfile(data);
    }
  };

  const fetchTopContributors = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_banned', false)
      .order('points', { ascending: false })
      .limit(5);

    if (data) {
      setTopContributors([...data]);
    }
  }, []);

  // 💥 HÀM FETCH DOCS CHUẨN - KHÔNG GÂY TÁC DỤNG PHỤ RE-RENDER
  const fetchDocs = useCallback(async (isFirstLoad = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isFirstLoad) {
      setHasMoreDocs(true);
      setInitialLoading(true);
    } else {
      setLoadingMore(true);
    }

    const { data: { session } } = await supabase.auth.getSession();
    const currentUid = session?.user?.id;

    let query = supabase
      .from('documents')
      .select('*, profiles(*), comments(count)')
      .order('created_at', { ascending: false });

    if (!isFirstLoad) {
      setDocItems((prev) => {
        if (prev.length > 0) {
          const lastCreatedAt = prev[prev.length - 1].created_at;
          query = query.lt('created_at', lastCreatedAt);
        }
        return prev;
      });
    }

    query = query.limit(PAGE_SIZE);

    const { data, error } = await query;

    if (!error && data) {
      if (data.length < PAGE_SIZE) setHasMoreDocs(false);

      let formattedDocs = data
        .filter((doc: any) => doc.profiles && !doc.profiles.is_banned)
        .map((doc: any) => ({
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
  }, []);

  // 💥 HÀM FETCH POSTS CHUẨN
  const fetchPosts = useCallback(async (isFirstLoad = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isFirstLoad) {
      setHasMorePosts(true);
      setInitialLoading(true);
    } else {
      setLoadingMore(true);
    }

    const { data: { session } } = await supabase.auth.getSession();
    const currentUid = session?.user?.id;

    let query = supabase
      .from('posts')
      .select('*, profiles(*), comments(count), post_upvotes(count)')
      .order('created_at', { ascending: false });

    if (!isFirstLoad) {
      setPostItems((prev) => {
        if (prev.length > 0) {
          const lastCreatedAt = prev[prev.length - 1].created_at;
          query = query.lt('created_at', lastCreatedAt);
        }
        return prev;
      });
    }

    query = query.limit(PAGE_SIZE);

    const { data, error } = await query;

    if (!error && data) {
      if (data.length < PAGE_SIZE) setHasMorePosts(false);

      let formattedPosts = data
        .filter((post: any) => post.profiles && !post.profiles.is_banned)
        .map((post: any) => ({
          ...post,
          post_type: 'post',
          title: '',
          comments_count: post.comments?.[0]?.count || 0,
          upvotes_count: post.post_upvotes?.[0]?.count || 0,
        }));

      if (currentUid && formattedPosts.length > 0) {
        const postIds = formattedPosts.map((p) => p.id);

        const [upvotesRes, bookmarksRes] = await Promise.all([
          supabase.from('post_upvotes').select('post_id').eq('user_id', currentUid).in('post_id', postIds),
          supabase.from('post_bookmarks').select('post_id').eq('user_id', currentUid).in('post_id', postIds),
        ]);

        const upvotedPostIds = new Set(upvotesRes.data?.map((p) => p.post_id));
        const bookmarkedPostIds = new Set(bookmarksRes.data?.map((b) => b.post_id));

        formattedPosts = formattedPosts.map((post) => ({
          ...post,
          has_upvoted: upvotedPostIds.has(post.id),
          has_bookmarked: bookmarkedPostIds.has(post.id),
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
  }, []);

  // 💥 EFFECT CHÍNH: TRIGGER FETCH FEED KHI TỰ THAY ĐỔI ĐIỀU KIỆN LỌC (CHẮC CHẮN KHÔNG LẶP VÔ TẬN)
  useEffect(() => {
    if (feedType === 'docs') {
      fetchDocs(true);
    } else {
      fetchPosts(true);
    }
  }, [feedType, activeTab, selectedFaculty, selectedDocType, fetchDocs, fetchPosts]);

  // 💥 AUTH LISTENER TÁCH BIỆT: CHỈ CHẠY 1 LẦN VÀ XỬ LÝ AUTH STATE
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);

      if (newUser) {
        fetchProfile(newUser.id);
      } else {
        setProfile(null);
      }

      // Refresh lại feed khi auth đổi
      if (feedType === 'docs') fetchDocs(true);
      else fetchPosts(true);

      fetchTopContributors();
    });

    fetchTopContributors();
    fetchTrendingSubjects();

    return () => subscription.unsubscribe();
  }, []); // Empty dependency array -> Tuyệt đối không lặp!

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

  // Infinite Scroll Observer
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
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(element);
    return () => {
      if (element) observer.unobserve(element);
    };
  }, [feedType, hasMoreDocs, hasMorePosts, initialLoading, fetchDocs, fetchPosts]);

  // Realtime Profiles Points
  useEffect(() => {
    const channel = supabase
      .channel('realtime_profiles_points')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          fetchTopContributors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTopContributors]);

  const handlePointsChange = useCallback((newPoints: number) => {
    setProfile((prev) => (prev ? { ...prev, points: newPoints } : null));
    fetchTopContributors();
  }, [fetchTopContributors]);

  const handleDeleteInHome = (id: string) => {
    if (feedType === 'docs') {
      setDocItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      setPostItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleToggleBookmarkInHome = (docId: string, isBookmarked: boolean) => {
    if (feedType === 'docs') {
      setDocItems((prev) =>
        prev.map((item) => (item.id === docId ? { ...item, has_bookmarked: isBookmarked } : item))
      );
    } else {
      setPostItems((prev) =>
        prev.map((item) => (item.id === docId ? { ...item, has_bookmarked: isBookmarked } : item))
      );
    }
  };

  const handleUploadSuccess = (newPoints: number) => {
    if (profile) setProfile((prev) => (prev ? { ...prev, points: newPoints } : null));
    if (feedType === 'docs') fetchDocs(true);
    else fetchPosts(true);

    fetchTopContributors();
    fetchTrendingSubjects();
  };

  const handleRefreshFeed = () => {
    if (feedType === 'docs') fetchDocs(true);
    else fetchPosts(true);
    fetchTopContributors();
    fetchTrendingSubjects();
  };

  return (
    <main className="min-h-screen bg-[#f0f2f5] text-slate-800" suppressHydrationWarning>
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <BetaBanner />

        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 flex items-center justify-between gap-1.5 sm:gap-4">
          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <img src="/logo-tlu.png" alt="logo" className="h-7 sm:h-9 w-auto object-contain" />
          </Link>

          <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-bold shrink-0">
            <button
              onClick={() => setFeedType('docs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                feedType === 'docs'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Kho tài liệu</span>
            </button>

            <button
              onClick={() => setFeedType('social')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                feedType === 'social'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              <span>Bảng tin</span>
            </button>
          </div>

          <div className="flex-1 max-w-xs relative hidden xl:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm kiếm môn học..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-100 border-none rounded-full text-xs outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-full xl:hidden cursor-pointer"
            >
              {showMobileSearch ? <X className="w-4 h-4 text-slate-500" /> : <Search className="w-4 h-4" />}
            </button>

            {user && profile ? (
              <>
                <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-300/60 rounded-full text-amber-700 text-[11px] font-bold">
                  <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{profile.points}</span>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <ChatListPopover currentUserId={user?.id} />
                  <FriendRequestsPopover currentUserId={user?.id} />

                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                      className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <UserAvatar src={profile.avatar_url} name={profile.full_name} size="sm" className="ring-1 ring-blue-500/30 shrink-0" />
                      <div className="hidden 2xl:flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-700">{profile.full_name || 'TLUer'}</span>
                        <UserBadge badge={profile.badge} size="sm" />
                      </div>
                    </button>

                    {isProfileMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                        <Link
                          href="/profile"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors"
                        >
                          <UserAvatar src={profile.avatar_url} name={profile.full_name} size="sm" />
                          <span className="truncate">Trang cá nhân</span>
                        </Link>

                        <Link
                          href="/guidelines"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors mt-0.5"
                        >
                          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="truncate">Tiêu chuẩn cộng đồng</span>
                        </Link>

                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors mt-0.5 cursor-pointer text-left"
                        >
                          <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Đăng nhập</span>
              </button>
            )}
          </div>
        </div>

        {showMobileSearch && (
          <div className="px-2 pb-2 xl:hidden animate-in slide-in-from-top-2 duration-200">
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
      <div className="max-w-7xl mx-auto px-2 sm:px-4 grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 items-start">
        
        {/* CỘT 1: LEFT SIDEBAR */}
        <div className="hidden md:block sticky top-[70px] h-[calc(100vh-70px)] overflow-y-auto no-scrollbar pt-4 sm:pt-6 pb-6">
          <aside className="space-y-4">
            {user && profile && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-3">
                  <UserAvatar src={profile.avatar_url} name={profile.full_name} size="lg" />
                  <div className="truncate min-w-0">
                    <div className="flex items-center gap-1 truncate">
                      <p className="font-bold text-sm text-slate-800 truncate">{profile.full_name || 'Sinh viên'}</p>
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
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider px-1">Các khoa/ngành</p>
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
        </div>

        {/* CỘT 2 & 3: MAIN FEED */}
        <section className="md:col-span-2 min-w-0 space-y-4 pt-4 sm:pt-6 pb-20 md:pb-6">
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
                  onToggleBookmark={(docId, isBookmarked) => handleToggleBookmarkInHome(docId, isBookmarked)}
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
        <div className="hidden md:block sticky top-[70px] h-[calc(100vh-70px)] overflow-y-auto no-scrollbar pt-4 sm:pt-6 pb-6">
          <aside className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-amber-600 font-extrabold text-xs uppercase tracking-wider">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Top đóng góp</span>
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
              © 2026 CyberDay Studios Publishing • All right reserved
            </p>
          </aside>
        </div>
      </div>

      {/* MODALS */}
      {user && (
        <>
          <UploadModal
            isOpen={isUploadOpen}
            onClose={() => setIsUploadOpen(false)}
            userId={user.id}
            userPoints={profile?.points || 0}
            onUploadSuccess={handleUploadSuccess}
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

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-[58px] select-none items-center justify-between border-slate-200 border-t bg-white/95 px-1 shadow-lg backdrop-blur-md md:hidden">
        <button
          onClick={() => {
            setIsBottomMenuOpen(false);
            setFeedType('docs');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex h-full min-w-0 flex-1 cursor-pointer flex-col items-center justify-center transition-colors ${
            feedType === 'docs' ? 'font-extrabold text-blue-600' : 'font-semibold text-slate-500'
          }`}
        >
          <BookOpen className="h-5 w-5 shrink-0" />
          <span className="mt-0.5 max-w-full truncate overflow-visible text-[10px] leading-normal">Tài liệu</span>
        </button>

        <button
          onClick={() => {
            setIsBottomMenuOpen(false);
            setFeedType('social');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex h-full min-w-0 flex-1 cursor-pointer flex-col items-center justify-center transition-colors ${
            feedType === 'social' ? 'font-extrabold text-indigo-600' : 'font-semibold text-slate-500'
          }`}
        >
          <MessageSquareText className="h-5 w-5 shrink-0" />
          <span className="mt-0.5 max-w-full truncate overflow-visible text-[10px] leading-normal">Bảng tin</span>
        </button>

        <Link
          href={user ? "/messages" : "#"}
          onClick={(e) => {
            setIsBottomMenuOpen(false);
            if (!user) {
              e.preventDefault();
              setIsAuthOpen(true);
            }
          }}
          className="flex h-full min-w-0 flex-1 cursor-pointer flex-col items-center justify-center font-semibold text-slate-500 transition-colors hover:text-blue-600"
        >
          <div className="relative shrink-0">
            <MessageCircle className="h-5 w-5" />
          </div>
          <span className="mt-0.5 max-w-full truncate overflow-visible text-[10px] leading-normal">Tin nhắn</span>
        </Link>

        <Link
          href={user ? "/friends" : "#"}
          onClick={(e) => {
            setIsBottomMenuOpen(false);
            if (!user) {
              e.preventDefault();
              setIsAuthOpen(true);
            }
          }}
          className="flex h-full min-w-0 flex-1 cursor-pointer flex-col items-center justify-center font-semibold text-slate-500 transition-colors hover:text-blue-600"
        >
          <div className="relative shrink-0">
            <UserPlus className="h-5 w-5" />
            {pendingFriendRequestsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 flex h-[16px] min-w-[16px] items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 font-extrabold text-[9px] text-white animate-pulse">
                {pendingFriendRequestsCount > 9 ? '9+' : pendingFriendRequestsCount}
              </span>
            )}
          </div>
          <span className="mt-0.5 max-w-full truncate overflow-visible text-[10px] leading-normal">Kết bạn</span>
        </Link>

        <div className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-center" ref={bottomMenuRef}>
          <button
            onClick={() => {
              if (!user) return setIsAuthOpen(true);
              setIsBottomMenuOpen((prev) => !prev);
            }}
            className="flex h-full w-full cursor-pointer flex-col items-center justify-center font-semibold text-slate-500 transition-colors hover:text-blue-600"
          >
            <div className="flex h-5 shrink-0 items-center justify-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="avatar"
                  className="h-5 w-5 rounded-full object-cover ring-1 ring-slate-200"
                />
              ) : (
                <UserAvatar src={profile?.avatar_url} name={profile?.full_name} size="sm" className="!h-5 !w-5 text-[10px]" />
              )}
            </div>
            <span className="mt-0.5 max-w-full truncate overflow-visible text-[10px] leading-normal">
              {user ? 'Tôi' : 'Đăng nhập'}
            </span>
          </button>

          {isBottomMenuOpen && user && (
            <div className="absolute right-1 bottom-16 z-50 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
              <Link
                href="/profile"
                onClick={() => setIsBottomMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 font-bold text-xs text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-600"
              >
                <UserAvatar src={profile?.avatar_url} name={profile?.full_name} size="sm" />
                <span className="truncate">Trang cá nhân</span>
              </Link>

              <Link
                href="/guidelines"
                onClick={() => setIsBottomMenuOpen(false)}
                className="mt-0.5 flex items-center gap-2.5 rounded-xl px-3 py-2 font-bold text-xs text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-600"
              >
                <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600" />
                <span className="truncate">Tiêu chuẩn cộng đồng</span>
              </Link>

              <button
                onClick={handleSignOut}
                className="mt-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left font-bold text-xs text-rose-600 transition-colors hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4 shrink-0 text-rose-500" />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </nav>
    </main>
  );
}