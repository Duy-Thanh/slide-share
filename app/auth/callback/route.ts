import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const isConfirm = searchParams.get('confirm') === 'true';
  const uid = searchParams.get('uid');

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {}
        },
      },
    }
  );

  // 💥 NHÁNH 1: Khi user click vào Link xác nhận gửi từ Brevo về Mail
  if (isConfirm && uid) {
    // Kích hoạt flag verified trong database
    await supabase
      .from('profiles')
      .update({ is_email_verified: true })
      .eq('id', uid);

    // Mở cổng cho vào thẳng trang chủ
    return NextResponse.redirect(`${origin}/?verified=true`);
  }

  // 💥 NHÁNH 2: Xử lý khi vừa Google OAuth về
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Đọc thông tin profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_email_verified')
        .eq('id', data.user.id)
        .single();

      // Nếu là tài khoản mới tạo (is_email_verified === false) -> Ép văng sang verify-email
      if (profile && profile.is_email_verified === false) {
        return NextResponse.redirect(`${origin}/auth/verify-email`);
      }

      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=google_failed`);
}