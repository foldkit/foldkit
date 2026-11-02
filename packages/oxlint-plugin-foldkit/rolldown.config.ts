import { defineConfig } from 'rolldown'

export default defineConfig({
  input: 'src/index.ts',
  platform: 'node',
  output: {
    file: 'dist/index.js',
    format: 'esm',
  },
})
