import type { User } from '@/types/user';
import { readJsonFile, writeJsonFile, DB_FILES } from './database';

const defaultUsers: User[] = [
  {
    id: '1',
    email: 'admin@church.com',
    firstName: 'Church',
    lastName: 'Admin',
    role: 'admin',
    permissions: ['manage_users', 'manage_events', 'manage_content', 'send_notifications', 'view_donations', 'manage_prayers', 'upload_sermons'],
    joinedAt: new Date('2024-01-15T09:00:00Z'),
  },
  {
    id: '2',
    email: 'pastor@church.com',
    firstName: 'John',
    lastName: 'Pastor',
    role: 'pastor',
    permissions: ['manage_events', 'manage_content', 'send_notifications', 'manage_prayers', 'upload_sermons'],
    joinedAt: new Date('2024-03-10T09:00:00Z'),
  },
  {
    id: '3',
    email: 'member@church.com',
    firstName: 'Jane',
    lastName: 'Member',
    role: 'member',
    permissions: [],
    joinedAt: new Date('2024-05-20T09:00:00Z'),
  },
];

export const getUsers = (): User[] => {
  const stored = readJsonFile<User[]>(DB_FILES.USERS, []);
  const byEmail: Record<string, User> = {};
  [...defaultUsers, ...stored].forEach((u) => {
    byEmail[u.email] = u;
  });
  const merged = Object.values(byEmail);
  writeJsonFile(DB_FILES.USERS, merged);
  return merged;
};

export const addUser = (user: User): void => {
  const users = getUsers();
  const existing = users.find((u) => u.email === user.email);
  const updatedUsers = existing
    ? users.map((u) => (u.email === user.email ? user : u))
    : [user, ...users];
  writeJsonFile(DB_FILES.USERS, updatedUsers);
};

export const updateUserRole = (userId: string, role: User['role'], permissions: User['permissions']): User | undefined => {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return undefined;
  const updated: User = { ...users[idx], role, permissions };
  users[idx] = updated;
  writeJsonFile(DB_FILES.USERS, users);
  return updated;
};
