import { supabase } from '@/lib/supabase';
import type {
  CreateSermonInput,
  Sermon,
} from '@/types/sermon';

const SERMON_COLUMNS =
  'id, title, speaker, date, duration, description, topic, youtube_url, thumbnail_url, is_featured, created_by, created_at, updated_at';

function cleanInput(input: CreateSermonInput): CreateSermonInput {
  return {
    title: input.title.trim(),
    speaker: input.speaker.trim(),
    date: input.date.trim(),
    duration: input.duration.trim(),
    description: input.description.trim(),
    topic: input.topic.trim(),
    youtube_url: input.youtube_url?.trim() || null,
    thumbnail_url: input.thumbnail_url?.trim() || null,
    is_featured: Boolean(input.is_featured),
  };
}

async function clearFeaturedSermons(exceptId?: string): Promise<void> {
  let query = supabase
    .from('sermons')
    .update({ is_featured: false })
    .eq('is_featured', true);

  if (exceptId) {
    query = query.neq('id', exceptId);
  }

  const { error } = await query;
  if (error) throw error;
}

export async function fetchSermons(): Promise<Sermon[]> {
  const { data, error } = await supabase
    .from('sermons')
    .select(SERMON_COLUMNS)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Sermon[];
}

export async function createSermon(input: CreateSermonInput): Promise<Sermon> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw userError ?? new Error('Not authenticated');
  }

  const cleaned = cleanInput(input);
  if (cleaned.is_featured) {
    await clearFeaturedSermons();
  }

  const { data, error } = await supabase
    .from('sermons')
    .insert({
      ...cleaned,
      created_by: user.id,
    })
    .select(SERMON_COLUMNS)
    .single();

  if (error) throw error;
  return data as Sermon;
}

export async function updateSermon(input: { id: string } & CreateSermonInput): Promise<Sermon> {
  const { id, ...changes } = input;
  const cleaned = cleanInput({
    title: changes.title ?? '',
    speaker: changes.speaker ?? '',
    date: changes.date ?? '',
    duration: changes.duration ?? '',
    description: changes.description ?? '',
    topic: changes.topic ?? '',
    youtube_url: changes.youtube_url,
    thumbnail_url: changes.thumbnail_url,
    is_featured: changes.is_featured,
  });

  if (cleaned.is_featured) {
    await clearFeaturedSermons(id);
  }

  const { data, error } = await supabase
    .from('sermons')
    .update(cleaned)
    .eq('id', id)
    .select(SERMON_COLUMNS)
    .single();

  if (error) throw error;
  return data as Sermon;
}

export async function deleteSermon(id: string): Promise<void> {
  const { error } = await supabase.from('sermons').delete().eq('id', id);
  if (error) throw error;
}
