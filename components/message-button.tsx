'use client';

import { MessageSquare } from 'lucide-react';
import { Profile } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Props {
  targetUser: Profile;
  currentUserId?: string;
  variant?: 'small' | 'full';
}

export default function MessageButton({ targetUser, currentUserId, variant = 'small' }: Props) {
  // 💥 CHẶN RENDER NẾU ĐỐI PHƯƠNG BỊ BAN HẶC LÀ CHÍNH MÌNH
  if (!currentUserId || currentUserId === targetUser?.id || targetUser?.is_banned) return null;

  const handleOpenChat = async () => {
    // 💥 CHECK BAN CẢ 2 BÊN TRƯỚC KHIN MỞ CHAT
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, is_banned')
      .in('id', [currentUserId, targetUser.id]);

    const myProfile = profiles?.find((p) => p.id === currentUserId);
    const targetProfile = profiles?.find((p) => p.id === targetUser.id);

    if (myProfile?.is_banned) {
      toast.error('Tài khoản bị khóa!', { description: 'Bạn không thể nhắn tin.' });
      await supabase.auth.signOut();
      window.location.href = '/';
      return;
    }

    if (targetProfile?.is_banned) {
      toast.error('Không thể nhắn tin!', { description: 'Tài khoản này đã bị BAN vĩnh viễn.' });
      return;
    }

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