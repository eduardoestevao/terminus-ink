-- Profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  affiliation TEXT,
  bio         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_approved BOOLEAN NOT NULL DEFAULT false
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_name', NEW.raw_user_meta_data->>'preferred_username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- API keys for programmatic access (MCP + REST)
CREATE TABLE public.api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash    TEXT NOT NULL UNIQUE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used   TIMESTAMPTZ,
  revoked     BOOLEAN NOT NULL DEFAULT false
);

-- Experiments
CREATE TABLE public.experiments (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  question        TEXT NOT NULL,
  setup           TEXT NOT NULL,
  results_json    JSONB NOT NULL,
  key_findings    JSONB NOT NULL,
  tags            JSONB NOT NULL,
  author_id       UUID NOT NULL REFERENCES public.profiles(id),
  chain_prev      TEXT,
  chain_next      TEXT,
  lesson_learned  TEXT,
  tools_used      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'pending_review'))
);

CREATE INDEX idx_experiments_date ON public.experiments(date DESC);
CREATE INDEX idx_experiments_author ON public.experiments(author_id);
CREATE INDEX idx_experiments_status ON public.experiments(status);
CREATE INDEX idx_experiments_tags ON public.experiments USING GIN (tags);

-- Experiment ID counter
CREATE TABLE public.counters (
  name  TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);
INSERT INTO public.counters (name, value) VALUES ('experiment_id', 0);

-- Atomic counter increment function
CREATE OR REPLACE FUNCTION public.increment_counter(counter_name TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_value INTEGER;
BEGIN
  UPDATE public.counters
  SET value = value + 1
  WHERE name = counter_name
  RETURNING value INTO new_value;
  RETURN new_value;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;

-- Public reads
CREATE POLICY "Public read profiles" ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "Public read experiments" ON public.experiments
  FOR SELECT USING (status = 'published');

-- Profile management
CREATE POLICY "Own profile update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Experiment writes (service role bypasses RLS for API key auth)
CREATE POLICY "Auth insert experiments" ON public.experiments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- API keys: owner only
CREATE POLICY "Own keys read" ON public.api_keys
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own keys insert" ON public.api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own keys update" ON public.api_keys
  FOR UPDATE USING (auth.uid() = user_id);

-- Counter: readable by authenticated, writable via function
CREATE POLICY "Auth read counters" ON public.counters
  FOR SELECT USING (true);
