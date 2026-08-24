import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { getLocales } from 'expo-localization';
import { logger } from '@/utils';
import { DeviceInfo } from './authDto';

const KEY_DEVICE_ID = 'kjubilee.auth.deviceId';

/** Stable per-install device id, generated once and persisted. */
async function getDeviceId(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(KEY_DEVICE_ID);
    if (existing) return existing;
    const id = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    await SecureStore.setItemAsync(KEY_DEVICE_ID, id);
    return id;
  } catch (e) {
    logger.warn('getDeviceId failed', e);
    return `mobile-${Math.random().toString(36).slice(2, 12)}`;
  }
}

/** Optional deviceInfo payload sent with login (helps the backend's device gate). */
export async function buildDeviceInfo(): Promise<DeviceInfo> {
  const deviceId = await getDeviceId();
  return {
    deviceId,
    deviceName: `${Platform.OS === 'ios' ? 'iOS' : 'Android'} device`,
    deviceType: 'mobile',
    platform: Platform.OS,
    appName: 'KJubilee',
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
    language: getLocales()[0]?.languageTag ?? 'en-US',
  };
}
