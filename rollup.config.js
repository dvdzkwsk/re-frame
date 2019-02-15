import replace from 'rollup-plugin-replace'

const config = {
  input: 'lib/index.js',
  output: {
    file: `dist/re-frame.js`,
    format: 'esm',
  },
  plugins: [
    replace({
      __DEV__: "process.env.NODE_ENV === 'development'",
    }),
  ],
}

export default config
