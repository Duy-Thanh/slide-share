'use client';

import { useState, useEffect } from 'react';

interface Props {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function UserAvatar({ src, name, size = 'md', className = '' }: Props) {
  const [imgError, setImgError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  // Reset trạng thái lỗi khi props src thay đổi
  useEffect(() => {
    setImgError(false);
    setFallbackError(false);
  }, [src]);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg',
  };

  const displayName = name?.trim() || 'TLUer';
  const initial = displayName.charAt(0).toUpperCase();
  const seed = encodeURIComponent(displayName);

  // API Avatar dự phòng
  const fallbackAvatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  // Xác định nguồn ảnh hiện tại
  const currentSrc = !imgError && src ? src : (!fallbackError ? fallbackAvatarUrl : null);

  return (
    <div
      className={`relative rounded-full overflow-hidden border border-slate-200/80 shadow-xs flex items-center justify-center bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold flex-shrink-0 select-none ${sizeClasses[size]} ${className}`}
    >
      {currentSrc ? (
        <img
          src={currentSrc}
          alt={displayName}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={() => {
            if (!imgError) {
              setImgError(true); // Lỗi ảnh chính -> Chuyển sang DiceBear
            } else {
              setFallbackError(true); // Lỗi cả DiceBear -> Chuyển sang render chữ cái đầu
            }
          }}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}