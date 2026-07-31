'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import UserAvatar from '@/components/user-avatar';
import Link from 'next/link';
import { ArrowLeft, UserPlus, UserCheck, UserX, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner'; // 💥 IMPORT TOAST BẮT MẮT

export default function FriendsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchRequests(session.user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const fetchRequests = async (userId: string) => {
    setLoading(true);

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
          faculty,
          badge
        )
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending');

    if (error) {
      console.error('Lỗi fetch lời mời kết bạn:', error.message);
      toast.error('Không thể tải danh sách lời mời!');
    } else if (data) {
      setRequests(data);
    }
    setLoading(false);
  };

  const handleAction = async (requestId: string, status: 'accepted' | 'rejected') => {
    setProcessingId(requestId);
    try {
      if (status === 'accepted') {
        const { error } = await supabase.from('friends').update({ status: 'accepted' }).eq('id', requestId);
        if (error) throw error;
        toast.success('Đã chấp nhận lời mời kết bạn!');
      } else {
        const { error } = await supabase.from('friends').delete().eq('id', requestId);
        if (error) throw error;
        toast.info('Đã xóa lời mời kết bạn');
      }

      setRequests((prev) => prev.filter((req) => req.id !== requestId));

      // Bắn event thông báo re-fetch FriendButton toàn hệ thống
      window.dispatchEvent(new Event('friendshipUpdated'));
    } catch (err: any) {
      toast.error('Có lỗi xảy ra!', { description: err.message });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f0f2f5] text-slate-800 pb-12">
      {/* Top Header Navigation */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <h1 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" /> Lời mời kết bạn
          </h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-3 sm:p-4 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
          <h2 className="font-bold text-sm text-slate-800 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <span>Yêu cầu chờ phản hồi</span>
            </span>
            <span className="bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full text-xs font-extrabold">
              {requests.length}
            </span>
          </h2>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-400 text-xs font-semibold">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Đang tải lời mời...</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-slate-400 text-xs">
              <UserPlus className="w-8 h-8 mx-auto text-slate-300" />
              <p>Hiện không có lời mời kết bạn nào.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.map((req) => (
                <div key={req.id} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                  <Link href={`/profile/${req.profiles?.id}`} className="flex items-center gap-3 min-w-0 flex-1 group">
                    <UserAvatar src={req.profiles?.avatar_url} name={req.profiles?.full_name} size="md" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                        {req.profiles?.full_name || 'Sinh viên TLU'}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {req.profiles?.faculty ? `Khoa ${req.profiles.faculty}` : 'Thành viên TLU'}
                      </p>
                    </div>
                  </Link>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      disabled={processingId === req.id}
                      onClick={() => handleAction(req.id, 'accepted')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {processingId === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5" />
                      )}
                      <span>Đồng ý</span>
                    </button>
                    <button
                      disabled={processingId === req.id}
                      onClick={() => handleAction(req.id, 'rejected')}
                      className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                      title="Xóa lời mời"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}