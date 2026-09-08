import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { ELEMENT_BUILDER_NAMES } from '../src/elementBuilderNames.ts'

// The plugin deliberately does not depend on `foldkit`, so the names cannot be
// imported. Reading them out of the source keeps the copy honest without
// coupling the packages: a tag added upstream fails this test instead of
// silently falling out of every rule that matches on the set.

const here = dirname(fileURLToPath(import.meta.url))
const htmlSource = join(here, '..', '..', 'foldkit', 'src', 'html', 'index.ts')

const ELEMENT_FUNCTION_TYPES = new Set([
  'ElementFunction',
  'TextValueElementFunction',
  'VoidElementFunction',
])

const builderNamesFromSource = (): ReadonlySet<string> => {
  const text = readFileSync(htmlSource, 'utf8')
  const sourceFile = ts.createSourceFile(
    htmlSource,
    text,
    ts.ScriptTarget.Latest,
    true,
  )

  const names = new Set<string>()
  const visit = (node: ts.Node): void => {
    if (
      ts.isTypeAliasDeclaration(node) &&
      node.name.text === 'HtmlElements' &&
      ts.isTypeLiteralNode(node.type)
    ) {
      for (const member of node.type.members) {
        if (
          ts.isPropertySignature(member) &&
          member.type !== undefined &&
          ts.isTypeReferenceNode(member.type) &&
          ts.isIdentifier(member.type.typeName) &&
          ELEMENT_FUNCTION_TYPES.has(member.type.typeName.text) &&
          ts.isIdentifier(member.name)
        ) {
          names.add(member.name.text)
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return names
}

describe('ELEMENT_BUILDER_NAMES', () => {
  it('finds the HtmlElements map in the Foldkit source', () => {
    expect(builderNamesFromSource().size).toBeGreaterThan(100)
  })

  it('matches every element builder Foldkit declares', () => {
    const declared = builderNamesFromSource()
    const missing = [...declared]
      .filter(name => !ELEMENT_BUILDER_NAMES.has(name))
      .sort()
    const extra = [...ELEMENT_BUILDER_NAMES]
      .filter(name => !declared.has(name))
      .sort()

    expect({ missing, extra }).toEqual({ missing: [], extra: [] })
  })

  it('does not include keyed, whose children sit in a different slot', () => {
    expect(ELEMENT_BUILDER_NAMES.has('keyed')).toBe(false)
  })
})
