import Constants from 'expo-constants';
import { Platform } from 'react-native';

const PUBLIC_WEBSITE_URL =
  process.env.EXPO_PUBLIC_WEBSITE_URL?.replace(/\/+$/, '') || 'https://sdarm.ch';

function getDevelopmentHostname(): string | null {
  if (!__DEV__) return null;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.hostname || null;
  }

  const constants = Constants as typeof Constants & {
    expoGoConfig?: { debuggerHost?: string | null };
  };
  const hostUri =
    Constants.expoConfig?.hostUri ??
    constants.expoGoConfig?.debuggerHost ??
    null;

  if (!hostUri) return null;

  return hostUri.replace(/^https?:\/\//, '').split(':')[0] || null;
}

export function getWebsiteBaseUrl(): string {
  const developmentHostname = getDevelopmentHostname();
  return developmentHostname
    ? `http://${developmentHostname}:3000`
    : PUBLIC_WEBSITE_URL;
}

export function getWebsiteUrl(path = ''): string {
  const normalizedPath = path ? `/${path.replace(/^\/+/, '')}` : '';
  return `${getWebsiteBaseUrl()}${normalizedPath}`;
}

export function getWebsiteDisplayUrl(): string {
  return getWebsiteBaseUrl().replace(/^https?:\/\//, '');
}
