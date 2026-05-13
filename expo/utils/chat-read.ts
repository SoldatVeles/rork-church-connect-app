import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = (userId: string) => `chat:lastRead:${userId}`;

export type LastReadMap = Record<string, string>;

export async function getLastReadMap(userId: string): Promise<LastReadMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LastReadMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    console.warn('[chat-read] getLastReadMap error:', (e as Error).message);
    return {};
  }
}

export async function setLastRead(userId: string, groupId: string, isoTimestamp: string): Promise<void> {
  try {
    const map = await getLastReadMap(userId);
    map[groupId] = isoTimestamp;
    await AsyncStorage.setItem(KEY(userId), JSON.stringify(map));
  } catch (e) {
    console.warn('[chat-read] setLastRead error:', (e as Error).message);
  }
}
