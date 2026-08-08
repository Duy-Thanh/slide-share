'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import { useRouter } from 'next/navigation';
import UserAvatar from '@/components/user-avatar';
import UserBadge from '@/components/user-badge';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  User,
  Shield,
  Bell,
  ChevronRight,
  LogOut,
  ArrowLeft,
  GraduationCap,
  Mail,
  KeyRound,
  CheckCircle2,
  Loader2,
  Camera,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  UserX,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'account' | 'security' | 'privacy' | 'ownership'>('account');

  // Form State
  const [fullName, setFullName] = useState('');
  const [faculty, setFaculty] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Password Modal
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // Delete Account Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Vui lòng đăng nhập để truy cập Cài đặt!');
        router.push('/');
        return;
      }

      setUser(session.user);

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setFaculty(data.faculty || 'CNTT');
      }
      setLoading(false);
    };

    loadUserData();
  }, [router]);

  const isAdmin = profile?.badge === 'admin';

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUpdatingProfile(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          faculty: faculty,
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, full_name: fullName, faculty } : null));
      toast.success('Cập nhật thông tin thành công!');
    } catch (err: any) {
      toast.error('Cập nhật thất bại!', { description: err.message });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp!');
      return;
    }

    setChangingPass(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success('Đổi mật khẩu thành công!');
      setIsPassModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error('Đổi mật khẩu thất bại!', { description: err.message });
    } finally {
      setChangingPass(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== 'XÓA TÀI KHOẢN') {
      toast.error('Cụm từ xác nhận không chính xác!');
      return;
    }

    setDeleting(true);
    try {
      const { error: profileErr } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileErr) throw profileErr;

      await supabase.auth.signOut();

      toast.success('Tài khoản của bạn đã được xóa thành công!');
      router.push('/');
    } catch (err: any) {
      toast.error('Xóa tài khoản thất bại!', { description: err.message });
      setDeleting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.info('Đã đăng xuất');
    router.push('/');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span>Đang tải cài đặt...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f0f2f5] text-slate-800 pb-16">
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-full transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-sm sm:text-lg font-extrabold text-slate-900 truncate">Cài đặt & Quyền riêng tư</h1>
          </div>

          <Link href="/profile" className="flex items-center gap-2 shrink-0">
            <UserAvatar src={profile?.avatar_url} name={profile?.full_name} size="sm" />
            <span className="hidden sm:inline text-xs font-bold text-slate-700">
              {profile?.full_name || 'Trang cá nhân'}
            </span>
          </Link>
        </div>
      </header>

      {/* MOBILE TAB SELECTOR (Chỉ hiện trên điện thoại) */}
      <div className="md:hidden bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar shadow-xs">
        <button
          onClick={() => setActiveTab('account')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
            activeTab === 'account' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Thông tin tài khoản
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
            activeTab === 'security' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Mật khẩu & Bảo mật
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
            activeTab === 'privacy' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Quyền riêng tư & Thông báo
        </button>
        <button
          onClick={() => setActiveTab('ownership')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
            activeTab === 'ownership' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Quyền sở hữu & Kiểm soát
        </button>
      </div>

      {/* CONTAINER CHÍNH */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* CỘT 1: SIDEBAR TAB (Chỉ hiện từ màn hình md trở lên) */}
        <div className="hidden md:block space-y-4">
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <p className="px-3 py-1 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Trung tâm Cài đặt
            </p>

            <button
              onClick={() => setActiveTab('account')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'account'
                  ? 'bg-blue-50 text-blue-600 shadow-xs'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-blue-600" />
                <span>Thông tin tài khoản</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-blue-50 text-blue-600 shadow-xs'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Mật khẩu & Bảo mật</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => setActiveTab('privacy')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'privacy'
                  ? 'bg-blue-50 text-blue-600 shadow-xs'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-amber-500" />
                <span>Quyền riêng tư & Thông báo</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => setActiveTab('ownership')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ownership'
                  ? 'bg-rose-50 text-rose-600 shadow-xs'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <UserX className="w-4 h-4 text-rose-600" />
                <span>Sở hữu & Kiểm soát</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer text-left"
            >
              <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Đăng xuất tài khoản</span>
            </button>
          </div>
        </div>

        {/* CỘT 2 & 3: KHU VỰC NỘI DUNG CHI TIẾT */}
        <div className="md:col-span-2 space-y-6">
          {/* TAB 1: THÔNG TIN TÀI KHOẢN */}
          {activeTab === 'account' && (
            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">Thông tin cá nhân</h2>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  Cập nhật tên hiển thị và Khoa của bạn trên SonderNet
                </p>
              </div>

              {/* CARD PROFILE OVERVIEW */}
              <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 sm:gap-4">
                <div className="relative shrink-0">
                  <UserAvatar src={profile?.avatar_url} name={profile?.full_name} size="lg" />
                  <Link
                    href="/profile"
                    className="absolute -bottom-1 -right-1 p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  >
                    <Camera className="w-3 h-3" />
                  </Link>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <h3 className="font-extrabold text-xs sm:text-sm text-slate-800 truncate">
                      {profile?.full_name || 'Sinh viên TLU'}
                    </h3>
                    <UserBadge badge={profile?.badge} size="sm" />
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-semibold truncate">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-amber-500/10 text-amber-700 text-[10px] font-bold rounded-md">
                    🪙 {profile?.points || 0} Coins
                  </span>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Họ và tên hiển thị
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Khoa / Ngành học
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select
                      value={faculty}
                      onChange={(e) => setFaculty(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="CNTT">Khoa Công nghệ thông tin</option>
                      <option value="Thủy Lợi">Khoa Thủy Lợi</option>
                      <option value="Công Trình">Khoa Công Trình</option>
                      <option value="Kinh Tế">Khoa Kinh Tế & Quản Lý</option>
                      <option value="Cơ Điện">Khoa Cơ Điện</option>
                      <option value="Môi Trường">Khoa Môi Trường</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Địa chỉ Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-500 cursor-not-allowed truncate"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Email không thể chỉnh sửa</p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={updatingProfile}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {updatingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <span>Lưu thay đổi</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: MẬT KHẨU & BẢO MẬT */}
          {activeTab === 'security' && (
            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">Mật khẩu & Bảo mật</h2>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  Quản lý mật khẩu và cài đặt bảo vệ tài khoản của bạn.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 sm:p-4 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                      <KeyRound className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-800">Đổi mật khẩu</h3>
                      <p className="text-[11px] text-slate-500">Nên sử dụng mật khẩu mạnh để bảo vệ tài khoản</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPassModalOpen(true)}
                    className="w-full sm:w-auto px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center shrink-0"
                  >
                    Đổi mật khẩu
                  </button>
                </div>

                <div className="p-3 sm:p-4 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-800">Trạng thái xác minh Email</h3>
                      <p className="text-[11px] text-emerald-600 font-semibold">Tài khoản đã xác minh Email thành công</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: QUYỀN RIÊNG TƯ */}
          {activeTab === 'privacy' && (
            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">Quyền riêng tư & Thông báo</h2>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  Kiểm soát ai có thể nhìn thấy hoạt động của bạn trên hệ thống.
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4 text-xs font-semibold text-slate-700">
                <label className="flex items-center justify-between gap-3 p-3 sm:p-3.5 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50">
                  <span className="flex-1">Hiển thị trạng thái hoạt động (Online/Last seen)</span>
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600 rounded shrink-0" />
                </label>

                <label className="flex items-center justify-between gap-3 p-3 sm:p-3.5 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50">
                  <span className="flex-1">Nhận thông báo khi có lượt Upvote / Bình luận bài viết</span>
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600 rounded shrink-0" />
                </label>

                <label className="flex items-center justify-between gap-3 p-3 sm:p-3.5 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50">
                  <span className="flex-1">Cho phép người khác tìm thấy tôi qua tên/Khoa</span>
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600 rounded shrink-0" />
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: SỞ HỮU & KIỂM SOÁT TÀI KHOẢN */}
          {activeTab === 'ownership' && (
            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">Quyền sở hữu & Kiểm soát tài khoản</h2>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  Quản lý dữ liệu, quyền truy cập và tùy chọn vô hiệu hóa hoặc xóa tài khoản của bạn.
                </p>
              </div>

              <div className="space-y-3">
                <div className={`p-3.5 sm:p-4 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                  isAdmin 
                    ? 'bg-slate-50/80 border-slate-200 opacity-50 select-none' 
                    : 'bg-rose-50/50 border-rose-100'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isAdmin ? 'bg-slate-200 text-slate-500' : 'bg-rose-100 text-rose-600'
                    }`}>
                      {isAdmin ? <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" /> : <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-800">Xóa tài khoản vĩnh viễn</h3>
                      <p className="text-[11px] text-slate-500">
                        {isAdmin 
                          ? 'Tài khoản Admin (Bất tử) không thể xóa từ giao diện người dùng.' 
                          : 'Xóa hoàn toàn thông tin cá nhân, bài đăng, tài liệu và điểm thưởng.'}
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={isAdmin}
                    onClick={() => setIsDeleteModalOpen(true)}
                    className={`w-full sm:w-auto px-3.5 py-1.5 font-bold text-xs rounded-xl transition-all text-center shrink-0 ${
                      isAdmin 
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                        : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer'
                    }`}
                  >
                    {isAdmin ? 'Đã khóa' : 'Xóa nick'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* NÚT ĐĂNG XUẤT CHO MOBILE (Hiện ở dưới cùng nội dung) */}
          <div className="md:hidden bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Đăng xuất tài khoản</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL ĐỔI MẬT KHẨU */}
      {isPassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Đổi mật khẩu mới</h3>

            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nhập lại mật khẩu mới</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPassModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={changingPass}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {changingPass ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Xác nhận</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CẢNH BÁO XÓA TÀI KHOẢN */}
      {isDeleteModalOpen && !isAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Xóa tài khoản vĩnh viễn?</h3>
              <p className="text-xs text-slate-500 font-medium">
                Hành động này <b className="text-rose-600">KHÔNG THỂ KHÔI PHỤC</b>. Để xác nhận, vui lòng nhập chuỗi <span className="font-extrabold text-slate-900 select-all bg-slate-100 px-1 py-0.5 rounded">XÓA TÀI KHOẢN</span> vào ô bên dưới
              </p>
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-3 text-xs">
              <div>
                <input
                  type="text"
                  required
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-bold text-center text-slate-900"
                  placeholder="XÓA TÀI KHOẢN"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={deleting || confirmText !== 'XÓA TÀI KHOẢN'}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <span>Đồng ý xóa</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}