import { mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(import.meta.dirname, '..')
const [card, icon] = await Promise.all([
  readFile(resolve(root, 'assets/social-card.svg')),
  readFile(resolve(root, 'public/favicon.svg')),
])

await mkdir(resolve(root, 'public/og'), { recursive: true })
await Promise.all([
  sharp(card).png().toFile(resolve(root, 'public/og/domains.png')),
  sharp(icon)
    .resize(32, 32)
    .png()
    .toFile(resolve(root, 'public/favicon-32x32.png')),
  sharp(icon)
    .resize(180, 180)
    .flatten({ background: '#09090b' })
    .png()
    .toFile(resolve(root, 'public/apple-touch-icon.png')),
])
