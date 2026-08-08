import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Thiếu Authorization Token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );

    // 1. Authenticate user
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để tải file lên' }, { status: 401 });
    }

    // 2. Check Ban
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned')
      .eq('id', user.id)
      .single();

    if (profile?.is_banned) {
      return NextResponse.json(
        { error: 'Tài khoản của bạn đã bị BAN vĩnh viễn' },
        { status: 403 }
      );
    }

    // 3. Upload Telegram
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Chưa chọn file nào' }, { status: 400 });
    }

    const tgFormData = new FormData();
    tgFormData.append('chat_id', CHAT_ID);
    tgFormData.append('document', file, file.name);

    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: tgFormData,
    });

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      throw new Error(tgData.description || 'Lỗi khi upload lên Telegram Storage');
    }

    const fileSize = tgData.result.document?.file_size || file.size;

    return NextResponse.json({
      success: true,
      fileId: tgData.result.document.file_id,
      fileName: tgData.result.document.file_name || file.name,
      fileSize: fileSize,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}