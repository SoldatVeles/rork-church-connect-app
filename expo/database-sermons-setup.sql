-- Create sermons table
CREATE TABLE IF NOT EXISTS public.sermons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    speaker TEXT NOT NULL,
    date TEXT NOT NULL,
    duration TEXT NOT NULL,
    description TEXT NOT NULL,
    topic TEXT NOT NULL,
    youtube_url TEXT,
    thumbnail_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.sermons ENABLE ROW LEVEL SECURITY;

-- Everyone can view sermons
CREATE POLICY "sermons_read_all" ON public.sermons
    FOR SELECT
    USING (true);

-- Only admins and pastors can insert sermons
CREATE POLICY "sermons_insert_admin_pastor" ON public.sermons
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'pastor')
        )
    );

-- Only admins and pastors can update sermons
CREATE POLICY "sermons_update_admin_pastor" ON public.sermons
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'pastor')
        )
    );

-- Only admins and pastors can delete sermons
CREATE POLICY "sermons_delete_admin_pastor" ON public.sermons
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'pastor')
        )
    );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS sermons_date_idx ON public.sermons(date DESC);
CREATE INDEX IF NOT EXISTS sermons_is_featured_idx ON public.sermons(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS sermons_created_by_idx ON public.sermons(created_by);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_sermons_updated_at ON public.sermons;
CREATE TRIGGER update_sermons_updated_at
    BEFORE UPDATE ON public.sermons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.sermons IS 'Stores sermon information including title, speaker, and YouTube links';
