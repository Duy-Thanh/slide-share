import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const { searchParams } = new URL(request.url);

    // 💥 BẮT TOKEN TỪ HEADER HOẶC QUERY PARAMETER (?token=...)
    const authHeader = request.headers.get('Authorization');
    const queryToken = searchParams.get('token');
    
    const token = authHeader ? authHeader.replace('Bearer ', '') : queryToken;

    if (!token) {
      return NextResponse.json({ error: 'Thiếu Authorization Token' }, { status: 401 });
    }

    // Khởi tạo Supabase Client xác thực bằng Token
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
      return NextResponse.json({ error: 'Phiên làm việc hết hạn hoặc không hợp lệ' }, { status: 401 });
    }

    // 2. Check BAN status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned')
      .eq('id', user.id)
      .single();

    if (profile?.is_banned) {
      return NextResponse.json(
        { error: 'Tài khoản đã bị BAN vĩnh viễn' },
        { status: 403 }
      );
    }

    // 3. FETCH FILE TỪ TELEGRAM KHÔNG ĐỔI
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) {
      return NextResponse.json({ error: 'Thiếu TELEGRAM_BOT_TOKEN' }, { status: 500 });
    }

    const fileName = searchParams.get('filename') || 'tai-lieu-tlu.pdf';
    const isDownload = searchParams.get('download') === 'true';

    if (!fileId || fileId === 'undefined') {
      return NextResponse.json({ error: 'fileId không hợp lệ' }, { status: 400 });
    }

    const pathRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
    );
    const pathData = await pathRes.json();

    if (!pathData.ok) {
      return NextResponse.json(
        { error: pathData.description || 'Không tìm thấy file trên Telegram' },
        { status: 404 }
      );
    }

    const filePath = pathData.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
    const fileRes = await fetch(downloadUrl);

    if (!fileRes.ok || !fileRes.body) {
      return NextResponse.json({ error: 'Không thể tải file stream' }, { status: 500 });
    }

    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      txt: 'text/plain; charset=utf-8',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ppt: 'application/vnd.ms-powerpoint',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
    };

    const contentType = mimeTypes[ext] || fileRes.headers.get('content-type') || 'application/octet-stream';
    const dispositionType = isDownload ? 'attachment' : 'inline';
    const encodedFileName = encodeURIComponent(fileName).replace(/['()]/g, escape).replace(/\*/g, '%2A');
    const contentDisposition = `${dispositionType}; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`;

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', contentDisposition);
    headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');

    const contentLength = fileRes.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(fileRes.body as any, { status: 200, headers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}