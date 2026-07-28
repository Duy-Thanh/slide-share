'use client';

interface Props {
  badge?: 'verified' | 'vip' | 'admin' | null;
  size?: 'sm' | 'md' | 'lg';
}

export default function UserBadge({ badge, size = 'sm' }: Props) {
  if (!badge) return null;

  // Kích thước chuẩn chỉnh: sm = 16px, md = 18px, lg = 22px
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-4.5 h-4.5' : 'w-5.5 h-5.5';

  // 1. TÍCH ĐỎ ADMIN
  if (badge === 'admin') {
    return (
      <span className="inline-flex items-center shrink-0 cursor-pointer" title="Quản trị viên TLU Social">
        <svg
          className={`${iconSize} text-rose-600 fill-current`}
          viewBox="0 0 24 24"
        >
          {/* Bánh răng 12 viền cong */}
          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.79-4-4-4-.495 0-.965.084-1.4.238C14.55 2.475 13.18 1.6 11.6 1.6s-2.95.875-3.6 2.148c-.435-.154-.905-.238-1.4-.238-2.21 0-4 1.79-4 4 0 .495.084.965.238 1.4C1.575 9.55.7 10.92.7 12.5s.875 2.95 2.148 3.6c-.154.435-.238.905-.238 1.4 0 2.21 1.79 4 4 4 .495 0 .965-.084 1.4-.238 1.05 1.273 2.42 2.148 4 2.148s2.95-.875 3.6-2.148c.435.154.905.238 1.4.238 2.21 0 4-1.79 4-4 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6z" />
          {/* Dấu tích trắng bên trong */}
          <path
            fill="#FFFFFF"
            d="M10.2 16.2l-3.5-3.5 1.4-1.4 2.1 2.1 5.3-5.3 1.4 1.4z"
          />
        </svg>
      </span>
    );
  }

  // 2. TÍCH VÀNG VIP / TOP CỐNG HIẾN
  if (badge === 'vip') {
    return (
      <span className="inline-flex items-center shrink-0 cursor-pointer" title="Thành viên VIP / Top Cống Hiến">
        <svg
          className={`${iconSize} text-amber-500 fill-current`}
          viewBox="0 0 24 24"
        >
          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.79-4-4-4-.495 0-.965.084-1.4.238C14.55 2.475 13.18 1.6 11.6 1.6s-2.95.875-3.6 2.148c-.435-.154-.905-.238-1.4-.238-2.21 0-4 1.79-4 4 0 .495.084.965.238 1.4C1.575 9.55.7 10.92.7 12.5s.875 2.95 2.148 3.6c-.154.435-.238.905-.238 1.4 0 2.21 1.79 4 4 4 .495 0 .965-.084 1.4-.238 1.05 1.273 2.42 2.148 4 2.148s2.95-.875 3.6-2.148c.435.154.905.238 1.4.238 2.21 0 4-1.79 4-4 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6z" />
          <path
            fill="#FFFFFF"
            d="M10.2 16.2l-3.5-3.5 1.4-1.4 2.1 2.1 5.3-5.3 1.4 1.4z"
          />
        </svg>
      </span>
    );
  }

  // 3. TÍCH XANH CHÍNH CHỦ TLU
  if (badge === 'verified') {
    return (
      <span className="inline-flex items-center shrink-0 cursor-pointer" title="Sinh viên TLU đã xác minh">
        <svg
          className={`${iconSize} text-blue-600 fill-current`}
          viewBox="0 0 24 24"
        >
          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.79-4-4-4-.495 0-.965.084-1.4.238C14.55 2.475 13.18 1.6 11.6 1.6s-2.95.875-3.6 2.148c-.435-.154-.905-.238-1.4-.238-2.21 0-4 1.79-4 4 0 .495.084.965.238 1.4C1.575 9.55.7 10.92.7 12.5s.875 2.95 2.148 3.6c-.154.435-.238.905-.238 1.4 0 2.21 1.79 4 4 4 .495 0 .965-.084 1.4-.238 1.05 1.273 2.42 2.148 4 2.148s2.95-.875 3.6-2.148c.435.154.905.238 1.4.238 2.21 0 4-1.79 4-4 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6z" />
          <path
            fill="#FFFFFF"
            d="M10.2 16.2l-3.5-3.5 1.4-1.4 2.1 2.1 5.3-5.3 1.4 1.4z"
          />
        </svg>
      </span>
    );
  }

  return null;
}