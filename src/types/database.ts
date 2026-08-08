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
  visibility?: 'public' | 'private';
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

// Individual Model Subscription Plans
export interface ModelSubscriptionPlan {
  id: string;
  model_id: string;
  model_type: 'model' | 'creator';
  plan_type: 'mensal' | 'trimestral' | 'anual';
  price: number;
  discount_label: string | null;
  payment_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Individual Model Subscriptions
export interface ModelSubscription {
  id: string;
  subscriber_id: string | null;
  subscriber_email: string;
  model_id: string;
  model_type: 'model' | 'creator';
  subscription_type: 'mensal' | 'trimestral' | 'anual';
  subscription_status: 'active' | 'expired' | 'cancelled';
  subscription_start: string;
  subscription_end: string;
  price_paid: number | null;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
}
