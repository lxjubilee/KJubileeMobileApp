// Dynamic Expo config: starts from app.json. The app now talks only to the
// unified kjubilee-api over Bearer tokens, so there are no client-side secrets
// to inject (the old JI service-client credentials were removed — password sync
// to JubileeInspire is a server-side concern). All config lives in app.json.
//
// `config` is the resolved app.json content passed in by Expo.
module.exports = ({ config }) => config;
