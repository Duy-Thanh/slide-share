export interface Profile {
  id: string;
  full_name: string;
  student_code?: string;
  faculty?: string;
  class_name?: string;
  avatar_url?: string;
  points: number;
  badge?: 'verified' | 'vip' | 'admin' | null; // 💥 THÊM DÒNG NÀY
  created_at: string;
}

export interface DocumentItem {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  subject: string;
  faculty: string;
  doc_type: 'Slide' | 'Đề thi' | 'Đồ án' | 'Giáo trình' | 'Đề cương' | 'Khác';
  semester?: string;
  file_id: string;
  file_name: string;
  file_size: number;
  file_ext?: string;
  upvotes_count: number;
  downloads_count: number;
  views_count: number;
  comments_count?: number; // 💥 THÊM DÒNG NÀY VÀO!
  created_at: string;
  profiles?: Profile; // Relational join
  has_upvoted?: boolean; // State riêng của user hiện tại
  has_bookmarked?: boolean;
}

export interface CommentItem {
  id: string;
  user_id: string;
  document_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message?: string;
  updated_at: string;
  created_at: string;
  user1?: Profile;
  user2?: Profile;
}

export interface MessageItem {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
}