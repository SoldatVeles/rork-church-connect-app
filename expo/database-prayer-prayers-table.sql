-- Create prayer_prayers junction table for tracking who is praying
CREATE TABLE IF NOT EXISTS prayer_prayers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prayer_id UUID REFERENCES prayers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(prayer_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prayer_prayers_prayer_id ON prayer_prayers(prayer_id);
CREATE INDEX IF NOT EXISTS idx_prayer_prayers_user_id ON prayer_prayers(user_id);

-- Enable Row Level Security
ALTER TABLE prayer_prayers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prayer_prayers
CREATE POLICY "Prayer prayers are viewable by everyone" 
  ON prayer_prayers FOR SELECT 
  USING (true);

CREATE POLICY "Users can add their own prayer commitment" 
  ON prayer_prayers FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own prayer commitment" 
  ON prayer_prayers FOR DELETE 
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON prayer_prayers TO authenticated;