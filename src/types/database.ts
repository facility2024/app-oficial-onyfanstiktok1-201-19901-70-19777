// Database types for the application

export interface User {
  id: string;
  username: string;
  avatar_url: string;
  followers_count: number;
  following_count: number;
  is_online: boolean;
  bio?: string;
  posting_panel_url?: string;
  created_at: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  thumbnail_locked?: string;
  user_id: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  music_name: string;
  is_active: boolean;
  visibility?: 'public' | 'premium';
  created_at: string;
  user?: User;
}

export interface Comment {
  id: string;
  text: string;
  user_id: string;
  video_id: string;
  likes_count: number;
  created_at: string;
  user?: {
    username: string;
    avatar_url: string;
  };
}

export interface Like {
  id: string;
  user_id: string;
  video_id: string;
  created_at: string;
}