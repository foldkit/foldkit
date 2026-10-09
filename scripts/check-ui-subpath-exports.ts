import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const UI_SRC = 'packages/ui/src'
const UI_INDEX = 'packages/ui/src/index.ts'
const UI_PACKAGE = 'packages/ui/package.json'
const ALIASES_FILE = 'examples/vite.aliases.ts'

const components = readdirSync(UI_SRC, { withFileTypes: true })
  .filter(
    entry =>
      entry.isDirectory() && existsSync(join(UI_SRC, entry.name, 'public.ts')),
  )
  .map(entry => entry.name)
  .sort()

type ExportEntry = Readonly<{ types?: string; import?: string }>
const manifest = JSON.parse(readFileSync(UI_PACKAGE, 'utf8')) as Readonly<{
  exports: Readonly<Record<string, ExportEntry>>
}>
const subpaths = Object.keys(manifest.exports)
  .filter(key => key !== '.')
  .map(key => key.slice('./'.length))

const captures = (source: string, pattern: RegExp): ReadonlyArray<string> =>
  [...source.matchAll(pattern)].flatMap(match =>
    match[1] === undefined ? [] : [match[1]],
  )

const namespaces = captures(
  readFileSync(UI_INDEX, 'utf8'),
  /^export \* as \w+ from '\.\/(\w+)\/public\.js'$/gm,
)

const aliases = captures(
  readFileSync(ALIASES_FILE, 'utf8'),
  /'@foldkit\/ui\/(\w+)':/g,
)

const problems: Array<string> = []

for (const component of components) {
  const entry = manifest.exports[`./${component}`]
  const expectedTypes = `./dist/${component}/public.d.ts`
  const expectedImport = `./dist/${component}/public.js`
  if (entry === undefined) {
    problems.push(
      `"./${component}" is missing from the exports map in ${UI_PACKAGE}`,
    )
  } else if (entry.types !== expectedTypes || entry.import !== expectedImport) {
    problems.push(
      `"./${component}" in ${UI_PACKAGE} must point at ${expectedTypes} and ${expectedImport}`,
    )
  }
  if (!namespaces.includes(component)) {
    problems.push(
      `${UI_INDEX} has no namespace export for ./${component}/public.js`,
    )
  }
  if (!aliases.includes(component)) {
    problems.push(`'@foldkit/ui/${component}' is missing from ${ALIASES_FILE}`)
  }
}

for (const subpath of subpaths) {
  if (!components.includes(subpath)) {
    problems.push(
      `"./${subpath}" in ${UI_PACKAGE} has no ${UI_SRC}/${subpath}/public.ts`,
    )
  }
}

for (const alias of aliases) {
  if (!components.includes(alias)) {
    problems.push(
      `'@foldkit/ui/${alias}' in ${ALIASES_FILE} has no ${UI_SRC}/${alias}/public.ts`,
    )
  }
}

if (problems.length > 0) {
  console.error(
    'ERROR: @foldkit/ui components, subpath exports and aliases are out of sync:',
  )
  console.error('')
  for (const problem of problems) {
    console.error(`  ${problem}`)
  }
  console.error('')
  console.error(
    `Every directory under ${UI_SRC} with a public.ts needs an exports entry in`,
  )
  console.error(
    `${UI_PACKAGE} pointing at its dist/<component>/public files, a namespace in`,
  )
  console.error(
    `${UI_INDEX}, and an alias in ${ALIASES_FILE} pointing at its source.`,
  )
  process.exit(1)
}

console.log(
  `OK: ${components.length} @foldkit/ui components have a subpath export, a namespace and an example alias.`,
)
