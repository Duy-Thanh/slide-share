'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DocumentItem, Profile } from '@/types/database';
import DocumentCard from '@/components/document-card';
import { Coins, Folder, Bookmark, Edit3, ArrowLeft, Save, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import UserAvatar from '@/components/user-avatar';
import FriendListModal from '@/components/friend-list-modal';
import UserBadge from '@/components/user-badge';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myDocs, setMyDocs] = useState<DocumentItem[]>([]);
  const [bookmarkedDocs, setBookmarkedDocs] = useState<DocumentItem[]>([]);
  const [activeTab, setActiveTab] = useState<'my-docs' | 'bookmarks'>('my-docs');
  const [loading, setLoading] = useState(true);
  const [isFriendListOpen, setIsFriendListOpen] = useState(false);

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [faculty, setFaculty] = useState('CNTT');
  const [className, setClassName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
        alert('Mày cần đăng nhập để xem trang cá nhân!');
        router.push('/');
        return;
    }

    const uid = session.user.id;
    setUser(session.user);

    // 1. Fetch Profile info
    const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

    if (profData) {
        setProfile(profData);
        setFullName(profData.full_name || '');
        setStudentCode(profData.student_code || '');
        setFaculty(profData.faculty || 'CNTT');
        setClassName(profData.class_name || '');
        setAvatarUrl(profData.avatar_url || '');
    }

    // 2. Fetch danh sách ID các bài user này đã Upvote và Bookmark
    const [upvotesRes, bookmarksRes] = await Promise.all([
        supabase.from('upvotes').select('document_id').eq('user_id', uid),
        supabase.from('bookmarks').select('document_id').eq('user_id', uid),
    ]);

    const myUpvotedDocIds = new Set(upvotesRes.data?.map((u) => u.document_id) || []);
    const myBookmarkedDocIds = new Set(bookmarksRes.data?.map((b) => b.document_id) || []);

    // 3. Fetch My Documents
    const { data: docsData } = await supabase
        .from('documents')
        .select('*, profiles(*), comments(count)')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

    if (docsData) {
        const formattedMyDocs = docsData.map((doc: any) => ({
        ...doc,
        comments_count: doc.comments?.[0]?.count || 0,
        has_upvoted: myUpvotedDocIds.has(doc.id),
        has_bookmarked: myBookmarkedDocIds.has(doc.id),
        }));
        setMyDocs(formattedMyDocs);
    }

    // 4. Fetch Bookmarked Documents
    const { data: bData } = await supabase
        .from('bookmarks')
        .select('document_id, documents(*, profiles(*), comments(count))')
        .eq('user_id', uid);

    if (bData) {
        const bDocs = bData
        .map((b: any) => b.documents)
        .filter((doc: any) => doc !== null && doc !== undefined)
        .map((doc: any) => ({
            ...doc,
            comments_count: doc.comments?.[0]?.count || 0,
            has_upvoted: myUpvotedDocIds.has(doc.id),
            has_bookmarked: true,
        }));

        setBookmarkedDocs(bDocs);
    }

    setLoading(false);
  };

  const handlePointsChangeInProfile = (newPoints: number) => {
    if (profile) {
      setProfile({ ...profile, points: newPoints });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        student_code: studentCode,
        faculty,
        class_name: className,
        avatar_url: avatarUrl,
      })
      .eq('id', user.id);

    if (error) {
      alert('Lỗi cập nhật: ' + error.message);
    } else {
      alert('Cập nhật thông tin thành công!');
      setIsEditing(false);
      fetchProfileData();
    }
  };

  const handleDeleteInProfile = (docId: string) => {
    setMyDocs((prev) => prev.filter((item) => item.id !== docId));
    setBookmarkedDocs((prev) => prev.filter((item) => item.id !== docId));
  };

  const handleToggleBookmarkInProfile = (doc: any, isBookmarked: boolean) => {
    if (isBookmarked) {
      setMyDocs((prev) =>
        prev.map((item) => (item.id === doc.id ? { ...item, has_bookmarked: true } : item))
      );

      setBookmarkedDocs((prev) => {
        if (prev.some((item) => item.id === doc.id)) return prev;
        return [{ ...doc, has_bookmarked: true }, ...prev];
      });
    } else {
      setMyDocs((prev) =>
        prev.map((item) => (item.id === doc.id ? { ...item, has_bookmarked: false } : item))
      );

      setBookmarkedDocs((prev) => prev.filter((item) => item.id !== doc.id));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
        Đang tải thông tin cá nhân...
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

        {/* Card Thống Kê Profile */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full sm:w-auto">
              <UserAvatar
                src={profile?.avatar_url}
                name={profile?.full_name}
                size="lg"
                className="ring-4 ring-blue-50 shrink-0"
              />
              <div className="space-y-1 min-w-0 flex-1">
                {/* USERBADGE TÍCH UY TÍN CẠNH TÊN CHÍNH CHỦ */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{profile?.full_name || 'Sinh viên TLU'}</h2>
                  <UserBadge badge={profile?.badge} size="md" />
                </div>
                
                <p className="text-xs text-slate-500 truncate">
                  {profile?.class_name ? `Lớp ${profile.class_name}` : 'Chưa cập nhật lớp'} • Khoa {profile?.faculty || 'CNTT'}
                </p>
                {profile?.student_code && (
                  <p className="text-[11px] text-slate-400 font-mono">MSV: {profile.student_code}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-start sm:justify-end flex-wrap pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              {/* TLU Coins Counter */}
              <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs sm:text-sm font-bold">
                <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 animate-bounce shrink-0" />
                <span>{profile?.points || 0} Coins</span>
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-4 h-4 shrink-0" /> 
                <span>{isEditing ? 'Hủy' : 'Sửa Profile'}</span>
              </button>

              <button
                onClick={() => setIsFriendListOpen(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 border border-slate-200/80 shadow-2xs cursor-pointer"
              >
                <Users className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="hidden xs:inline">Danh sách bạn bè</span>
                <span className="xs:hidden">Bạn bè</span>
              </button>
            </div>
          </div>

          {/* Form Sửa Thông Tin */}
          {isEditing && (
            <form onSubmit={handleUpdateProfile} className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mã sinh viên TLU</label>
                <input
                  type="text"
                  placeholder="VD: 2151061234"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Khoa</label>
                <select
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none bg-white font-medium cursor-pointer"
                >
                  <option value="CNTT">CNTT</option>
                  <option value="Thủy Lợi">Thủy Lợi</option>
                  <option value="Công Trình">Công Trình</option>
                  <option value="Kinh Tế">Kinh Tế & Quản Lý</option>
                  <option value="Cơ Điện">Cơ Điện</option>
                  <option value="Môi Trường">Môi Trường</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Lớp sinh hoạt</label>
                <input
                  type="text"
                  placeholder="VD: 63TH1"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Link Ảnh Avatar (URL)</label>
                <input
                  type="url"
                  placeholder="https://example.com/my-avatar.jpg"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="sm:col-span-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Lưu thông tin
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('my-docs')}
            className={`pb-3 px-3 sm:px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'my-docs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Folder className="w-4 h-4" /> Tài Liệu Đã Đăng ({myDocs.length})
          </button>

          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`pb-3 px-3 sm:px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'bookmarks'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Bookmark className="w-4 h-4" /> Đã Bookmark ({bookmarkedDocs.length})
          </button>
        </div>

        {/* TAB 1: TÀI LIỆU ĐÃ ĐĂNG */}
        {activeTab === 'my-docs' && (
          <div className="space-y-3 sm:space-y-4">
            {myDocs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Mày chưa đăng tài liệu nào.</p>
            ) : (
              myDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  currentUserId={user?.id}
                  currentUserPoints={profile?.points || 0}
                  onToggleBookmark={(isBookmarked) => handleToggleBookmarkInProfile(doc, isBookmarked)}
                  onDelete={handleDeleteInProfile}
                  onPointsChange={handlePointsChangeInProfile}
                />
              ))
            )}
          </div>
        )}

        {/* TAB 2: ĐÃ BOOKMARK */}
        {activeTab === 'bookmarks' && (
          <div className="space-y-3 sm:space-y-4">
            {bookmarkedDocs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Chưa có tài liệu nào được lưu.</p>
            ) : (
              bookmarkedDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  currentUserId={user?.id}
                  currentUserPoints={profile?.points || 0}
                  onToggleBookmark={(isBookmarked) => handleToggleBookmarkInProfile(doc, isBookmarked)}
                  onDelete={handleDeleteInProfile}
                  onPointsChange={handlePointsChangeInProfile}
                />
              ))
            )}
          </div>
        )}

        {/* MODAL DANH SÁCH BẠN BÈ */}
        {profile && (
          <FriendListModal
            userId={profile.id}
            isOpen={isFriendListOpen}
            onClose={() => setIsFriendListOpen(false)}
          />
        )}
      </div>
    </main>
  );
}