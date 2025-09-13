import { DB_FILES, readJsonFile, writeJsonFile } from './database';

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: string;
}

const defaultGroups: Group[] = [];

export const getGroups = (): Group[] => {
  return readJsonFile<Group[]>(DB_FILES.GROUPS, defaultGroups);
};

export const addGroup = (group: Group): void => {
  const groups = getGroups();
  writeJsonFile(DB_FILES.GROUPS, [group, ...groups]);
};

export const addMemberToGroup = (groupId: string, userId: string): Group | undefined => {
  const groups = getGroups();
  const idx = groups.findIndex(g => g.id === groupId);
  if (idx === -1) return undefined;
  const set = new Set(groups[idx].memberIds);
  set.add(userId);
  groups[idx] = { ...groups[idx], memberIds: Array.from(set) };
  writeJsonFile(DB_FILES.GROUPS, groups);
  return groups[idx];
};
