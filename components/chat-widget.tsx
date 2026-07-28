'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Profile, MessageItem } from '@/types/database';
import UserAvatar from '@/components/user-avatar';
import UserBadge from '@/components/user-badge';
import { MessageSquare, X, Send, Loader2, Minus, Maximize2 } from 'lucide-react';
import Link from 'next/link';

export default function ChatWidget() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [targetUser, setTargetUser] = useState<Profile | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Tự động lấy currentUserId từ Supabase Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Lắng nghe Global Event khi bấm nút "Nhắn tin"
  useEffect(() => {
    const handleOpenChat = async (e: CustomEvent) => {
      const { user } = e.detail;
      if (!user) return;

      setTargetUser(user);
      setIsOpen(true);
      setIsMinimized(false);

      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (uid && user.id !== uid) {
        setCurrentUserId(uid);
        await initConversation(uid, user.id);
      }
    };

    window.addEventListener('openChatWithUser' as any, handleOpenChat);
    return () => {
      window.removeEventListener('openChatWithUser' as any, handleOpenChat);
    };
  }, []);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Lắng nghe Supabase Realtime Messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`realtime-chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as MessageItem;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Tìm hoặc Tạo hội thoại mới giữa 2 người
  const initConversation = async (myId: string, partnerId: string) => {
    setLoading(true);

    const [id1, id2] = [myId, partnerId].sort();

    let { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('user1_id', id1)
      .eq('user2_id', id2)
      .maybeSingle();

    if (!conv) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ user1_id: id1, user2_id: id2 })
        .select()
        .single();
      conv = newConv;
    }

    if (conv) {
      setConversationId(conv.id);

      const { data: msgData } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });

      if (msgData) setMessages(msgData);
    }

    setLoading(false);
  };

  // Gửi tin nhắn
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !conversationId || !currentUserId || sending) return;

    const text = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: text,
        });

      if (error) throw error;

      await supabase
        .from('conversations')
        .update({ last_message: text, updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    } catch (err: any) {
      alert('Không gửi được tin nhắn: ' + err.message);
      setInputMessage(text);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !currentUserId || !targetUser) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-88 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-200">
      
      {/* HEADER CHAT WIDGET */}
      <div className="bg-slate-900 text-white p-3 flex items-center justify-between shadow-xs">
        <Link
          href={`/profile/${targetUser.id}`}
          className="flex items-center gap-2.5 truncate hover:opacity-80 transition-opacity"
        >
          <UserAvatar src={targetUser.avatar_url} name={targetUser.full_name} size="sm" />
          <div className="truncate">
            <div className="flex items-center gap-1">
              <span className="font-bold text-xs truncate">{targetUser.full_name || 'Sinh viên TLU'}</span>
              <UserBadge badge={targetUser.badge} size="sm" />
            </div>
            <p className="text-[10px] text-emerald-400 font-medium">Đang hoạt động</p>
          </div>
        </Link>

        <div className="flex items-center gap-1 text-slate-400">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:text-white rounded transition-colors cursor-pointer"
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:text-rose-400 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KHUNG NỘI DUNG CHAT */}
      {!isMinimized && (
        <>
          <div className="h-80 overflow-y-auto p-3 space-y-2 bg-slate-50 text-xs">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Đang tải hội thoại...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-slate-400 py-12 space-y-1">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold text-slate-600">Bắt đầu trò chuyện!</p>
                <p className="text-[11px]">Hãy gửi tin nhắn đầu tiên cho {targetUser.full_name}.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === currentUserId;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[78%] px-3 py-2 rounded-2xl break-words ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-br-none shadow-xs'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                      }`}
                    >
                      <p className="leading-relaxed">{msg.content}</p>
                      <span
                        className={`text-[9px] block text-right mt-0.5 ${
                          isMe ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* FORM NHẬP TIN NHẮN */}
          <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-200 bg-white flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || sending}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-40 shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}