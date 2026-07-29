function getOnlineStatus(lastSeen: string | null) {
  if (!lastSeen) return { isOnline: false, text: 'Ngoại tuyến' };

  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - lastSeenDate.getTime()) / 1000);

  // Nếu đang online (vừa gửi heartbeat trong vòng 2 phút vừa qua)
  if (diffInSeconds >= 0 && diffInSeconds < 120) {
    return { isOnline: true, text: 'Đang hoạt động' };
  }

  // Nếu đã offline
  const diffInMinutes = Math.floor(diffInSeconds / 60);

  if (diffInMinutes < 1) {
    return { isOnline: false, text: 'Hoạt động vừa xong' };
  }

  if (diffInMinutes < 60) {
    return { isOnline: false, text: `Hoạt động ${diffInMinutes} phút trước` };
  }

  const hours = Math.floor(diffInMinutes / 60);
  if (hours < 24) {
    return { isOnline: false, text: `Hoạt động ${hours} giờ trước` };
  }

  const days = Math.floor(hours / 24);
  return { isOnline: false, text: `Hoạt động ${days} ngày trước` };
}