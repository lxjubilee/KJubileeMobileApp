import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * True when running inside the Expo Go sandbox, where native modules like
 * react-native-track-player are NOT present. Used to no-op all engine calls so
 * the UI can be previewed in Expo Go (audio playback requires a dev build).
 */
export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
