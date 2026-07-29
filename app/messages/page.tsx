'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import UserAvatar from '@/components/user-avatar';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Loader2, Search } from 'lucide-react';

export default function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUserId(session.user.id);
        fetchConversations(session.user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const fetchConversations = async (userId: string) => {
    setLoading(true);

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        user1:profiles!conversations_user1_id_fkey(*),
        user2:profiles!conversations_user2_id_fkey(*)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      const formatted = data.map((c) => {
        const partner = c.user1_id === userId ? c.user2 : c.user1;
        return {
          id: c.id,
          partner,
          last_message: c.last_message,
          updated_at: c.updated_at,
        };
      });
      setConversations(formatted);
    }
    setLoading(false);
  };

  const filteredConversations = conversations.filter((c) =>
    c.partner?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#f0f2f5] text-slate-800 pb-12">
      {/* Top Header Navigation */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <h1 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" /> Tin nhắn
          </h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-3 sm:p-4 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm bạn bè trò chuyện..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        {/* Conversations List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-400 text-xs font-semibold">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Đang tải tin nhắn...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-slate-400 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
              <p>Chưa có cuộc trò chuyện nào.</p>
            </div>
          ) : (
            filteredConversations.map((c) => (
              <Link
                key={c.id}
                href={`/messages/${c.partner?.id}`}
                className="flex items-center gap-3 p-3.5 hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <UserAvatar src={c.partner?.avatar_url} name={c.partner?.full_name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-xs text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                      {c.partner?.full_name || 'Sinh viên TLU'}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {new Date(c.updated_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                    {c.last_message || 'Bắt đầu cuộc trò chuyện...'}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}