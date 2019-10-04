module.exports = {
  // coveragePathIgnorePatterns: [
  //   "/node_modules/",
  //   "/test/"
  // ],
  // coverageThreshold: {
  //   "global": {
  //     "branches": 90,
  //     "functions": 95,
  //     "lines": 95,
  //     "statements": 95
  //   }
  // },
  // collectCoverageFrom: [
  //   "src/*.{js,ts}"
  // ],
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx'
  ],
  // testEnvironment: 'jsdom-with-canvas',
  transform: {
    // '^.+\\.vue$': 'vue-jest',
    // '.+\\.(css|styl|less|sass|scss|svg|png|jpg|ttf|woff|woff2)$': 'jest-transform-stub',
    '^.+\\.(j|t)sx?$': 'babel-jest',
    // '^.+\\.tsx?$': 'ts-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  // snapshotSerializers: [
  //   'jest-serializer-vue'
  // ],
  testRegex: "(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$",
  // globals: {
  //   'ts-jest': {
  //     babelConfig: true
  //   }
  // }
}
