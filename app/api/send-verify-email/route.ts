import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 401 });
  }

  // Tạo link xác thực chứa token bí mật
  const origin = request.headers.get('origin') || 'http://localhost:3000';
  const verifyLink = `${origin}/auth/callback?confirm=true&uid=${user.id}`;

  // Gọi thẳng REST API của Brevo
  const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY!,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: 'SonderNet Support',
        email: 'thanhduynguyen0x0007@gmail.com', // Hoặc email đăng ký Brevo của mày
      },
      to: [
        {
          email: user.email,
          name: user.user_metadata?.full_name || 'Sinh viên TLU',
        },
      ],
      subject: '[SonderNet] Xác nhận kích hoạt tài khoản của bạn',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Chào bạn ${user.user_metadata?.full_name || ''}!</h2>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại <b>SonderNet</b>.</p>
          <p>Vui lòng nhấn vào nút bên dưới để kích hoạt tài khoản và tiếp tục sử dụng hệ thống:</p>
          <a href="${verifyLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #fff; text-decoration: none; font-weight: bold; border-radius: 8px; margin: 15px 0;">
            Kích hoạt tài khoản ngay
          </a>
          <p style="font-size: 12px; color: #777;">Nếu nút không bấm được, hãy copy link sau dán vào trình duyệt: <br>${verifyLink}</p>
        </div>
      `,
    }),
  });

  if (!brevoRes.ok) {
    const errorData = await brevoRes.json();
    return NextResponse.json({ error: errorData.message || 'Lỗi gửi mail qua Brevo' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}