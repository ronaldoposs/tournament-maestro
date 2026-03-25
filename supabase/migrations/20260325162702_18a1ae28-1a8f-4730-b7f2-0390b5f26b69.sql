
-- Add mode column to tournaments
ALTER TABLE public.tournaments ADD COLUMN mode text NOT NULL DEFAULT 'solo';

-- Create teams table
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create team_members table
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  UNIQUE(team_id, participant_id)
);

-- Add team references to matches
ALTER TABLE public.matches ADD COLUMN team1_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.matches ADD COLUMN team2_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.matches ADD COLUMN winner_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- RLS for teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams viewable by everyone" ON public.teams FOR SELECT TO public USING (true);
CREATE POLICY "Organizers can insert teams" ON public.teams FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'organizer'));
CREATE POLICY "Organizers can update teams" ON public.teams FOR UPDATE TO public USING (has_role(auth.uid(), 'organizer'));
CREATE POLICY "Organizers can delete teams" ON public.teams FOR DELETE TO public USING (has_role(auth.uid(), 'organizer'));

-- RLS for team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members viewable by everyone" ON public.team_members FOR SELECT TO public USING (true);
CREATE POLICY "Organizers can insert team members" ON public.team_members FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'organizer'));
CREATE POLICY "Organizers can delete team members" ON public.team_members FOR DELETE TO public USING (has_role(auth.uid(), 'organizer'));
