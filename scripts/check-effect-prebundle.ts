import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import * as ts from 'typescript'

const FOLDKIT_SRC = 'packages/foldkit/src'
const PLUGIN_FILE = 'packages/vite-plugin-foldkit/src/index.ts'
const LIST_NAME = 'FORCE_INCLUDED_EFFECT_NAMESPACES'

const collectTsFiles = (dir: string): ReadonlyArray<string> => {
  const out: Array<string> = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...collectTsFiles(full))
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      out.push(full)
    }
  }
  return out
}

const isCapitalized = (name: string): boolean =>
  name.length > 0 && name[0] === name[0].toUpperCase()

const extractEffectNamespacesFromSource = (
  source: string,
): ReadonlySet<string> => {
  const sourceFile = ts.createSourceFile(
    'temp.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
  )
  const namespaces = new Set<string>()

  ts.forEachChild(sourceFile, node => {
    if (!ts.isImportDeclaration(node)) return
    if (node.importClause?.isTypeOnly) return

    const moduleSpec = node.moduleSpecifier
    if (!ts.isStringLiteral(moduleSpec)) return
    if (moduleSpec.text !== 'effect') return

    const namedBindings = node.importClause?.namedBindings
    if (!namedBindings || !ts.isNamedImports(namedBindings)) return

    for (const element of namedBindings.elements) {
      if (element.isTypeOnly) continue
      const name = (element.propertyName ?? element.name).text
      if (isCapitalized(name)) {
        namespaces.add(name)
      }
    }
  })

  return namespaces
}

const extractListFromPlugin = (source: string): ReadonlySet<string> => {
  const pattern = new RegExp(`${LIST_NAME}[^=]*=\\s*\\[([\\s\\S]*?)\\]`, 'm')
  const match = source.match(pattern)
  if (!match) {
    throw new Error(`Could not find ${LIST_NAME} in ${PLUGIN_FILE}`)
  }

  const items = new Set<string>()
  for (const m of match[1].matchAll(/'effect\/(\w+)'/g)) {
    items.add(m[1])
  }
  return items
}

const foldkitNamespaces = (() => {
  const all = new Set<string>()
  for (const file of collectTsFiles(FOLDKIT_SRC)) {
    const source = readFileSync(file, 'utf-8')
    for (const name of extractEffectNamespacesFromSource(source)) {
      all.add(name)
    }
  }
  return all
})()

const pluginNamespaces = extractListFromPlugin(
  readFileSync(PLUGIN_FILE, 'utf-8'),
)

const missing = [...foldkitNamespaces]
  .filter(name => !pluginNamespaces.has(name))
  .sort()

if (missing.length > 0) {
  console.error(
    `ERROR: foldkit imports the following from \`effect\` but they are missing`,
  )
  console.error(`from ${LIST_NAME} in ${PLUGIN_FILE}:`)
  console.error('')
  for (const name of missing) {
    console.error(`  'effect/${name}',`)
  }
  console.error('')
  console.error(
    `Add them to the list. Vite's dep optimizer scans the consumer's source`,
  )
  console.error(
    `for \`effect\` imports; namespaces foldkit's compiled dist references that`,
  )
  console.error(
    `the consumer never mentions by name are missing from the prebundled blob`,
  )
  console.error(`and crash at runtime in dev.`)
  process.exit(1)
}

console.log(
  `OK: ${foldkitNamespaces.size} effect namespaces verified in plugin list.`,
)
