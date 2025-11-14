import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = 'https://abrflrvbvtqztuvyaeel.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFicmZscnZidnRxenR1dnlhZWVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MTU2NzUsImV4cCI6MjA3MzE5MTY3NX0.vY51xMd7RcM2yuXZ_QYnOrYXNi2ZjEdWCYCkKM06b-w';

// Create Supabase client with proper storage configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
    debug: true,
  },
});

// Add logging for auth events (useful for debugging)
if (__DEV__) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('[Supabase Auth]', event, session?.user?.id ? `User: ${session.user.id}` : 'No session');
  });
}

// Export types for TypeScript
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          display_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          role: 'member' | 'pastor' | 'admin' | 'visitor';
          is_blocked: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          role?: 'member' | 'pastor' | 'admin' | 'visitor';
          is_blocked?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          role?: 'member' | 'pastor' | 'admin' | 'visitor';
          is_blocked?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string;
          created_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          start_at: string;
          end_at: string | null;
          location: string | null;
          event_type: 'sabbath' | 'prayer_meeting' | 'bible_study' | 'youth' | 'special' | 'conference';
          max_attendees: number | null;
          current_attendees: number;
          registered_users: string[];
          is_registration_open: boolean;
          image_url: string | null;
          group_id: string | null;
          created_by: string;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          start_at: string;
          end_at?: string | null;
          location?: string | null;
          event_type?: 'sabbath' | 'prayer_meeting' | 'bible_study' | 'youth' | 'special' | 'conference';
          max_attendees?: number | null;
          current_attendees?: number;
          registered_users?: string[];
          is_registration_open?: boolean;
          image_url?: string | null;
          group_id?: string | null;
          created_by: string;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          start_at?: string;
          end_at?: string | null;
          location?: string | null;
          event_type?: 'sabbath' | 'prayer_meeting' | 'bible_study' | 'youth' | 'special' | 'conference';
          max_attendees?: number | null;
          current_attendees?: number;
          registered_users?: string[];
          is_registration_open?: boolean;
          image_url?: string | null;
          group_id?: string | null;
          created_by?: string;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      prayers: {
        Row: {
          id: string;
          created_by: string | null;
          title: string;
          description: string;
          category: string;
          is_anonymous: boolean;
          is_answered: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by?: string | null;
          title: string;
          description: string;
          category?: string;
          is_anonymous?: boolean;
          is_answered?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string | null;
          title?: string;
          description?: string;
          category?: string;
          is_anonymous?: boolean;
          is_answered?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          type: string;
          title: string;
          body: string | null;
          link_path: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          title: string;
          body?: string | null;
          link_path?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          title?: string;
          body?: string | null;
          link_path?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
    };
  };
};