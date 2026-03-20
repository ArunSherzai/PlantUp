/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      diagnostics: false,
    }],
  },
  moduleNameMapper: {
    '\\.(png|jpg|gif|svg|webp)$': '<rootDir>/src/testing/__mocks__/fileMock.ts',
    '^react-native$': '<rootDir>/src/testing/__mocks__/reactNativeMock.ts',
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/testing/__mocks__/asyncStorageMock.ts',
  },
  clearMocks: true,
  restoreMocks: true,
};
