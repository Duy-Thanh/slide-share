import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    if (!BOT_TOKEN) {
      return NextResponse.json({ error: 'Thiếu TELEGRAM_BOT_TOKEN' }, { status: 500 });
    }

    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('filename') || 'tai-lieu-tlu.pdf';
    const isDownload = searchParams.get('download') === 'true'; // Check xem có ép tải về không

    if (!fileId || fileId === 'undefined') {
      return NextResponse.json({ error: 'fileId không hợp lệ' }, { status: 400 });
    }

    // 1. Lấy file_path từ Telegram API
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

    // 2. Fetch file stream từ Telegram Server
    const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
    const fileRes = await fetch(downloadUrl);

    if (!fileRes.ok || !fileRes.body) {
      return NextResponse.json({ error: 'Không thể tải file stream' }, { status: 500 });
    }

    // 3. Tự động suy ra Content-Type MIME chuẩn theo đuôi file
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

    // 4. Thiết lập Content-Disposition chuẩn RFC 5987 (Hỗ trợ tiếng Việt có dấu + UTF-8)
    const dispositionType = isDownload ? 'attachment' : 'inline';
    const encodedFileName = encodeURIComponent(fileName).replace(/['()]/g, escape).replace(/\*/g, '%2A');
    const contentDisposition = `${dispositionType}; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`;

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', contentDisposition);
    headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');

    // Giữ lại Content-Length nếu có để browser hiện thanh tiến trình
    const contentLength = fileRes.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(fileRes.body as any, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}