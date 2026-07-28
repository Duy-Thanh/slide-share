'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import UserAvatar from '@/components/user-avatar';
import { UserCheck, UserX, UserPlus } from 'lucide-react';

interface Props {
  currentUserId: string;
}

export default function FriendRequestsPopover({ currentUserId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    if (currentUserId) {
      fetchRequests();
    }
  }, [currentUserId]);

  const fetchRequests = async () => {
    if (!currentUserId) return;

    // Fetch lời mời kết bạn có status là 'pending' gửi ĐẾN currentUserId
    const { data, error } = await supabase
      .from('friends')
      .select(`
        id,
        sender_id,
        receiver_id,
        status,
        created_at,
        profiles:sender_id (
          id,
          full_name,
          avatar_url,
          faculty
        )
      `)
      .eq('receiver_id', currentUserId)
      .eq('status', 'pending');

    if (error) {
      console.error('Lỗi fetch lời mời kết bạn:', error.message);
      return;
    }

    if (data) {
      setRequests(data);
    }
  };

  const handleAction = async (requestId: string, status: 'accepted' | 'rejected') => {
    if (status === 'accepted') {
        await supabase.from('friends').update({ status: 'accepted' }).eq('id', requestId);
    } else {
        await supabase.from('friends').delete().eq('id', requestId);
    }

    fetchRequests();

    // 💥 BẮN SỰ KIỆN ĐỂ TẤT CẢ FRIEND_BUTTON TRÊN MÀN HÌNH BIẾT MÀ RE-FETCH LẠI
    window.dispatchEvent(new Event('friendshipUpdated'));
    };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchRequests(); // Re-fetch mỗi khi click mở popover
        }}
        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors relative cursor-pointer"
        title="Lời mời kết bạn"
      >
        <UserPlus className="w-5 h-5" />
        {requests.length > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
            {requests.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <h4 className="font-bold text-xs text-slate-800 mb-2 border-b border-slate-100 pb-2 flex justify-between">
            <span>Lời mời kết bạn</span>
            <span className="text-blue-600 font-semibold">{requests.length}</span>
          </h4>

          <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
            {requests.length > 0 ? (
              requests.map((req) => (
                <div key={req.id} className="flex items-center justify-between gap-2 p-2 hover:bg-slate-50 rounded-xl transition-colors text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <UserAvatar src={req.profiles?.avatar_url} name={req.profiles?.full_name} size="sm" />
                    <span className="font-bold text-slate-800 truncate">{req.profiles?.full_name || 'Sinh viên TLU'}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleAction(req.id, 'accepted')}
                      className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                      title="Đồng ý"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleAction(req.id, 'rejected')}
                      className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="Xóa"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-slate-400 py-4 font-medium">Không có lời mời nào.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}