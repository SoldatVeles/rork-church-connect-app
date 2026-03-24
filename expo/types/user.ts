export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string | null;
  role: UserRole;
  permissions: Permission[];
  avatar?: string;
  phone?: string;
  joinedAt: Date;
  createdAt?: string;
}

export type UserRole = 'admin' | 'pastor' | 'member' | 'visitor';

export type Permission = 
  | 'manage_users'
  | 'manage_events' 
  | 'manage_content'
  | 'send_notifications'
  | 'view_donations'
  | 'manage_prayers'
  | 'upload_sermons';

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}