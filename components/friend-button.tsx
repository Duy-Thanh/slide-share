'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, UserCheck, Clock, UserX } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  currentUserId?: string;
  targetUserId: string;
}

export default function FriendButton({ currentUserId, targetUserId }: Props) {
  const [status, setStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'accepted'>('none');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUserId && targetUserId && currentUserId !== targetUserId) {
      checkFriendshipStatus();

      // 💥 LẮNG NGHE SỰ KIỆN CẬP NHẬT TỪ POPOVER HOẶC BUTTON KHÁC
      const handleGlobalUpdate = () => checkFriendshipStatus();
      window.addEventListener('friendshipUpdated', handleGlobalUpdate);

      return () => {
        window.removeEventListener('friendshipUpdated', handleGlobalUpdate);
      };
    }
  }, [currentUserId, targetUserId]);

  const checkFriendshipStatus = async () => {
    if (!currentUserId) return;

    const { data } = await supabase
      .from('friends')
      .select('*')
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`)
      .maybeSingle();

    if (data) {
      setRequestId(data.id);
      if (data.status === 'accepted') {
        setStatus('accepted');
      } else if (data.status === 'pending') {
        if (data.sender_id === currentUserId) {
          setStatus('pending_sent');
        } else {
          setStatus('pending_received');
        }
      }
    } else {
      // BẮT BUỘC RESET VỀ NONE NẾU DB KHÔNG CÒN RECORD (ĐÃ BỊ XÓA/TỪ CHỐI)
      setStatus('none');
      setRequestId(null);
    }
  };

  if (!currentUserId || currentUserId === targetUserId) return null;

  // HELPER CHECK BAN CẢ 2 BÊN
  const checkBanStatus = async (): Promise<boolean> => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, is_banned')
      .in('id', [currentUserId, targetUserId]);

    const myProfile = profiles?.find((p) => p.id === currentUserId);
    const targetProfile = profiles?.find((p) => p.id === targetUserId);

    if (myProfile?.is_banned) {
      toast.error('Tài khoản bị khóa!', {
        description: 'Tài khoản của bạn đã bị BAN vĩnh viễn.',
      });
      await supabase.auth.signOut();
      window.location.href = '/';
      return true;
    }

    if (targetProfile?.is_banned) {
      toast.error('Không thể kết bạn!', {
        description: 'Tài khoản này đã bị khóa vĩnh viễn.',
      });
      return true;
    }

    return false;
  };

  // BẮN SỰ KIỆN ĐỂ BÁO CHO MẤY COMPONENT KHÁC VÀ POPOVER
  const notifyUpdate = () => {
    window.dispatchEvent(new Event('friendshipUpdated'));
  };

  const handleSendRequest = async () => {
    setLoading(true);

    if (await checkBanStatus()) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('friends')
      .insert({ sender_id: currentUserId, receiver_id: targetUserId, status: 'pending' })
      .select()
      .single();

    if (!error && data) {
      setStatus('pending_sent');
      setRequestId(data.id);
      notifyUpdate();
      toast.success('Đã gửi lời mời kết bạn');
    } else if (error) {
      toast.error('Không thể gửi lời mời!', { description: error.message });
    }
    setLoading(false);
  };

  const handleAccept = async () => {
    if (!requestId) return;
    setLoading(true);

    if (await checkBanStatus()) {
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (!error) {
      setStatus('accepted');
      notifyUpdate();
      toast.success('Đã trở thành bạn bè 🎉');
    } else {
      toast.error('Lỗi chấp nhận lời mời!', { description: error.message });
    }
    setLoading(false);
  };

  const handleCancelOrUnfriend = async () => {
    let idToDelete = requestId;

    if (!idToDelete && currentUserId && targetUserId) {
      const { data } = await supabase
        .from('friends')
        .select('id')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`)
        .maybeSingle();
      if (data) idToDelete = data.id;
    }

    if (!idToDelete) {
      setStatus('none');
      return;
    }

    if (status === 'accepted' && !confirm('Bạn có chắc muốn hủy kết bạn?')) return;

    setLoading(true);
    const { error } = await supabase.from('friends').delete().eq('id', idToDelete);

    if (!error) {
      setStatus('none');
      setRequestId(null);
      notifyUpdate();
    }
    setLoading(false);
  };

  if (loading) {
    return <span className="text-[11px] text-slate-400 font-medium animate-pulse">...</span>;
  }

  if (status === 'accepted') {
    return (
      <button
        onClick={handleCancelOrUnfriend}
        className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 group cursor-pointer"
      >
        <UserCheck className="w-3.5 h-3.5 text-emerald-600 group-hover:hidden" />
        <UserX className="w-3.5 h-3.5 text-rose-600 hidden group-hover:block" />
        <span className="group-hover:hidden">Bạn bè</span>
        <span className="hidden group-hover:inline">Hủy bạn</span>
      </button>
    );
  }

  if (status === 'pending_sent') {
    return (
      <button
        onClick={handleCancelOrUnfriend}
        className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer group"
        title="Bấm để hủy lời mời"
      >
        <Clock className="w-3.5 h-3.5 text-amber-500 group-hover:text-rose-600" />
        <span className="group-hover:hidden">Đã gửi</span>
        <span className="hidden group-hover:inline">Hủy mời</span>
      </button>
    );
  }

  if (status === 'pending_received') {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleAccept}
          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg transition-colors shadow-xs cursor-pointer"
        >
          Đồng ý
        </button>
        <button
          onClick={handleCancelOrUnfriend}
          className="px-2 py-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
        >
          Từ chối
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleSendRequest}
      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
    >
      <UserPlus className="w-3.5 h-3.5" />
      <span>Kết bạn</span>
    </button>
  );
}