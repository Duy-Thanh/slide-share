import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
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

    // 2. Stream file từ Telegram
    const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
    const fileRes = await fetch(downloadUrl);

    // Ép header Content-Disposition kèm filename chuẩn UTF-8
    const headers = new Headers(fileRes.headers);
    headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    headers.set('Cache-Control', 'public, max-age=86400');

    return new NextResponse(fileRes.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}