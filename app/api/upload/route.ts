import { NextResponse } from 'next/server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Chưa chọn file nào' }, { status: 400 });
    }

    // Đẩy file sang Telegram Bot API
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