import { Array, Option, Predicate, pipe } from 'effect'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { type ESTree, parseSync } from 'vite'

const PLUGIN_SOURCE = resolve(import.meta.dirname, '../src/index.ts')
const FORCED_EFFECT_ENTRIES_NAME = 'FORCE_INCLUDED_EFFECT_ENTRIES'

const findForcedEffectElements = (declaration: ESTree.VariableDeclarator) => {
  if (
    declaration.id.type !== 'Identifier' ||
    declaration.id.name !== FORCED_EFFECT_ENTRIES_NAME ||
    declaration.init?.type !== 'ArrayExpression'
  ) {
    return Option.none()
  }

  return Option.some(declaration.init.elements)
}

export const readForcedEffectEntries = (): ReadonlyArray<string> => {
  const { program } = parseSync(
    PLUGIN_SOURCE,
    readFileSync(PLUGIN_SOURCE, 'utf8'),
  )
  const elements = pipe(
    program.body,
    Array.flatMap(statement =>
      statement.type === 'VariableDeclaration' ? statement.declarations : [],
    ),
    Array.findFirst(findForcedEffectElements),
    Option.getOrThrowWith(
      () => new Error(`No ${FORCED_EFFECT_ENTRIES_NAME} array in the plugin`),
    ),
  )

  return Array.map(elements, element => {
    if (element?.type === 'Literal' && Predicate.isString(element.value)) {
      return element.value
    }

    throw new Error(
      `${FORCED_EFFECT_ENTRIES_NAME} holds an entry that is not a string`,
    )
  })
}
