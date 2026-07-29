'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Conversation, Profile } from '@/types/database';
import UserAvatar from '@/components/user-avatar';
import UserBadge from '@/components/user-badge';
import { MessageSquare, Loader2 } from 'lucide-react';

interface Props {
  currentUserId?: string;
}

export default function ChatListPopover({ currentUserId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && currentUserId) {
      fetchConversations();
    }
  }, [isOpen, currentUserId]);

  // Click outside để đóng Popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lắng nghe Realtime Conversation Update
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('realtime-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          if (isOpen) fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, isOpen]);

  const fetchConversations = async () => {
    if (!currentUserId) return;
    setLoading(true);

    const { data } = await supabase
      .from('conversations')
      .select('*, user1:profiles!user1_id(*), user2:profiles!user2_id(*)')
      .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
      .order('updated_at', { ascending: false });

    if (data) {
      const formatted = data.map((conv) => {
        const partner = conv.user1_id === currentUserId ? conv.user2 : conv.user1;
        return {
          ...conv,
          partner,
        };
      });
      setConversations(formatted);
    }
    setLoading(false);
  };

  const handleOpenChat = (partner: Profile) => {
    setIsOpen(false);
    window.dispatchEvent(
      new CustomEvent('openChatWithUser', {
        detail: { user: partner },
      })
    );
  };

  if (!currentUserId) return null;

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-xl transition-colors relative cursor-pointer ${
          isOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'
        }`}
        title="Hộp thư nhắn tin"
      >
        <MessageSquare className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>Đoạn chat gần đây</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">TLU Messenger</span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-xs text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Đang tải hộp thư...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 px-4 text-xs text-slate-400 space-y-1">
                <p className="font-bold text-slate-600">Chưa có tin nhắn nào</p>
                <p className="text-[11px]">Vào profile của bạn bè để bắt đầu cuộc trò chuyện!</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleOpenChat(conv.partner)}
                  className="w-full text-left p-3 hover:bg-blue-50/50 transition-colors flex items-center gap-3 cursor-pointer group"
                >
                  <UserAvatar src={conv.partner?.avatar_url} name={conv.partner?.full_name} size="md" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 truncate">
                        <span className="font-bold text-xs text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                          {conv.partner?.full_name || 'Sinh viên TLU'}
                        </span>
                        <UserBadge badge={conv.partner?.badge} size="sm" />
                      </div>
                      <span className="text-[9px] text-slate-400 shrink-0">
                        {new Date(conv.updated_at).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                      {conv.last_message || 'Đã mở cuộc trò chuyện'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}