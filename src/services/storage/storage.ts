import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils';

/**
 * Typed, JSON-aware wrapper around AsyncStorage. Swallows/loggs errors so
 * callers can treat storage as best-effort.
 */
export const storage = {
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (e) {
      logger.warn('storage.getItem failed', key, e);
      return null;
    }
  },

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      logger.warn('storage.setItem failed', key, e);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      logger.warn('storage.removeItem failed', key, e);
    }
  },
};
