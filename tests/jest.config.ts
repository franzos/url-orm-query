export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageProvider: "v8",
  globalTeardown: '<rootDir>/utils/jest-teardown.ts',
  maxWorkers: 1,
};