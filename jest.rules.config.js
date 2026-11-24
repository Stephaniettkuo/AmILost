// Jest settings for the security-rules tests only (npm run test:rules). They run in plain Node, not in the
// phone-app environment that `npm test` uses.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/rules/**/*.test.ts'],
  transform: { '^.+\\.tsx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
};
