import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = 'https://abrflrvbvtqztuvyaeel.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFicmZscnZidnRxenR1dnlhZWVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MTU2NzUsImV4cCI6MjA3MzE5MTY3NX0.vY51xMd7RcM2yuXZ_QYnOrYXNi2ZjEdWCYCkKM06b-w';

// Create Supabase client with proper storage configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use AsyncStorage for React Native, localStorage for web
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Export types for TypeScript
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          role: 'member' | 'pastor' | 'admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          role?: 'member' | 'pastor' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          role?: 'member' | 'pastor' | 'admin';
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
          requester_id: string;
          title: string;
          details: string | null;
          visibility: 'public' | 'group' | 'private';
          group_id: string | null;
          is_answered: boolean;
          answered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          title: string;
          details?: string | null;
          visibility?: 'public' | 'group' | 'private';
          group_id?: string | null;
          is_answered?: boolean;
          answered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          requester_id?: string;
          title?: string;
          details?: string | null;
          visibility?: 'public' | 'group' | 'private';
          group_id?: string | null;
          is_answered?: boolean;
          answered_at?: string | null;
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