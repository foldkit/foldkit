import { access, writeFile } from 'node:fs/promises'

const releaseUrl = new URL('./release.marker', import.meta.url)

const isReleased = () =>
  access(releaseUrl).then(
    () => true,
    () => false,
  )

await writeFile(new URL('./loading.marker', import.meta.url), 'loading')

while (!(await isReleased())) {
  await new Promise(resolveWait => setTimeout(resolveWait, 10))
}

export default {
  async fetch() {
    return new Response('ready')
  },
}
