-- Soften validation for bonus_users WhatsApp to avoid breaking inserts while still sanitizing
CREATE OR REPLACE FUNCTION public.validate_input_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Validate emails (still strict)
    IF NEW.email IS NOT NULL AND NEW.email !~ '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$' THEN
        RAISE EXCEPTION 'Invalid email: %', NEW.email;
    END IF;

    -- Sanitize WhatsApp for bonus_users without rejecting common BR formats
    IF TG_TABLE_NAME = 'bonus_users' AND NEW.whatsapp IS NOT NULL THEN
        -- Remove non-digits
        NEW.whatsapp := regexp_replace(NEW.whatsapp, '[^0-9]', '', 'g');
        -- Normalize to E.164 if possible
        IF length(NEW.whatsapp) = 11 THEN
            -- Assume Brazil number without country code
            NEW.whatsapp := '+55' || NEW.whatsapp;
        ELSIF length(NEW.whatsapp) = 13 AND left(NEW.whatsapp, 2) = '55' THEN
            NEW.whatsapp := '+' || NEW.whatsapp;
        ELSIF NEW.whatsapp ~ '^[0-9]{10,14}$' THEN
            NEW.whatsapp := '+' || NEW.whatsapp;
        END IF;
        -- Do NOT raise exception for phone format to preserve UX
    END IF;

    -- Sanitize names (remove dangerous special characters)
    IF NEW.name IS NOT NULL THEN
        NEW.name := regexp_replace(NEW.name, '[<>"'';&]', '', 'g');
    END IF;

    RETURN NEW;
END;
$function$;