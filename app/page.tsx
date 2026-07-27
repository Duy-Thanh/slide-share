'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DocumentItem, Profile } from '@/types/database';
import DocumentCard from '@/components/document-card';
import AuthModal from '@/components/auth-modal';
import { Upload, Search, LogIn, LogOut, Coins, PlusCircle, Filter, User } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('Tất cả');
  const [selectedDocType, setSelectedDocType] = useState('Tất cả');

  // Form Upload State
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    fetchDocuments();
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  };

  const fetchDocuments = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUid = session?.user?.id;

    // Query lấy documents + thông tin profiles + ĐẾM SỐ COMMENT (count)
    const { data, error } = await supabase
      .from('documents')
      .select('*, profiles(*), comments(count)') // 💥 Thêm comments(count) ở đây
      .order('created_at', { ascending: false });

    if (!error && data) {
      let docsFormatted = data.map((doc: any) => ({
        ...doc,
        comments_count: doc.comments?.[0]?.count || 0, // 💥 Gán số lượng comment đếm được vào
      }));

      if (currentUid) {
        const { data: upvotes } = await supabase.from('upvotes').select('document_id').eq('user_id', currentUid);
        const { data: bookmarks } = await supabase.from('bookmarks').select('document_id').eq('user_id', currentUid);

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

  // Hàm Cập Nhật TLU-Coins Live Trên Header
  const handlePointsChange = (newPoints: number) => {
    if (profile) {
      setProfile({ ...profile, points: newPoints });
    }
  };

  // Hàm Optimistic Delete Bài Viết Ngay Trên Giao Diện Trang Chủ
  const handleDeleteInHome = (docId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return setIsAuthOpen(true);
    if (!file || !title || !subject) return alert('Vui lòng điền đủ thông tin!');

    setUploading(true);

    try {
      // 1. Upload file lên Telegram qua API Route
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const tgData = await res.json();
      if (!res.ok) throw new Error(tgData.error);

      // 2. Direct Insert vào Supabase DB
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

      // Cộng +20 điểm TLU-Coins Live
      if (profile) {
        const updatedPoints = (profile.points || 0) + 20;
        await supabase.from('profiles').update({ points: updatedPoints }).eq('id', user.id);
        handlePointsChange(updatedPoints);
      }
      
      alert('Đăng tài liệu thành công! Mày được cộng +20 điểm TLU-Coins! 🪙');

      // Reset Form & Fetch lại danh sách
      setFile(null);
      setTitle('');
      setSubject('');
      setDescription('');
      fetchDocuments();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Filter Logic
  const filteredDocs = documents.filter((doc) => {
    const matchSearch =
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.subject.toLowerCase().includes(search.toLowerCase());
    const matchFaculty = selectedFaculty === 'Tất cả' || doc.faculty === selectedFaculty;
    const matchType = selectedDocType === 'Tất cả' || doc.doc_type === selectedDocType;

    return matchSearch && matchFaculty && matchType;
  });

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Topbar Navigation */}
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 font-black text-2xl text-blue-700 tracking-tight">
              🎓 TLU Docs
            </div>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              Mạng xã hội chia sẻ đề thi, slide & đồ án mẫu sinh viên Thủy Lợi
            </p>
          </div>

          <div className="flex items-center gap-3">
            {user && profile ? (
              <div className="flex items-center gap-3">
                {/* TLU Coins Counter */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span>{profile.points} TLU-Coins</span>
                </div>

                {/* Nút vào Profile Cá Nhân */}
                <Link
                  href="/profile"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Cá nhân</span>
                </Link>

                <button
                  onClick={() => supabase.auth.signOut()}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-colors flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" /> Đăng nhập TLU
              </button>
            )}
          </div>
        </header>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Form Upload Slide / Đề Thi */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 h-fit space-y-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-600" /> Chia Sẻ Tài Liệu (+20đ)
            </h2>

            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tên tài liệu</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Đề thi KTL322 - Cơ học thủy khí"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Môn học</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Thủy văn"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Thuộc Khoa</label>
                  <select
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    className="w-full px-2 py-2 border rounded-lg text-xs outline-none bg-white"
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
                  <label className="block text-xs font-medium text-slate-700 mb-1">Loại file</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as any)}
                    className="w-full px-2 py-2 border rounded-lg text-xs outline-none bg-white"
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
                  <label className="block text-xs font-medium text-slate-700 mb-1">Học kỳ / Khóa</label>
                  <input
                    type="text"
                    placeholder="VD: K63, HK1 2025"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mô tả ngắn</label>
                <textarea
                  rows={2}
                  placeholder="Tóm tắt tài liệu..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">File (PDF, Word, Excel, PPTX)</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={uploading || !user}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs transition-colors disabled:opacity-50"
              >
                {uploading ? 'Đang tải lên...' : 'Đăng Bài & Tích Điểm'}
              </button>
            </form>
          </div>

          {/* Feed Danh Sách Tài Liệu */}
          <div className="md:col-span-2 space-y-4">
            
            {/* Search & Filter Bar */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm môn học, tên đề thi, đồ án..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {/* Lọc theo Loại */}
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-100 rounded-lg outline-none font-medium text-slate-600"
                >
                  <option value="Tất cả">Tất cả loại tài liệu</option>
                  <option value="Slide">Slide bài giảng</option>
                  <option value="Đề thi">Đề thi / Đáp án</option>
                  <option value="Đồ án">Đồ án mẫu</option>
                  <option value="Đề cương">Đề cương</option>
                  <option value="Giáo trình">Giáo trình</option>
                </select>

                {/* Lọc theo Khoa */}
                <select
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-100 rounded-lg outline-none font-medium text-slate-600"
                >
                  <option value="Tất cả">Tất cả các Khoa</option>
                  <option value="CNTT">CNTT</option>
                  <option value="Thủy Lợi">Thủy Lợi</option>
                  <option value="Công Trình">Công Trình</option>
                  <option value="Kinh Tế">Kinh Tế & Quản Lý</option>
                  <option value="Cơ Điện">Cơ Điện</option>
                </select>
              </div>
            </div>

            {/* Document Cards Feed */}
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
                <div className="bg-white text-center py-12 rounded-2xl border border-slate-200 text-slate-400 text-xs">
                  Không tìm thấy tài liệu nào phù hợp.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </main>
  );
}