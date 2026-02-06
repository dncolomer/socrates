-- ============================================
-- SOCRATES - Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  metadata JSONB DEFAULT '{}',  -- e.g. {"muse_device_name": "Muse-XXXX"}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- SESSIONS
-- ============================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  problem TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'ended_by_tutor')),
  duration_ms INTEGER DEFAULT 0,
  audio_path TEXT,              -- Supabase Storage path
  report TEXT,                  -- AI-generated session report (markdown)
  report_generated_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}', -- observer mode, frequency settings, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);

-- ============================================
-- PROBES (questions generated during sessions)
-- ============================================
CREATE TABLE probes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  timestamp_ms INTEGER NOT NULL,    -- ms since session start
  gap_score FLOAT NOT NULL,
  signals TEXT[] DEFAULT '{}',
  text TEXT NOT NULL,
  expanded_text TEXT,               -- filled on click-to-expand
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_probes_session_id ON probes(session_id);

-- ============================================
-- USER TRANSCRIPTS (think-aloud data)
-- ============================================
CREATE TABLE user_transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,         -- Supabase Storage path
  chunk_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_transcripts_user_id ON user_transcripts(user_id);

-- ============================================
-- TRANSCRIPT CHUNKS (for RAG retrieval)
-- ============================================
CREATE TABLE transcript_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transcript_id UUID REFERENCES user_transcripts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,            -- 200-400 word segment
  metadata JSONB DEFAULT '{}',     -- e.g. {"has_hesitation": true, "has_self_correction": true}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transcript_chunks_user_id ON transcript_chunks(user_id);
CREATE INDEX idx_transcript_chunks_transcript_id ON transcript_chunks(transcript_id);

-- ============================================
-- SESSION EEG DATA (Muse headband)
-- ============================================
CREATE TABLE session_eeg_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_name TEXT,
  data_path TEXT NOT NULL,       -- Supabase Storage path to JSON file
  duration_ms INTEGER,
  sample_count INTEGER,
  avg_band_powers JSONB,         -- session averages: {delta, theta, alpha, beta, gamma}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_eeg_data_session_id ON session_eeg_data(session_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE probes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_eeg_data ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Sessions: users can CRUD their own sessions
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions"
  ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE USING (auth.uid() = user_id);

-- Probes: users can access probes via session ownership
CREATE POLICY "Users can view own probes"
  ON probes FOR SELECT USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = probes.session_id AND sessions.user_id = auth.uid())
  );
CREATE POLICY "Users can create probes for own sessions"
  ON probes FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = probes.session_id AND sessions.user_id = auth.uid())
  );
CREATE POLICY "Users can update own probes"
  ON probes FOR UPDATE USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = probes.session_id AND sessions.user_id = auth.uid())
  );

-- User Transcripts: users can CRUD their own transcripts
CREATE POLICY "Users can view own transcripts"
  ON user_transcripts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own transcripts"
  ON user_transcripts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transcripts"
  ON user_transcripts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transcripts"
  ON user_transcripts FOR DELETE USING (auth.uid() = user_id);

-- Transcript Chunks: users can access their own chunks
CREATE POLICY "Users can view own transcript chunks"
  ON transcript_chunks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own transcript chunks"
  ON transcript_chunks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own transcript chunks"
  ON transcript_chunks FOR DELETE USING (auth.uid() = user_id);

-- Session EEG Data: users can access their own EEG data
CREATE POLICY "Users can view own eeg data"
  ON session_eeg_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own eeg data"
  ON session_eeg_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own eeg data"
  ON session_eeg_data FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKETS (run via Supabase dashboard or API)
-- ============================================
-- Create buckets:
--   1. session-audio (private) - audio files: {user_id}/{session_id}.webm
--   2. user-transcripts (private) - transcript files: {user_id}/{transcript_id}.txt
--   3. session-eeg (private) - EEG data: {user_id}/{session_id}_eeg.json
--
-- Storage RLS policies (set via dashboard):
--   - Users can read/write only within their own {user_id}/ folder
