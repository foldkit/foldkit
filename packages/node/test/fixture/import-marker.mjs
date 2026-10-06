import { writeFile } from 'node:fs/promises'

await writeFile(new URL('./imported.marker', import.meta.url), 'imported')

export default {
  async fetch() {
    return new Response('ok')
  },
}
