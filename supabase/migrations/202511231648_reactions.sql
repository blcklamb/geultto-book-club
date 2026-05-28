-- Emoji reactions for quotes and reviews
CREATE TABLE IF NOT EXISTS public.quote_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()),
  UNIQUE (quote_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.review_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()),
  UNIQUE (review_id, user_id, emoji)
);

ALTER TABLE public.quote_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_reactions ENABLE ROW LEVEL SECURITY;
