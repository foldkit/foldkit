import { readFileSync, writeFileSync } from 'node:fs'

const css = readFileSync('src/overlay.css', 'utf8')
const escaped = css
  .replaceAll('\\', '\\\\')
  .replaceAll('`', '\\`')
  .replaceAll('${', '\\${')

const output = `const overlayStyles = \`${escaped}\`\n\nexport { overlayStyles }\n`

writeFileSync('src/overlay-styles.ts', output)
