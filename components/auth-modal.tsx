'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Mail, Lock, GraduationCap, Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [faculty, setFaculty] = useState('CNTT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isOpen) return null;

  // Hàm lấy origin chuẩn cho cả Dev lẫn Production
  const getURL = () => {
    let url =
      process.env.NEXT_PUBLIC_SITE_URL ?? // Cấu hình domain prod trong .env nếu có
      process.env.NEXT_PUBLIC_VERCEL_URL ?? // Tự bắt URL Vercel nếu deploy trên Vercel
      'http://localhost:3000/';
    
    // Đảm bảo có https:// và kết thúc không bị thừa dấu /
    url = url.includes('http') ? url : `https://${url}`;
    url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
    return url;
  };

  // ĐĂNG NHẬP / ĐĂNG KÝ BẰNG GOOGLE OAUTH
  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    try {
      const redirectUrl = `${getURL()}auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            faculty_choice: isSignUp ? faculty : '',
          },
          redirectTo: redirectUrl, // 💥 Truyền URL Callback chuẩn theo môi trường
        },
      });

      if (error) throw error;
    } catch (err: any) {
      toast.error('Đăng nhập Google thất bại!', { description: err.message });
      setGoogleLoading(false);
    }
  };

  // ĐĂNG NHẬP FORM EMAIL / PASSWORD (DÀNH CHO TAB LOG IN)
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // CHECK BAN KHI ĐĂNG NHẬP THÀNH CÔNG
      if (signInData.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_banned')
          .eq('id', signInData.user.id)
          .single();

        if (profile?.is_banned) {
          await supabase.auth.signOut();
          toast.error('Tài khoản bị khóa!', {
            description: 'Tài khoản của bạn đã bị BAN vĩnh viễn do vi phạm quy định.',
          });
          setLoading(false);
          return;
        }
      }

      toast.success('Đăng nhập thành công!');
      onClose();
    } catch (err: any) {
      toast.error('Đăng nhập thất bại!', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 shadow-2xl relative space-y-4 border border-slate-200">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1 pr-6">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            {isSignUp ? 'Đăng ký tài khoản mới' : 'Chào mừng trở lại!'}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {isSignUp
              ? 'Để hạn chế nick ảo, hệ thống yêu cầu đăng ký bằng Google'
              : 'Đăng nhập để xem & tải tài liệu học tập'}
          </p>
        </div>

        {/* --- FORM ĐĂNG KÝ (BẮT BUỘC GOOGLE OAUTH) --- */}
        {isSignUp ? (
          <div className="space-y-4 pt-1">
            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">
                Chọn Khoa của bạn
              </label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <select
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl outline-none bg-white font-medium text-slate-900 text-xs cursor-pointer"
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

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={googleLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Đăng ký nhanh bằng Google (+50đ)</span>
            </button>
          </div>
        ) : (
          /* --- FORM ĐĂNG NHẬP (CÓ ĐỦ GOOGLE LẪN EMAIL) --- */
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={googleLoading || loading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Đăng nhập qua Google</span>
            </button>

            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-slate-200 w-full"></div>
              <span className="bg-white px-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider absolute">hoặc email</span>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email sinh viên</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                    placeholder="sinhvien@gmail.com"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Đang kiểm tra...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Đăng nhập Email</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          {isSignUp ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-600 font-bold hover:underline cursor-pointer"
          >
            {isSignUp ? 'Đăng nhập ngay' : 'Tạo tài khoản qua Google (+50đ)'}
          </button>
        </div>
      </div>
    </div>
  );
}