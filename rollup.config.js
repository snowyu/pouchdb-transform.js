import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import sourceMaps from 'rollup-plugin-sourcemaps'
import camelCase from 'lodash.camelcase'
import babel from 'rollup-plugin-babel'
// import typescript from 'rollup-plugin-typescript2'
import json from 'rollup-plugin-json'

import pkg from './package.json'
// const pkg = require('./package.json')

const extensions = [
  '.js', '.jsx', '.ts', '.tsx',
];

const libraryName = 'pouchdb-transform'

const config = {
  input: `src/index.ts`,
  output: [
    // { file: pkg.main, name: camelCase(libraryName), format: 'umd', sourcemap: true },
    { file: pkg.main, name: camelCase(libraryName), format: 'cjs', sourcemap: true },
    { file: pkg.browser, name: camelCase(libraryName), format: 'cjs', sourcemap: true,
      // https://rollupjs.org/guide/en#output-globals-g-globals
      globals: {'pouchdb-wrappers': 'pouchdb-wrappers', 'immediate': 'immediate'},
    },
    { file: pkg.module, format: 'es', sourcemap: true },
  ],
  // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
  external: ['pouchdb-wrappers', 'immediate'],
  watch: {
    include: 'src/**',
  },
  plugins: [
    // Allow node_modules resolution, so you can use 'external' to control
    // which external modules to include in the bundle
    // https://github.com/rollup/rollup-plugin-node-resolve#usage
    resolve({ extensions }),
    // Allow json resolution
    json(),
    // Compile TypeScript files
    // typescript({ useTsconfigDeclarationDir: true }),
    // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
    commonjs(),

    // Compile TypeScript/JavaScript files
    babel({ extensions, include: ['src/**/*'] }),
    // Resolve source maps to the original source
    sourceMaps(),
  ],
}

export default config
