// 웹 미리보기에서 react-native-maps(휴대폰 전용)를 대체품으로 바꿔요. 휴대폰 빌드에는 영향 없음.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return { type: 'sourceFile', filePath: path.resolve(__dirname, 'src/lib/maps.web.jsx') };
  }
  return (upstream ?? context.resolveRequest)(context, moduleName, platform);
};
module.exports = config;
