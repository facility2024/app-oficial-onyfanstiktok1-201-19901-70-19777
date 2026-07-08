-- Corrige thumbnail_url dos vídeos Bunny que ficaram apontando para o embed do player
-- (a partir de agora a edge function grava o JPG real do CDN).
UPDATE public.videos
SET thumbnail_url = regexp_replace(
      thumbnail_url,
      '^https?://player\.mediadelivery\.net/embed/([0-9]+)/([0-9a-fA-F-]+).*$',
      'https://vz-2342b018-2d3.b-cdn.net/\2/thumbnail.jpg'
    )
WHERE thumbnail_url ~ '^https?://player\.mediadelivery\.net/embed/';