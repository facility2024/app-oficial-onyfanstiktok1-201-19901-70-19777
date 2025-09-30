-- Create shares table for tracking individual share events
CREATE TABLE public.shares (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    user_id UUID NOT NULL,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    model_id UUID REFERENCES public.models(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL DEFAULT 'web',
    shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for better performance
CREATE INDEX idx_shares_user_id ON public.shares(user_id);
CREATE INDEX idx_shares_video_id ON public.shares(video_id);
CREATE INDEX idx_shares_model_id ON public.shares(model_id);
CREATE INDEX idx_shares_created_at ON public.shares(created_at);

-- Enable Row Level Security
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- Create RLS policies to allow public read and authenticated users to insert their own shares
CREATE POLICY "Anyone can view shares" ON public.shares FOR SELECT USING (true);
CREATE POLICY "Users can insert their own shares" ON public.shares FOR INSERT WITH CHECK (true);

-- Create trigger to update shares_count in videos table
CREATE OR REPLACE FUNCTION public.update_shares_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment video shares_count
        UPDATE public.videos 
        SET shares_count = COALESCE(shares_count, 0) + 1,
            updated_at = NOW()
        WHERE id = NEW.video_id;
        
        -- Increment model total_shares if model_id exists
        IF NEW.model_id IS NOT NULL THEN
            UPDATE public.models 
            SET total_shares = COALESCE(total_shares, 0) + 1,
                updated_at = NOW()
            WHERE id = NEW.model_id;
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement video shares_count
        UPDATE public.videos 
        SET shares_count = GREATEST(COALESCE(shares_count, 0) - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.video_id;
        
        -- Decrement model total_shares if model_id exists
        IF OLD.model_id IS NOT NULL THEN
            UPDATE public.models 
            SET total_shares = GREATEST(COALESCE(total_shares, 0) - 1, 0),
                updated_at = NOW()
            WHERE id = OLD.model_id;
        END IF;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$function$;

-- Create trigger for shares count updates
CREATE TRIGGER update_shares_count_trigger
    AFTER INSERT OR DELETE ON public.shares
    FOR EACH ROW
    EXECUTE FUNCTION public.update_shares_count();

-- Create trigger for updated_at
CREATE TRIGGER update_shares_updated_at
    BEFORE UPDATE ON public.shares
    FOR EACH ROW
    EXECUTE FUNCTION public.update_video_shares_updated_at();