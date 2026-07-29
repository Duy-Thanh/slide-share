'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import UserAvatar from '@/components/user-avatar';
import UserBadge from '@/components/user-badge';
import Link from 'next/link';
import { Users, UserX, X } from 'lucide-react';

interface Props {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function FriendListModal({ userId, isOpen, onClose }: Props) {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) fetchFriends();
  }, [isOpen, userId]);

  const fetchFriends = async () => {
    setLoading(true);
    // Lấy bạn bè (dù userId là sender hay receiver)
    const { data } = await supabase
      .from('friends')
      .select('*, sender:profiles!sender_id(*), receiver:profiles!receiver_id(*)')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (data) {
      const formatted = data.map((item) => {
        const friendProfile = item.sender_id === userId ? item.receiver : item.sender;
        return {
          friendshipId: item.id,
          profile: friendProfile,
        };
      });
      setFriends(formatted);
    }
    setLoading(false);
  };

  const handleUnfriend = async (friendshipId: string) => {
    if (!confirm('Hủy kết bạn với người này?')) return;
    await supabase.from('friends').delete().eq('id', friendshipId);
    setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId));

    // BẮN EVENT CẬP NHẬT TRẠNG THÁI REALTIME CHO CÁC FRIEND_BUTTON KHÁC
    window.dispatchEvent(new Event('friendshipUpdated'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-4 sm:p-5 space-y-3">
        {/* Header Modal */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
          <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm flex items-center gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <span>Danh sách bạn bè ({friends.length})</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List Bạn bè */}
        <div className="space-y-2 overflow-y-auto flex-1 no-scrollbar pr-0.5">
          {loading ? (
            <p className="text-center text-xs text-slate-400 py-8">Đang tải danh sách...</p>
          ) : friends.length > 0 ? (
            friends.map(({ friendshipId, profile }) => (
              <div
                key={friendshipId}
                className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors text-xs gap-2"
              >
                <Link
                  href={`/profile/${profile.id}`}
                  onClick={onClose}
                  className="flex items-center gap-2.5 truncate flex-1 min-w-0"
                >
                  <UserAvatar src={profile.avatar_url} name={profile.full_name} size="md" className="shrink-0" />
                  <div className="truncate min-w-0 flex-1">
                    <div className="flex items-center gap-1 truncate">
                      <p className="font-bold text-slate-800 truncate">{profile.full_name || 'Sinh viên TLU'}</p>
                      <UserBadge badge={profile.badge} size="sm" />
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{profile.faculty ? `Khoa ${profile.faculty}` : 'TLUer'}</p>
                  </div>
                </Link>

                <button
                  onClick={() => handleUnfriend(friendshipId)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Hủy bạn</span>
                </button>
              </div>
            ))
          ) : (
            <p className="text-center text-xs text-slate-400 py-8 font-medium">Chưa có bạn bè nào.</p>
          )}
        </div>
      </div>
    </div>
  );
}