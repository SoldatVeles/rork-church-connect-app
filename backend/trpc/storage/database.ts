import fs from 'fs';
import path from 'path';

const DB_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const EVENTS_FILE = path.join(DB_DIR, 'events.json');
const PRAYERS_FILE = path.join(DB_DIR, 'prayers.json');
const PASSWORDS_FILE = path.join(DB_DIR, 'passwords.json');
const GROUPS_FILE = path.join(DB_DIR, 'groups.json');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log(`Created data directory: ${DB_DIR}`);
}

export const readJsonFile = <T>(filePath: string, defaultValue: T): T => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(data, (key, value) => {
        // Convert ISO date strings back to Date objects
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          return new Date(value);
        }
        return value;
      });
      return parsed;
    }
    return defaultValue;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return defaultValue;
  }
};

export const writeJsonFile = <T>(filePath: string, data: T): void => {
  try {
    const jsonString = JSON.stringify(data, (key, value) => {
      // Handle Date objects properly
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }, 2);
    fs.writeFileSync(filePath, jsonString, 'utf8');
    console.log(`Successfully wrote to ${filePath}`);
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    throw error;
  }
};

export const DB_FILES = {
  USERS: USERS_FILE,
  EVENTS: EVENTS_FILE,
  PRAYERS: PRAYERS_FILE,
  PASSWORDS: PASSWORDS_FILE,
  GROUPS: GROUPS_FILE,
};