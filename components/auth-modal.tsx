'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LogIn, UserPlus, X } from 'lucide-react';

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Đăng ký thành công! Đã có thể đăng nhập.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl relative space-y-4">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5"/>
        </button>

        <h2 className="text-xl font-bold text-slate-900">
          {isSignUp ? 'Tạo tài khoản mới' : 'Đăng nhập'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="youremail@gmail.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : isSignUp ? 'Đăng ký' : 'Đăng nhập'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          {isSignUp ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} {' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-indigo-600 font-semibold hover:underline"
          >
            {isSignUp ? 'Đăng nhập ngay' : 'Đăng ký ngay'}
          </button>
        </div>
      </div>
    </div>
  );
}