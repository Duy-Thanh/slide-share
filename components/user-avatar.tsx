'use client';

interface Props {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function UserAvatar({ src, name, size = 'md', className = '' }: Props) {
  // Chọn kích thước Avatar
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
  };

  const seed = encodeURIComponent(name || 'TLUer');

  // Nếu không có ảnh -> Dùng API DiceBear tạo avatar 3D (bottts / adventurer / micah / shapes)
  const fallbackAvatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  return (
    <div
      className={`relative rounded-full overflow-hidden border border-slate-200/80 shadow-sm flex items-center justify-center bg-slate-100 flex-shrink-0 ${sizeClasses[size]} ${className}`}
    >
      <img
        src={src || fallbackAvatarUrl}
        alt={name || 'Avatar'}
        className="w-full h-full object-cover"
        onError={(e) => {
          // Nếu URL ảnh lỗi -> Fallback sang DiceBear
          (e.target as HTMLImageElement).src = fallbackAvatarUrl;
        }}
      />
    </div>
  );
}