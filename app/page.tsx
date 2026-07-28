'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DocumentItem, Profile } from '@/types/database';
import DocumentCard from '@/components/document-card';
import AuthModal from '@/components/auth-modal';
import UserAvatar from '@/components/user-avatar';
import Link from 'next/link';
import {
  Upload,
  Search,
  LogIn,
  LogOut,
  Coins,
  PlusCircle,
  Filter,
  User,
  Flame,
  Bookmark,
  TrendingUp,
  Award,
  Sparkles,
  Layers,
  BookOpen,
  GraduationCap,
  Bell,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export default function HomePage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // States bộ lọc & Tab
  const [search, setSearch] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('Tất cả');
  const [selectedDocType, setSelectedDocType] = useState('Tất cả');
  const [activeTab, setActiveTab] = useState<'newest' | 'popular' | 'bookmarked'>('newest');

  // Top đóng góp
  const [topContributors, setTopContributors] = useState<Profile[]>([]);

  // Form Upload State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [faculty, setFaculty] = useState('CNTT');
  const [docType, setDocType] = useState<'Slide' | 'Đề thi' | 'Đồ án' | 'Giáo trình' | 'Đề cương' | 'Khác'>('Slide');
  const [semester, setSemester] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

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

    fetchDocuments();
    fetchTopContributors();
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

  const fetchDocuments = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const currentUid = session?.user?.id;

    const { data, error } = await supabase
      .from('documents')
      .select('*, profiles(*), comments(count)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      let docsFormatted = data.map((doc: any) => ({
        ...doc,
        comments_count: doc.comments?.[0]?.count || 0,
      }));

      if (currentUid) {
        const { data: upvotes } = await supabase
          .from('upvotes')
          .select('document_id')
          .eq('user_id', currentUid);
        const { data: bookmarks } = await supabase
          .from('bookmarks')
          .select('document_id')
          .eq('user_id', currentUid);

        const upvotedDocIds = new Set(upvotes?.map((u) => u.document_id));
        const bookmarkedDocIds = new Set(bookmarks?.map((b) => b.document_id));

        docsFormatted = docsFormatted.map((doc) => ({
          ...doc,
          has_upvoted: upvotedDocIds.has(doc.id),
          has_bookmarked: bookmarkedDocIds.has(doc.id),
        }));
      }

      setDocuments(docsFormatted);
    }
  };

  const handlePointsChange = (newPoints: number) => {
    if (profile) setProfile({ ...profile, points: newPoints });
  };

  const handleDeleteInHome = (docId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return setIsAuthOpen(true);
    if (!file || !title || !subject) return alert('Vui lòng điền đủ thông tin!');

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const tgData = await res.json();
      if (!res.ok) throw new Error(tgData.error);

      const { error: dbError } = await supabase.from('documents').insert([
        {
          title,
          subject,
          faculty,
          doc_type: docType,
          semester,
          description,
          file_id: tgData.fileId,
          file_name: tgData.fileName,
          file_size: tgData.fileSize,
          file_ext: file.name.split('.').pop(),
          user_id: user.id,
        },
      ]);

      if (dbError) throw dbError;

      if (profile) {
        const updatedPoints = (profile.points || 0) + 20;
        await supabase.from('profiles').update({ points: updatedPoints }).eq('id', user.id);
        handlePointsChange(updatedPoints);
      }

      alert('Đăng bài thành công! +20 TLU-Coins đã được cộng vào tài khoản! 🎉');

      setFile(null);
      setTitle('');
      setSubject('');
      setDescription('');
      setIsUploadOpen(false);
      fetchDocuments();
      fetchTopContributors();
    } catch (err: any) {
      alert('Lỗi đăng bài: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Logic Lọc Bài
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
    <main className="min-h-screen bg-[#f0f2f5] text-slate-800">
      {/* 🟢 TOPBAR NAVIGATION DẠNG STICKY chuẩn Facebook */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Slogan */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              T
            </div>
            <div>
              <span className="font-extrabold text-xl bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                TLU Social
              </span>
            </div>
          </Link>

          {/* Ô Tìm Kiếm Nhanh Trên Header */}
          <div className="flex-1 max-w-md relative hidden md:block">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm môn học, đề thi, giáo trình Thủy Lợi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-full text-xs outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Góc Phải: User Profile & Points */}
          <div className="flex items-center gap-3">
            {user && profile ? (
              <>
                {/* TLU-Coins Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-300/60 rounded-full text-amber-700 text-xs font-bold shadow-2xs">
                  <Coins className="w-4 h-4 text-amber-500 animate-bounce" />
                  <span>{profile.points} Coins</span>
                </div>

                {/* Avatar User Link sang Profile */}
                <Link href="/profile" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                  <UserAvatar src={profile.avatar_url} name={profile.full_name} size="md" className="ring-2 ring-blue-500/30" />
                  <span className="text-xs font-bold text-slate-700 hidden sm:inline">{profile.full_name || 'Sinh viên'}</span>
                </Link>

                <button
                  onClick={() => supabase.auth.signOut()}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4" /> Đăng nhập
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 🔴 CONTAINER 3 CỘT chuẩn MXH */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* ========================================================= */}
        {/* CỘT 1 (LEFT SIDEBAR): Menu Lối Tắt & Lọc Nhanh            */}
        {/* ========================================================= */}
        <aside className="hidden md:block space-y-4 sticky top-20 h-fit">
          {/* Card Thông Tin User Nhanh */}
          {user && profile && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <UserAvatar src={profile.avatar_url} name={profile.full_name} size="lg" />
                <div className="truncate">
                  <p className="font-bold text-sm text-slate-800 truncate">{profile.full_name || 'Sinh viên TLU'}</p>
                  <p className="text-xs text-slate-500 truncate">{profile.faculty || 'Chưa cập nhật Khoa'}</p>
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

          {/* Menu Điều Hướng */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider px-3 py-1">Lối tắt</p>

            <button
              onClick={() => setActiveTab('newest')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'newest' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Bảng tin mới nhất</span>
            </button>

            <button
              onClick={() => setActiveTab('popular')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'popular' ? 'bg-rose-50 text-rose-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Flame className="w-4 h-4 text-rose-500" />
              <span>Đề thi & Slide Hot</span>
            </button>

            <button
              onClick={() => setActiveTab('bookmarked')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'bookmarked' ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Bookmark className="w-4 h-4 text-amber-500" />
              <span>Bài viết đã lưu</span>
            </button>
          </div>

          {/* Lọc Theo Khoa */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider px-3 py-1">Các Khoa TLU</p>
            <div className="space-y-1">
              {['Tất cả', 'CNTT', 'Thủy Lợi', 'Công Trình', 'Kinh Tế', 'Cơ Điện', 'Môi Trường'].map((fac) => (
                <button
                  key={fac}
                  onClick={() => setSelectedFaculty(fac)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    selectedFaculty === fac ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {fac === 'Tất cả' ? '🌐 Tất cả các Khoa' : `🎓 Khoa ${fac}`}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* CỘT 2 & 3 (MAIN FEED): Đăng bài & Dòng Thời Gian            */}
        {/* ========================================================= */}
        <section className="md:col-span-2 space-y-4">
          
          {/* 🟢 KHUNG TẠO BÀI VIẾT (Facebook Status Box) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <UserAvatar src={profile?.avatar_url} name={profile?.full_name} size="md" />
              <button
                onClick={() => {
                  if (!user) return setIsAuthOpen(true);
                  setIsUploadOpen(true);
                }}
                className="flex-1 text-left px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 rounded-full text-xs font-medium text-slate-500 transition-colors cursor-pointer"
              >
                {user ? `${profile?.full_name || 'Mày'} ơi, chia sẻ slide / đề thi mới đi (+20đ)...` : 'Đăng nhập để đăng đề thi & tích điểm...'}
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-around text-xs font-bold text-slate-600">
              <button
                onClick={() => {
                  if (!user) return setIsAuthOpen(true);
                  setIsUploadOpen(true);
                }}
                className="flex items-center gap-2 hover:bg-blue-50 px-3 py-1.5 rounded-xl text-blue-600 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Đăng tài liệu</span>
              </button>

              <button
                onClick={() => {
                  if (!user) return setIsAuthOpen(true);
                  setIsUploadOpen(true);
                }}
                className="flex items-center gap-2 hover:bg-amber-50 px-3 py-1.5 rounded-xl text-amber-600 transition-colors"
              >
                <Coins className="w-4 h-4" />
                <span>Nhận +20 Coins</span>
              </button>
            </div>
          </div>

          {/* BỘ LỌC TÀI LIỆU DẠNG TABS */}
          <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-xs text-xs font-bold">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('newest')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'newest' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Mới nhất
              </button>

              <button
                onClick={() => setActiveTab('popular')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'popular' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                🔥 Môn Hot
              </button>

              {user && (
                <button
                  onClick={() => setActiveTab('bookmarked')}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    activeTab === 'bookmarked' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Bookmark
                </button>
              )}
            </div>

            {/* Select Loại Tài Liệu */}
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="bg-slate-100 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
            >
              <option value="Tất cả">Tất cả loại</option>
              <option value="Slide">Slide bài giảng</option>
              <option value="Đề thi">Đề thi / Đáp án</option>
              <option value="Đồ án">Đồ án mẫu</option>
              <option value="Đề cương">Đề cương</option>
            </select>
          </div>

          {/* 🔴 BẢNG TIN BÀI VIẾT FEED */}
          <div className="space-y-4">
            {filteredDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                currentUserId={user?.id}
                currentUserPoints={profile?.points || 0}
                onDelete={handleDeleteInHome}
                onPointsChange={handlePointsChange}
              />
            ))}

            {filteredDocs.length === 0 && (
              <div className="bg-white text-center py-12 rounded-2xl border border-slate-200 text-slate-400 text-xs font-semibold space-y-2">
                <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
                <p>Chưa có tài liệu nào thuộc mục này.</p>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================= */}
        {/* CỘT 4 (RIGHT SIDEBAR): Bảng Xếp Hạng & Xu Hướng Hot        */}
        {/* ========================================================= */}
        <aside className="hidden md:block space-y-4 sticky top-20 h-fit">
          
          {/* BẢNG XẾP HẠNG TOP CAO THỦ CỐNG HIẾN */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-amber-600 font-extrabold text-xs uppercase tracking-wider">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Top Đóng Góp TLU</span>
            </div>

            <div className="space-y-2.5">
              {topContributors.map((userItem, idx) => (
                <div key={userItem.id} className="flex items-center justify-between text-xs group">
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] ${
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
                    <span className="font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                      {userItem.full_name || 'Sinh viên TLU'}
                    </span>
                  </div>

                  <span className="font-extrabold text-amber-600 text-[11px]">{userItem.points} 🪙</span>
                </div>
              ))}
            </div>
          </div>

          {/* WIDGET XU HƯỚNG TÌM KIẾM */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-blue-600 font-extrabold text-xs uppercase tracking-wider">
              <TrendingUp className="w-4 h-4" />
              <span>Môn Học Tìm Nhiều</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {['An toàn thông tin', 'Thủy văn', 'Cơ kỹ thuật', 'Lập trình Web', 'Giải tích 1', 'Đại số tuyến tính'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearch(tag)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 font-bold text-[11px] rounded-lg transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* FOOTER BẢO QUYỀN */}
          <p className="text-[10px] text-slate-400 text-center font-medium">
            © 2026 TLU Social Network • Được phát triển cho SV Thủy Lợi.
          </p>
        </aside>
      </div>

      {/* 🔴 MODAL DẠNG POPUP UPLOAD BÀI VIẾT (Gọn gàng như Facebook status) */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-600" /> Đăng Bài & Tích Điểm (+20 Coins)
              </h3>
              <button onClick={() => setIsUploadOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên tài liệu / Tiêu đề bài đăng</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Đề thi KTL322 - Cơ học thủy khí K64"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên môn học</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Thủy văn"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thuộc Khoa</label>
                  <select
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    className="w-full px-2 py-2 border border-slate-200 rounded-xl outline-none bg-white font-medium"
                  >
                    <option value="CNTT">CNTT</option>
                    <option value="Thủy Lợi">Thủy Lợi</option>
                    <option value="Công Trình">Công Trình</option>
                    <option value="Kinh Tế">Kinh Tế & Quản Lý</option>
                    <option value="Cơ Điện">Cơ Điện</option>
                    <option value="Môi Trường">Môi Trường</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại tài liệu</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as any)}
                    className="w-full px-2 py-2 border border-slate-200 rounded-xl outline-none bg-white font-medium"
                  >
                    <option value="Slide">Slide bài giảng</option>
                    <option value="Đề thi">Đề thi / Đáp án</option>
                    <option value="Đồ án">Đồ án mẫu</option>
                    <option value="Đề cương">Đề cương ôn tập</option>
                    <option value="Giáo trình">Giáo trình</option>
                    <option value="Khác">Tài liệu khác</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Học kỳ / Khóa</label>
                  <input
                    type="text"
                    placeholder="VD: K64, HK2 2026"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nội dung / Ghi chú</label>
                <textarea
                  rows={2}
                  placeholder="Viết đôi dòng chia sẻ về tài liệu này..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Đính kèm file (PDF, Word, Excel, PPTX)</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  {uploading ? 'Đang tải lên...' : 'Đăng Bài ngay (+20đ)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </main>
  );
}