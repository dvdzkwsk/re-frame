import replace from 'rollup-plugin-replace'
import closure from '@ampproject/rollup-plugin-closure-compiler'

const ENV = process.env.NODE_ENV || 'development'

const config = {
  input: 'lib/index.js',
  output: {
    file: `dist/${ENV}.js`,
    format: 'esm',
  },
  plugins: [
    replace({
      __DEV__: ENV === 'development',
    }),
  ],
}

if (ENV === 'production') {
  config.plugins.push(
    closure({
      compilation_level: 'ADVANCED',
    })
  )
}

export default config
