import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const snippet = (name: string) =>
  fileURLToPath(
    new URL(
      `../../../packages/website/src/snippet/${name}.ts`,
      import.meta.url,
    ),
  )

export default defineConfig({
  test: {
    environment: 'happy-dom',
    fileParallelism: false,
    include: [
      fileURLToPath(new URL('./snippet.test.ts', import.meta.url)),
      snippet('testingConcurrentMessages'),
      snippet('testingHeadlessChildMessage'),
      snippet('testingReusableSteps'),
    ],
  },
})
