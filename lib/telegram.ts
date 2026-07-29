const BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

export async function uploadMediaToTelegram(file: File): Promise<string> {
  if (!BOT_TOKEN || !CHAT_ID) {
    throw new Error('Chưa cấu hình Telegram Bot Token hoặc Chat ID!');
  }

  const isVideo = file.type.startsWith('video/');
  const endpoint = isVideo ? 'sendVideo' : 'sendPhoto';
  const paramName = isVideo ? 'video' : 'photo';

  const formData = new FormData();
  formData.append('chat_id', CHAT_ID);
  formData.append(paramName, file);

  // 1. Upload file lên Telegram Channel
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error('Lỗi upload Telegram: ' + data.description);
  }

  // 2. Lấy file_id từ kết quả trả về
  let fileId = '';
  if (isVideo) {
    fileId = data.result.video.file_id;
  } else {
    // Với photo, lấy kích thước ảnh lớn nhất (mảng photo cuối cùng)
    const photos = data.result.photo;
    fileId = photos[photos.length - 1].file_id;
  }

  // 3. Request Telegram lấy file_path
  const pathRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
  const pathData = await pathRes.json();

  if (!pathData.ok) {
    throw new Error('Không lấy được link file từ Telegram');
  }

  const filePath = pathData.result.file_path;

  // 4. Trả về Direct CDN Link của Telegram
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
}