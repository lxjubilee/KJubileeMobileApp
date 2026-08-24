import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { CONFIG } from '@/constants';
import { logger } from '@/utils';
import type { UpdateCheckResult } from './types';

/**
 * Wire shape of GET /api/app-version/check (public endpoint on api.kjubilee.com).
 */
interface UpdateCheckDto {
  update_available: boolean;
  current_version?: string;
  latest_version?: string;
  min_supported_version?: string;
  mandatory?: boolean;
  store_url?: string;
  title?: string | null;
  message?: string | null;
}

/**
 * Ask the backend whether a newer build is available for this device. Uses a
 * bare axios call (the endpoint is public — no Bearer/refresh needed, unlike
 * authClient). Returns `null` when there's no update OR on ANY failure, so a
 * missing/unreachable endpoint never blocks or crashes app startup.
 */
export async function checkForUpdate(): Promise<UpdateCheckResult | null> {
  const platform = Platform.OS;
  if (platform !== 'ios' && platform !== 'android') return null;

  const currentVersion = Constants.expoConfig?.version;
  if (!currentVersion) return null;

  try {
    const { data } = await axios.get<UpdateCheckDto>(
      `${CONFIG.API_AUTH_BASE}/api/app-version/check`,
      {
        params: { platform, current_version: currentVersion },
        timeout: CONFIG.API_TIMEOUT_MS,
        headers: { 'Content-Type': 'application/json' },
      },
    );

    if (!data?.update_available || !data.store_url) return null;

    return {
      updateAvailable: true,
      currentVersion: data.current_version ?? currentVersion,
      latestVersion: data.latest_version ?? '',
      mandatory: data.mandatory === true,
      storeUrl: data.store_url,
      title: data.title ?? null,
      message: data.message ?? null,
    };
  } catch (e) {
    logger.debug('update check failed', (e as { message?: string })?.message);
    return null;
  }
}
