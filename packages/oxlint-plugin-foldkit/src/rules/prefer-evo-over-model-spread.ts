import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Ref from 'effect/Ref'
import * as Result from 'effect/Result'
import * as Str from 'effect/String'

type FunctionLike = {
  readonly params: ReadonlyArray<unknown>
}

const normalizedPath = (filename: string): string =>
  Str.replaceAll('\\', '/')(filename)

const basename = (filename: string): string => {
  const parts = Str.split('/')(normalizedPath(filename))
  return pipe(
    Arr.last(parts),
    Option.getOrElse(() => filename),
  )
}

const isUpdateFile = (filename: string): boolean => {
  const path = normalizedPath(filename)
  return basename(path) === 'update.ts' || Str.includes('/update/')(path)
}

type IdentifierLike = {
  readonly type: string
  readonly name: string
}

const isIdentifierLike = (value: unknown): value is IdentifierLike =>
  P.isObject(value) &&
  'type' in value &&
  value.type === 'Identifier' &&
  'name' in value &&
  P.isString(value.name)

const hasModelParameter = (fn: FunctionLike): boolean =>
  pipe(
    fn.params,
    Arr.some(param => isIdentifierLike(param) && param.name === 'model'),
  )

const modelSpreadElements = (
  object: ESTree.ObjectExpression,
): ReadonlyArray<ESTree.SpreadElement> =>
  pipe(
    object.properties,
    Arr.filterMap(property =>
      property.type === 'SpreadElement' &&
      isIdentifierLike(property.argument) &&
      property.argument.name === 'model'
        ? Result.succeed(property)
        : Result.failVoid,
    ),
  )

const reportModelSpread = (
  ctx: RuleContext['Service'],
  node: ESTree.SpreadElement,
): Effect.Effect<void, never, RuleContext> =>
  ctx.report(
    Diagnostic.make({
      node,
      message:
        'Use `evo(model, { ... })` to evolve Foldkit Models instead of object-spreading `model`. `evo` keeps updates strict and preserves references. (FK model evolution)',
    }),
  )

const rule: CreateRule = Rule.define({
  name: 'prefer-evo-over-model-spread',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Disallow object-spreading update function `model` parameters; use `evo(model, ...)` for Foldkit Model evolution',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const modelParameterDepth = yield* Ref.make(0)

    const enterFunction = (node: FunctionLike): Effect.Effect<void> =>
      hasModelParameter(node)
        ? Ref.update(modelParameterDepth, depth => depth + 1)
        : Effect.void

    const exitFunction = (node: FunctionLike): Effect.Effect<void> =>
      hasModelParameter(node)
        ? Ref.update(modelParameterDepth, depth => depth - 1)
        : Effect.void

    return yield* Visitor.filter(
      isUpdateFile,
      Visitor.merge(
        Visitor.on('ArrowFunctionExpression', enterFunction),
        Visitor.onExit('ArrowFunctionExpression', exitFunction),
        Visitor.on('FunctionDeclaration', enterFunction),
        Visitor.onExit('FunctionDeclaration', exitFunction),
        Visitor.on('FunctionExpression', enterFunction),
        Visitor.onExit('FunctionExpression', exitFunction),
        Visitor.on('ObjectExpression', node =>
          Effect.gen(function* () {
            const depth = yield* Ref.get(modelParameterDepth)
            if (depth <= 0) return
            yield* Effect.forEach(
              modelSpreadElements(node),
              spread => reportModelSpread(ctx, spread),
              { concurrency: 1, discard: true },
            )
          }),
        ),
      ),
    )
  },
})

export default rule
