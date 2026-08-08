'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const hasTriggeredRef = useRef(false);

  const checkAndSendEmail = async () => {
    // 💥 1. Check xem tài khoản đã verified chưa trước khi gửi
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_email_verified')
        .eq('id', user.id)
        .single();

      if (profile?.is_email_verified) {
        toast.success('Tài khoản của bạn đã được xác minh!');
        router.replace('/');
        return;
      }
    }

    // 💥 2. Nếu thực sự chưa verified thì mới gọi API gửi mail Brevo
    setResending(true);
    try {
      const res = await fetch('/api/send-verify-email', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        toast.error('Lỗi gửi mail kích hoạt!', { description: data.error });
      } else {
        toast.success('Đã gửi Email kích hoạt! Hãy kiểm tra hòm thư nhé.');
      }
    } catch (err: any) {
      toast.error('Lỗi kết nối máy chủ!');
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    checkAndSendEmail();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.info('Đã đăng xuất');
    router.push('/');
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xl text-center space-y-5">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-blue-50/50">
          <Mail className="w-8 h-8 animate-bounce" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-extrabold text-slate-800">Xác thực Email của bạn</h1>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Tài khoản của bạn đã được khởi tạo! Vui lòng kiểm tra hộp thư (kể cả thư rác/spam) và nhấn vào link kích hoạt để tiếp tục sử dụng hệ thống.
          </p>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl text-[11px] text-amber-800 font-semibold text-left flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>Bạn cần mở Email bấm xác nhận thì mới được quyền đăng bài & tải tài liệu nhé!</span>
        </div>

        <div className="pt-2 space-y-2">
          <button
            onClick={checkAndSendEmail}
            disabled={resending}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
            <span>{resending ? 'Đang gửi Email...' : 'Gửi lại Email kích hoạt'}</span>
          </button>

          <button
            onClick={handleSignOut}
            className="w-full py-2.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất tài khoản khác</span>
          </button>
        </div>
      </div>
    </main>
  );
}