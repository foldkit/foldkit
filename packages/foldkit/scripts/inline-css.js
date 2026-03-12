import { readFileSync, writeFileSync } from 'node:fs'

const css = readFileSync('src/devtools/overlay.css', 'utf8')
const escaped = css
  .replaceAll('\\', '\\\\')
  .replaceAll('`', '\\`')
  .replaceAll('${', '\\${')

const output = `const overlayStyles = \`${escaped}\`\n\nexport { overlayStyles }\n`

writeFileSync('src/devtools/overlay-styles.ts', output)
