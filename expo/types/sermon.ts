export interface Sermon {
  id: string;
  title: string;
  speaker: string;
  date: string;
  duration: string;
  description: string;
  topic: string;
  youtube_url?: string | null;
  thumbnail_url?: string | null;
  is_featured: boolean;
  created_at: string;
  created_by: string;
  updated_at: string;
}

export interface CreateSermonInput {
  title: string;
  speaker: string;
  date: string;
  duration: string;
  description: string;
  topic: string;
  youtube_url?: string | null;
  thumbnail_url?: string | null;
  is_featured?: boolean;
}

export interface UpdateSermonInput extends Partial<CreateSermonInput> {
  id: string;
}
