const nativewindPreset = require('nativewind/babel');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo', nativewindPreset],
    plugins: ['react-native-reanimated/plugin'],
  };
};
