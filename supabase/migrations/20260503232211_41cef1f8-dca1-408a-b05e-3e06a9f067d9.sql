
-- Add image columns
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create public buckets for tournament logos and participant avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('tournament-logos', 'tournament-logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('participant-avatars', 'participant-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, organizers write
CREATE POLICY "Public read tournament logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'tournament-logos');

CREATE POLICY "Organizers upload tournament logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tournament-logos' AND public.has_role(auth.uid(), 'organizer'::app_role));

CREATE POLICY "Organizers update tournament logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'tournament-logos' AND public.has_role(auth.uid(), 'organizer'::app_role));

CREATE POLICY "Organizers delete tournament logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'tournament-logos' AND public.has_role(auth.uid(), 'organizer'::app_role));

CREATE POLICY "Public read participant avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'participant-avatars');

CREATE POLICY "Organizers upload participant avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'participant-avatars' AND public.has_role(auth.uid(), 'organizer'::app_role));

CREATE POLICY "Organizers update participant avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'participant-avatars' AND public.has_role(auth.uid(), 'organizer'::app_role));

CREATE POLICY "Organizers delete participant avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'participant-avatars' AND public.has_role(auth.uid(), 'organizer'::app_role));

-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
