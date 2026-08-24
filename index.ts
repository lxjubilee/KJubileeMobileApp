import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';
import { isExpoGo } from './src/services/music';

// Register the background playback service so lock-screen / notification controls
// keep working while the app is backgrounded or killed. Skipped in Expo Go, where
// the native module is unavailable — requiring track-player there would evaluate
// native constants that are null and crash (UI-only preview).
if (!isExpoGo) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const TrackPlayer = require('react-native-track-player').default;
  TrackPlayer.registerPlaybackService(
    () => require('./src/services/music/playbackService').default,
  );
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);
