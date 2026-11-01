// ESLint cho AIBox — dùng cấu hình chính thức của Expo (đã gồm react, react-hooks, import).
// Chạy: npm run lint
module.exports = {
  root: true,
  extends: ['expo'],
  ignorePatterns: ['node_modules/', 'android/', 'ios/', 'dist/', '.expo/'],
  env: {
    es2021: true,
    // setTimeout / fetch / URL / AbortController… đều có trong React Native runtime.
    browser: true,
    node: true,
    jest: true,
  },
  globals: {
    // Biến do Metro/Babel inject (không khai báo ở đâu).
    __DEV__: 'readonly',
  },
  rules: {
    // Dự án dùng tiếng Việt trong chuỗi; không bắt buộc prop-types (JS thuần).
    'react/prop-types': 'off',
  },
};
