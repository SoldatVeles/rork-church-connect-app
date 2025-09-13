import { DB_FILES, readJsonFile, writeJsonFile } from './database';

type PasswordRecord = Record<string, string>;

export const getPasswords = (): PasswordRecord => {
  return readJsonFile<PasswordRecord>(DB_FILES.PASSWORDS, {});
};

export const getPasswordForEmail = (email: string): string | undefined => {
  const map = getPasswords();
  return map[email];
};

export const savePasswordForEmail = (email: string, password: string): void => {
  const map = getPasswords();
  map[email] = password;
  writeJsonFile(DB_FILES.PASSWORDS, map);
};
