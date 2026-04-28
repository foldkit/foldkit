import { readFileSync, writeFileSync } from 'node:fs'

const css = readFileSync('src/devTools/overlay.css', 'utf8')
const escaped = css
  .replaceAll('\\', '\\\\')
  .replaceAll('`', '\\`')
  .replaceAll('${', '\\${')

const output = `const overlayStyles = \`${escaped}\`\n\nexport { overlayStyles }\n`

writeFileSync('src/devTools/overlay-styles.ts', output)
