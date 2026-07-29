'use client';

import { useState, useEffect, useRef, use } from 'react';
import { supabase } from '@/lib/supabase';
import UserAvatar from '@/components/user-avatar';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import UserBadge from '@/components/user-badge';

// Helper tính toán trạng thái Online dựa trên last_seen
function getOnlineStatus(lastSeen: string | null) {
  if (!lastSeen) return { isOnline: false, text: 'Ngoại tuyến' };

  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - lastSeenDate.getTime()) / 1000);

  // Dưới 3 phút tính là Đang hoạt động
  if (diffInSeconds < 180) {
    return { isOnline: true, text: 'Đang hoạt động' };
  }

  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) {
    return { isOnline: false, text: `Hoạt động ${minutes} phút trước` };
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return { isOnline: false, text: `Hoạt động ${hours} giờ trước` };
  }

  const days = Math.floor(hours / 24);
  return { isOnline: false, text: `Hoạt động ${days} ngày trước` };
}

export default function DirectMessagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: targetUserId } = use(params);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUserId(session.user.id);
        initChat(session.user.id, targetUserId);
      }
    });
  }, [targetUserId]);

  const initChat = async (myId: string, partnerId: string) => {
    setLoading(true);

    // 1. Fetch thông tin người nhận
    const { data: partnerProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', partnerId)
      .single();

    if (partnerProfile) setTargetUser(partnerProfile);

    // 💥 FIX LỖI: Chuỗi `.on()` xong xuôi mới gọi `.subscribe()`
    const userChannel = supabase
      .channel(`profile-${partnerId}-${Math.random().toString(36).substring(2, 7)}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${partnerId}`,
        },
        (payload) => {
          setTargetUser(payload.new);
        }
      )
      .subscribe();

    // 2. Lấy hoặc tạo cuộc trò chuyện (Conversation)
    let { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(user1_id.eq.${myId},user2_id.eq.${partnerId}),and(user1_id.eq.${partnerId},user2_id.eq.${myId})`)
      .maybeSingle();

    if (!conv) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ user1_id: myId, user2_id: partnerId, last_message: '' })
        .select()
        .single();
      conv = newConv;
    }

    if (conv) {
      setConversationId(conv.id);
      fetchMessages(conv.id);
      subscribeRealtimeMessages(conv.id);
    } else {
      setLoading(false);
    }

    return () => {
      supabase.removeChannel(userChannel);
    };
  };

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      setTimeout(scrollToBottom, 100);
    }
    setLoading(false);
  };

  const subscribeRealtimeMessages = (convId: string) => {
    const channelName = `chat-${convId}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === payload.new.id)) {
              return prev;
            }
            return [...prev, payload.new];
          });
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUserId || !conversationId || sending) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const { error } = await supabase.from('messages').insert({
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
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  const statusInfo = getOnlineStatus(targetUser?.last_seen);

  return (
    <main className="flex flex-col h-screen bg-[#f0f2f5] text-slate-800">
      {/* HEADER TOPBAR */}
      <div className="bg-white border-b border-slate-200 px-3 py-2.5 flex items-center justify-between shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-3">
          <Link href="/messages" className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Link>

          {targetUser && (
            <Link href={`/profile/${targetUser.id}`} className="flex items-center gap-2.5 group">
              <div className="relative">
                <UserAvatar src={targetUser.avatar_url} name={targetUser.full_name} size="sm" />
                {/* 🔴/🟢 CHẤM BÁO TRẠNG THÁI REALTIME */}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                    statusInfo.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
              </div>

              <div>
                <h3 className="font-bold text-xs text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-1">
                  <span>{targetUser.full_name || 'Sinh viên TLU'}</span>
                  <UserBadge badge={targetUser.badge} size="sm" />
                </h3>
                {/* 🟢/⚪ TRẠNG THÁI CHUẨN REALTIME */}
                <p className={`text-[10px] font-medium ${statusInfo.isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {statusInfo.text}
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* NỘI DUNG TIN NHẮN */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-xs text-slate-400 font-semibold">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>Đang tải tin nhắn...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 text-xs text-slate-400 space-y-1">
            <p className="font-bold text-slate-600">Chưa có tin nhắn nào!</p>
            <p>Hãy gửi lời chào mở bát cuộc trò chuyện ngay thôi.</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div key={`${msg.id}-${idx}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-2xs ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                  }`}
                >
                  <p>{msg.content}</p>
                  <span
                    className={`block text-[9px] mt-1 text-right ${
                      isMe ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* FORM NHẬP TIN NHẮN */}
      <form onSubmit={handleSendMessage} className="bg-white border-t border-slate-200 p-2.5 sm:p-3 flex items-center gap-2 shrink-0">
        <input
          type="text"
          placeholder="Viết tin nhắn..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={sending}
          className="flex-1 px-4 py-2 bg-slate-100 text-slate-900 border-none rounded-full text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || sending}
          className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-40 shrink-0 cursor-pointer"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </main>
  );
}