const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

// Suites that require a live local Supabase stack (real network I/O). They run
// only when RUN_INTEGRATION=1 (the `test:integration` script / CI integration job),
// so the default unit run stays green without a database.
const runIntegration = process.env.RUN_INTEGRATION === '1'
const liveDbPaths = [
  '/__tests__/integration/',
  '/__tests__/e2e/',
  '/__tests__/queue/',
  '/__tests__/wine-processing/',
  '/__tests__/varietals/',
]

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: '<rootDir>/jest.environment.js',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@vinho/db-types$': '<rootDir>/../../packages/db-types/src/database.types.ts',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    // Playwright e2e specs live in the top-level e2e/ dir and use @playwright/test,
    // not jest — never let jest's *.spec.ts matcher pick them up.
    '<rootDir>/e2e/',
    ...(runIntegration ? [] : liveDbPaths),
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/jest.config.js',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
