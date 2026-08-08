-- CRITICAL SECURITY FIX: Enable Row Level Security on all tables
-- Fixed type casting issues

-- Enable RLS on all user-related tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on location and sensitive data tables
ALTER TABLE public.localizacao_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_localizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_localizacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locais_favoritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins_locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deteccao_movimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes_localizacao ENABLE ROW LEVEL SECURITY;

-- Enable RLS on gamification tables
ALTER TABLE public.sistema_pontos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missoes_desafios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progresso_missoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_premios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premios_usuarios ENABLE ROW LEVEL SECURITY;

-- Enable RLS on event and content tables
ALTER TABLE public.eventos_ao_vivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participantes_evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios_evento_vivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reacoes_evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paginas_aplicativo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conteudo_paginas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curtidas_reacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compartilhamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links_compartilhamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_analytics ENABLE ROW LEVEL SECURITY;

-- Create user profiles table for authentication
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email TEXT,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for user data protection

-- Profiles table policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin policies for profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Videos table policies
CREATE POLICY "Anyone can view active videos" ON public.videos
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage videos" ON public.videos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Models table policies
CREATE POLICY "Anyone can view active models" ON public.models
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage models" ON public.models
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Comments table policies
CREATE POLICY "Users can view approved comments" ON public.comments
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can create comments" ON public.comments
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own comments" ON public.comments
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can manage all comments" ON public.comments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Likes table policies
CREATE POLICY "Users can view likes" ON public.likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own likes" ON public.likes
    FOR ALL USING (auth.uid()::text = user_id);

-- Shares table policies
CREATE POLICY "Users can view shares" ON public.shares
    FOR SELECT USING (true);

CREATE POLICY "Users can create shares" ON public.shares
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Daily actions policies
CREATE POLICY "Users can view their own daily actions" ON public.daily_actions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create their own daily actions" ON public.daily_actions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Points history policies
CREATE POLICY "Users can view their own points history" ON public.points_history
    FOR SELECT USING (auth.uid()::text = user_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Location data policies (HIGHLY SENSITIVE)
CREATE POLICY "Users can view their own location data" ON public.localizacao_usuarios
    FOR SELECT USING (auth.uid()::text = usuario_id);

CREATE POLICY "Users can update their own location data" ON public.localizacao_usuarios
    FOR ALL USING (auth.uid()::text = usuario_id);

CREATE POLICY "Users can view their own location history" ON public.historico_localizacoes
    FOR SELECT USING (auth.uid()::text = usuario_id);

CREATE POLICY "Users can manage their own location settings" ON public.configuracoes_localizacao
    FOR ALL USING (auth.uid()::text = usuario_id);

-- User settings policies
CREATE POLICY "Users can manage their own settings" ON public.configuracoes_usuario
    FOR ALL USING (auth.uid()::text = usuario_id);

-- Analytics policies (Admin only for sensitive data)
CREATE POLICY "Admins can view analytics" ON public.analytics_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Audit logs (Admin only)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Online users (limited access)
CREATE POLICY "Users can view online status" ON public.online_users
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own online status" ON public.online_users
    FOR ALL USING (auth.uid()::text = user_id);

-- System settings (Admin only)
CREATE POLICY "Admins can manage system settings" ON public.system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Campaigns (Admin management)
CREATE POLICY "Users can view active campaigns" ON public.campaigns
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage campaigns" ON public.campaigns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Create trigger for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, username, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();