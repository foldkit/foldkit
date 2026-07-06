import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { isProgram, isVariableDeclaration } from '../guards.ts'

const isMutableDeclaration = (node: ESTree.VariableDeclaration): boolean =>
  (node.kind === 'let' || node.kind === 'var') && node.declare !== true

const topLevelMutableDeclarations = (
  program: ESTree.Program,
): ReadonlyArray<ESTree.VariableDeclaration> =>
  program.body.flatMap(statement => {
    const declaration =
      statement.type === 'ExportNamedDeclaration'
        ? statement.declaration
        : statement
    return isVariableDeclaration(declaration) &&
      isMutableDeclaration(declaration)
      ? [declaration]
      : []
  })

/**
 * Flags module-level let/var declarations that hold state outside the Model.
 */
export const noModuleLevelMutableState = Rule.define({
  name: 'no-module-level-mutable-state',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Keep state in the Model instead of module-level let/var bindings.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      Program: (node: ESTree.Node) => {
        if (!isProgram(node)) return Effect.void
        return Effect.forEach(
          topLevelMutableDeclarations(node),
          declaration =>
            ctx.report(
              Diagnostic.make({
                node: declaration,
                message:
                  'Module-level let/var holds state outside the Model. Move the data into the Model, or scope a live handle to a lifecycle primitive like Mount or ManagedResource.',
              }),
            ),
          { discard: true },
        )
      },
    }
  },
})
