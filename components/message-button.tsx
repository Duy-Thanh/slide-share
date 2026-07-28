'use client';

import { MessageSquare } from 'lucide-react';
import { Profile } from '@/types/database';

interface Props {
  targetUser: Profile;
  currentUserId?: string;
  variant?: 'small' | 'full';
}

export default function MessageButton({ targetUser, currentUserId, variant = 'small' }: Props) {
  if (!currentUserId || currentUserId === targetUser?.id) return null;

  const handleOpenChat = () => {
    window.dispatchEvent(
      new CustomEvent('openChatWithUser', {
        detail: { user: targetUser },
      })
    );
  };

  if (variant === 'full') {
    return (
      <button
        onClick={handleOpenChat}
        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
      >
        <MessageSquare className="w-4 h-4" />
        <span>Nhắn tin</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleOpenChat}
      className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
      title={`Nhắn tin cho ${targetUser.full_name || 'sinh viên'}`}
    >
      <MessageSquare className="w-3.5 h-3.5" />
    </button>
  );
}