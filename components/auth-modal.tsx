'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Mail, Lock, User, GraduationCap } from 'lucide-react';

export default function AuthModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [faculty, setFaculty] = useState('CNTT'); // Cho phép chọn đúng khoa
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Gửi kèm metadata (full_name, faculty) xuống Trigger
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || email.split('@')[0],
              faculty: faculty,
            },
          },
        });

        if (authError) throw authError;

        alert('Đăng ký tài khoản thành công! Tặng ngay +50 TLU-Coins 🎉');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        alert('Đăng nhập thành công!');
        onClose();
      }
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4 border border-slate-200">
        
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-slate-900">
            {isSignUp ? 'Tạo tài khoản TLU Social' : 'Chào mừng trở lại!'}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {isSignUp
              ? 'Đăng ký đúng Khoa để kết nối bạn bè cùng chuyên ngành'
              : 'Đăng nhập để xem & tải tài liệu Thủy Lợi'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-3 text-xs">
          {isSignUp && (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Họ và Tên sinh viên
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder="VD: Nguyễn Văn A"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Khoa của bạn</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <select
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl outline-none bg-white font-medium"
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
            </>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Email sinh viên</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                placeholder="sinhvien@tlu.edu.vn"
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
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-blue-500/20 disabled:opacity-50 mt-2"
          >
            {loading ? 'Đang xử lý...' : isSignUp ? 'Đăng ký nhận +50 Coins' : 'Đăng nhập ngay'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          {isSignUp ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} {' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-600 font-bold hover:underline"
          >
            {isSignUp ? 'Đăng nhập ngay' : 'Tạo tài khoản (+50 Coins)'}
          </button>
        </div>
      </div>
    </div>
  );
}