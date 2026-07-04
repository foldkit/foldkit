import { Array, Effect, Ref, String, pipe } from 'effect'
import {
  Diagnostic,
  type ESTree,
  Rule,
  RuleContext,
  Visitor,
} from 'effect-oxlint'

const MODEL_PARAMETER_NAME = 'model'
const UPDATE_BASENAME = 'update.ts'
const UPDATE_DIRECTORY_SEGMENT = '/update/'

const PREFER_EVO_MESSAGE =
  'Do not object-spread `model` to build the next Model. Use `evo(model, { field: () => nextValue })` so the update stays strict about keys and untouched fields keep their references.'

const pathBasename = (path: string): string =>
  pipe(path, String.split('/'), Array.lastNonEmpty)

const isUpdateLayerFile = (filename: string): boolean => {
  const normalizedFilename = filename.replaceAll('\\', '/')
  return (
    pathBasename(normalizedFilename) === UPDATE_BASENAME ||
    normalizedFilename.includes(UPDATE_DIRECTORY_SEGMENT)
  )
}

const declaresModelParameter = (
  node: Readonly<{ params: ReadonlyArray<ESTree.ParamPattern> }>,
): boolean =>
  node.params.some(
    parameter =>
      parameter.type === 'Identifier' &&
      parameter.name === MODEL_PARAMETER_NAME,
  )

const modelSpreadProperties = (
  node: ESTree.ObjectExpression,
): ReadonlyArray<ESTree.SpreadElement> =>
  node.properties.filter(
    (property): property is ESTree.SpreadElement =>
      property.type === 'SpreadElement' &&
      property.argument.type === 'Identifier' &&
      property.argument.name === MODEL_PARAMETER_NAME,
  )

/** Flags object-spreading a `model` function parameter in update-layer files. Model evolution goes through `evo(model, { ... })`, which stays strict about keys and preserves references for untouched fields. */
export const preferEvoOverModelSpread = Rule.define({
  name: 'prefer-evo-over-model-spread',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Evolve the Model with evo instead of object-spreading the model parameter in update-layer files.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const modelFunctionDepth = yield* Ref.make(0)
    const reportModelSpreads = (node: ESTree.ObjectExpression) =>
      Effect.flatMap(Ref.get(modelFunctionDepth), depth => {
        if (depth === 0) return Effect.void
        return Effect.forEach(
          modelSpreadProperties(node),
          spreadProperty =>
            ctx.report(
              Diagnostic.make({
                node: spreadProperty,
                message: PREFER_EVO_MESSAGE,
              }),
            ),
          { discard: true },
        )
      })
    return yield* Visitor.filter(
      isUpdateLayerFile,
      Visitor.merge(
        Visitor.tracked(
          'ArrowFunctionExpression',
          declaresModelParameter,
          modelFunctionDepth,
        ),
        Visitor.tracked(
          'FunctionDeclaration',
          declaresModelParameter,
          modelFunctionDepth,
        ),
        Visitor.tracked(
          'FunctionExpression',
          declaresModelParameter,
          modelFunctionDepth,
        ),
        Visitor.on('ObjectExpression', reportModelSpreads),
      ),
    )
  },
})
