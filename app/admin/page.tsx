'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import Link from 'next/link';
import UserAvatar from '@/components/user-avatar';
import UserBadge from '@/components/user-badge';
import {
  ShieldAlert,
  Users,
  FileText,
  Search,
  Ban,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Trash2,
  MessageSquareText,
  BookOpen,
  CheckCircle2
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'users'>('content');

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDocs: 0,
    totalPosts: 0,
  });

  // Data Lists
  const [usersList, setUsersList] = useState<Profile[]>([]);
  const [docsList, setDocsList] = useState<any[]>([]);
  const [postsList, setPostsList] = useState<any[]>([]);
  const [contentType, setContentType] = useState<'docs' | 'posts'>('docs');

  const [userSearch, setUserSearch] = useState('');
  const [contentSearch, setContentSearch] = useState('');

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profile && profile.badge === 'admin') {
      setIsAdmin(true);
      await fetchDashboardData();
    } else {
      setIsAdmin(false);
    }
    setLoading(false);
  };

  const fetchDashboardData = async () => {
    const [usersCount, docsCount, postsCount] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('documents').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
    ]);

    setStats({
      totalUsers: usersCount.count || 0,
      totalDocs: docsCount.count || 0,
      totalPosts: postsCount.count || 0,
    });

    // 1. Fetch Users
    const { data: users, error: usersErr } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (users) setUsersList(users as Profile[]);
    if (usersErr) console.error('Lỗi fetch users:', usersErr);

    // 2. Fetch Docs
    const { data: docs, error: docsErr } = await supabase
      .from('documents')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false });

    if (docs) setDocsList(docs);
    if (docsErr) console.error('Lỗi fetch docs:', docsErr);

    // 3. Fetch Posts
    const { data: posts, error: postsErr } = await supabase
      .from('posts')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false });

    if (posts) setPostsList(posts);
    if (postsErr) console.error('Lỗi fetch posts:', postsErr);
  };

  // ADMIN TRẢM BÀI TRỰC TIẾP
  const handleDeleteContent = async (id: string, type: 'docs' | 'posts') => {
    if (!confirm('ADMIN TRẢM: Mày chắc chắn muốn XÓA VĨNH VIỄN bài này chứ?')) return;

    setActionLoading(id);
    const table = type === 'docs' ? 'documents' : 'posts';

    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) {
      alert(`❌ KHÔNG THỂ XÓA! Lỗi Supabase RLS: ${error.message}`);
    } else {
      if (type === 'docs') {
        setDocsList((prev) => prev.filter((item) => item.id !== id));
        setStats((prev) => ({ ...prev, totalDocs: Math.max(0, prev.totalDocs - 1) }));
      } else {
        setPostsList((prev) => prev.filter((item) => item.id !== id));
        setStats((prev) => ({ ...prev, totalPosts: Math.max(0, prev.totalPosts - 1) }));
      }
      alert('✅ Đã xóa bài viết thành công!');
    }
    setActionLoading(null);
  };

  // ADMIN THAY ĐỔI BADGE (KHÔNG CHO TỰ ĐỔI CỦA CHÍNH MÌNH)
  const handleUpdateBadge = async (targetUser: Profile, badge: Profile['badge']) => {
    // 1. Lấy session hiện tại để check xem có phải tự bấm vào nick mình không
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user.id === targetUser.id) {
      alert('⚠️ ĐỊT MẸ BỚT NGHỊCH NGU! Mày đang là Admin, tự hạ Badge xuống VIP/Tích xanh là tự đá mình ra khỏi trang Admin đấy!');
      return;
    }

    setActionLoading(targetUser.id);
    const { error } = await supabase
      .from('profiles')
      .update({ badge })
      .eq('id', targetUser.id);

    if (error) {
      alert(`❌ Lỗi đổi Badge: ${error.message}`);
    } else {
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, badge } : u))
      );
      alert('✅ Đã cập nhật Badge thành công!');
    }
    setActionLoading(null);
  };

  // ADMIN BAN / UNBAN USER (CHẶN BLACKLIST)
  const handleToggleBan = async (userItem: Profile) => {
    // CHẶN TỰ BAN CHÍNH MÌNH
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user.id === userItem.id) {
      alert('❌ ĐỊT MẸ BỚT NGHỊCH! Mày định tự BAN chính mình để tự nhốt mình ngoài cửa à?');
      return;
    }
    
    const isCurrentlyBanned = !!userItem.is_banned;
    const confirmMsg = !isCurrentlyBanned
      ? `ADMIN LỆNH: Mày chắc chắn muốn BAN CỨNG user "${userItem.full_name || userItem.id}"?\n\nLệnh này sẽ khóa nick và chặn Google OAuth vĩnh viễn!`
      : `ADMIN LỆNH: Mở khóa BAN cho user "${userItem.full_name || userItem.id}"?`;

    if (!confirm(confirmMsg)) return;

    setActionLoading(userItem.id);

    // Lấy email từ profile hoặc bảng auth nếu lưu
    const targetEmail = (userItem as any).email;

    if (!isCurrentlyBanned) {
      // 1. Đưa email vào blacklist nếu có
      if (targetEmail) {
        await supabase.from('banned_users').upsert({
          email: targetEmail,
          reason: 'Vi phạm quy tắc cộng đồng/Clone rác'
        }, { onConflict: 'email' });
      }

      // 2. Set is_banned = true
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: true })
        .eq('id', userItem.id);

      if (error) {
        alert(`❌ Lỗi BAN: ${error.message}`);
      } else {
        setUsersList((prev) =>
          prev.map((u) => (u.id === userItem.id ? { ...u, is_banned: true } : u))
        );
        alert('🚫 Đã BAN CỨNG user thành công!');
      }
    } else {
      // UNBAN: Bỏ khỏi banned_users & set is_banned = false
      if (targetEmail) {
        await supabase.from('banned_users').delete().eq('email', targetEmail);
      }

      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: false })
        .eq('id', userItem.id);

      if (error) {
        alert(`❌ Lỗi MỞ BAN: ${error.message}`);
      } else {
        setUsersList((prev) =>
          prev.map((u) => (u.id === userItem.id ? { ...u, is_banned: false } : u))
        );
        alert('✅ Đã gỡ Banned & Mở khóa thành công!');
      }
    }
    setActionLoading(null);
  };

  // Filter Users
  const filteredUsers = usersList.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.student_code?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.faculty?.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Filter Content
  const currentContentList = contentType === 'docs' ? docsList : postsList;
  const filteredContent = currentContentList.filter(
    (item) =>
      item.title?.toLowerCase().includes(contentSearch.toLowerCase()) ||
      item.content?.toLowerCase().includes(contentSearch.toLowerCase()) ||
      item.subject?.toLowerCase().includes(contentSearch.toLowerCase()) ||
      item.profiles?.full_name?.toLowerCase().includes(contentSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 text-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
        <h1 className="text-2xl font-black">KHÔNG CÓ QUYỀN TRUY CẬP</h1>
        <p className="text-sm text-slate-400 mt-2 max-w-md">Trang này chỉ dành riêng cho Quản trị viên SonderNet.</p>
        <Link href="/" className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Quay lại trang chủ
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-12 font-sans">
      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <span className="font-black text-sm uppercase tracking-wider text-white">SonderNet Admin Control Center</span>
            </div>
          </div>

          <button onClick={fetchDashboardData} className="p-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Reload Data
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>TỔNG USER</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-white">{stats.totalUsers}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>KHO TÀI LIỆU</span>
              <FileText className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-white">{stats.totalDocs}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>BÀI ĐĂNG BẢNG TIN</span>
              <MessageSquareText className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-white">{stats.totalPosts}</p>
          </div>
        </div>

        {/* TAB CONTROLS */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'content'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" /> Quản lý Nội dung (Gỡ bài)
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Quản lý Thành viên ({usersList.length})
          </button>
        </div>

        {/* TAB 1: CONTENT MODERATION */}
        {activeTab === 'content' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center bg-slate-950 p-1 rounded-xl text-xs font-bold border border-slate-800">
                <button
                  onClick={() => setContentType('docs')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    contentType === 'docs' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" /> Tài liệu ({docsList.length})
                </button>
                <button
                  onClick={() => setContentType('posts')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    contentType === 'posts' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageSquareText className="w-3.5 h-3.5" /> Bảng tin ({postsList.length})
                </button>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Tìm tiêu đề, người đăng, môn..."
                  value={contentSearch}
                  onChange={(e) => setContentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Nội dung đăng</th>
                    <th className="p-3">Người đăng</th>
                    <th className="p-3">Thời gian</th>
                    <th className="p-3 text-right">Lệnh Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredContent.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 max-w-xs sm:max-w-md">
                        <p className="font-bold text-white truncate">
                          {contentType === 'docs' ? item.title : (item.content || 'Bài viết không tiêu đề')}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">ID: {item.id}</p>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <UserAvatar src={item.profiles?.avatar_url} name={item.profiles?.full_name} size="sm" />
                          <span className="font-bold text-slate-300 truncate max-w-[120px]">
                            {item.profiles?.full_name || 'Ẩn danh'}
                          </span>
                        </div>
                      </td>

                      <td className="p-3 text-[11px] text-slate-400">
                        {new Date(item.created_at).toLocaleDateString('vi-VN')}
                      </td>

                      <td className="p-3 text-right">
                        <button
                          disabled={actionLoading === item.id}
                          onClick={() => handleDeleteContent(item.id, contentType)}
                          className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-colors text-[11px] font-bold flex items-center gap-1.5 ml-auto cursor-pointer"
                        >
                          {actionLoading === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>Xóa ngay</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredContent.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-xs font-medium">
                  Không tìm thấy bài viết/tài liệu nào.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Tìm theo tên, mã SV, khoa..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Thành viên</th>
                    <th className="p-3">Trạng thái Ban</th>
                    <th className="p-3">Coins</th>
                    <th className="p-3">Badge</th>
                    <th className="p-3 text-right">Hành động Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar src={u.avatar_url} name={u.full_name} size="sm" />
                          <div className="truncate min-w-0">
                            <p className="font-bold text-white truncate">{u.full_name || 'Chưa đặt tên'}</p>
                            <p className="text-[10px] text-slate-500 truncate">{u.id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        {u.is_banned ? (
                          <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[10px] font-black">
                            🚫 ĐÃ BAN
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-black">
                            <CheckCircle2 className="w-3 h-3 inline mr-1" /> Bình thường
                          </span>
                        )}
                      </td>

                      <td className="p-3 font-extrabold text-amber-400">
                        {u.points || 0} 🪙
                      </td>

                      <td className="p-3">
                        <UserBadge badge={u.badge} size="sm" />
                      </td>

                      <td className="p-3 text-right">
                        {u.badge === 'admin' ? (
                          <span className="text-[10px] font-extrabold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 shadow-sm inline-block">
                            👑 ADMIN (Bất tử)
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              disabled={actionLoading === u.id}
                              onClick={() => handleUpdateBadge(u, u.badge === 'verified' ? null : 'verified')}
                              className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              Tích Xanh
                            </button>

                            <button
                              disabled={actionLoading === u.id}
                              onClick={() => handleUpdateBadge(u, u.badge === 'vip' ? null : 'vip')}
                              className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              VIP
                            </button>

                            <button
                              disabled={actionLoading === u.id}
                              onClick={() => handleToggleBan(u)}
                              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[10px] font-bold flex items-center gap-1 ${
                                u.is_banned
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                  : 'bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white'
                              }`}
                            >
                              <Ban className="w-3 h-3" />
                              <span>{u.is_banned ? 'Mở Ban' : 'BAN NICK'}</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}