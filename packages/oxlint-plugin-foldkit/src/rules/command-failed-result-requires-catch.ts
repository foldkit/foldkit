import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { AST, Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as HashSet from 'effect/HashSet'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Result from 'effect/Result'
import * as Schema from 'effect/Schema'

const FailedResultName = Schema.String.check(
  Schema.isPattern(/^Failed[A-Z]/, {
    identifier: 'FailedResultName',
    title: 'Failed-prefixed Command Result',
    description:
      'A Command result constructor whose name starts with `Failed` followed by an uppercase letter.',
  }),
)
const isFailedResultName = Schema.is(FailedResultName)

const CATCH_METHODS = HashSet.make(
  'catch',
  'catchAll',
  'catchCause',
  'catchIf',
  'catchTag',
  'catchTags',
  'match',
  'matchCause',
)

const isCommandDefineCall = (node: ESTree.CallExpression): boolean =>
  AST.isCallOf(node, 'Command', 'define')

const appliedCommandDefine = (
  call: ESTree.CallExpression,
): Option.Option<ESTree.CallExpression> =>
  call.callee.type === 'CallExpression' && isCommandDefineCall(call.callee)
    ? Option.some(call.callee)
    : Option.none()

const resultArgs = (
  defineCall: ESTree.CallExpression,
): ReadonlyArray<ESTree.Argument> => {
  const withoutName = Arr.drop(defineCall.arguments, 1)
  return pipe(
    Arr.head(withoutName),
    Option.match({
      onNone: () => withoutName,
      onSome: arg =>
        arg.type === 'ObjectExpression'
          ? Arr.drop(withoutName, 1)
          : withoutName,
    }),
  )
}

const argumentName = (arg: ESTree.Argument): Option.Option<string> => {
  if (arg.type === 'Identifier') return Option.some(arg.name)
  if (arg.type === 'MemberExpression') {
    return pipe(AST.memberPath(arg), Option.map(Arr.lastNonEmpty))
  }
  return Option.none()
}

const failedResultNames = (
  defineCall: ESTree.CallExpression,
): ReadonlyArray<string> =>
  pipe(
    resultArgs(defineCall),
    Arr.filterMap(arg =>
      pipe(
        argumentName(arg),
        Option.filter(isFailedResultName),
        Result.fromOption(() => undefined),
      ),
    ),
  )

const hasFailedResult = (defineCall: ESTree.CallExpression): boolean =>
  Arr.isReadonlyArrayNonEmpty(failedResultNames(defineCall))

const parentOf = (node: {
  readonly parent?: unknown
}): Option.Option<{
  readonly type: string
  readonly callee?: unknown
  readonly parent?: unknown
}> =>
  pipe(
    Option.fromNullishOr(node.parent),
    Option.filter(
      (
        parent,
      ): parent is {
        readonly type: string
        readonly callee?: unknown
        readonly parent?: unknown
      } => P.isObject(parent) && 'type' in parent && P.isString(parent.type),
    ),
  )

const isImmediatelyApplied = (defineCall: ESTree.CallExpression): boolean =>
  pipe(
    parentOf(defineCall),
    Option.match({
      onNone: () => false,
      onSome: parent =>
        parent.type === 'CallExpression' && parent.callee === defineCall,
    }),
  )

type IdentifierLike = {
  readonly type: string
  readonly name: string
}

type MemberExpressionLike = {
  readonly type: string
  readonly computed?: unknown
  readonly object?: unknown
  readonly property?: unknown
}

const isIdentifierLike = (value: unknown): value is IdentifierLike =>
  P.isObject(value) &&
  'type' in value &&
  value.type === 'Identifier' &&
  'name' in value &&
  P.isString(value.name)

const isMemberExpressionLike = (
  value: unknown,
): value is MemberExpressionLike =>
  P.isObject(value) && 'type' in value && value.type === 'MemberExpression'

const memberPath = (
  value: unknown,
): Option.Option<Arr.NonEmptyReadonlyArray<string>> => {
  if (isIdentifierLike(value)) return Option.some([value.name])
  if (!isMemberExpressionLike(value) || value.computed === true) {
    return Option.none()
  }
  const property = value.property
  if (!isIdentifierLike(property)) return Option.none()
  return pipe(
    memberPath(value.object),
    Option.map(path => [...path, property.name]),
  )
}

const isEffectCatchCall = (value: unknown): boolean => {
  if (!P.isObject(value)) return false
  if (!('type' in value) || value.type !== 'CallExpression') return false
  if (!('callee' in value)) return false
  return pipe(
    memberPath(value.callee),
    Option.match({
      onNone: () => false,
      onSome: path => {
        const method = Arr.lastNonEmpty(path)
        return (
          path.length === 2 &&
          Arr.headNonEmpty(path) === 'Effect' &&
          HashSet.has(CATCH_METHODS, method)
        )
      },
    }),
  )
}

const containsCatch = (root: unknown): boolean => {
  if (isEffectCatchCall(root)) return true
  if (!P.isObject(root)) return false
  return pipe(
    Object.entries(root),
    Arr.some(([key, child]) =>
      key === 'parent'
        ? false
        : Array.isArray(child)
          ? pipe(child, Arr.some(containsCatch))
          : containsCatch(child),
    ),
  )
}

const appliedArgumentContainsCatch = (call: ESTree.CallExpression): boolean =>
  pipe(call.arguments, Arr.some(containsCatch))

type ProgramLike = {
  readonly type: string
  readonly body: ReadonlyArray<unknown>
}

const isProgramLike = (value: unknown): value is ProgramLike =>
  P.isObject(value) &&
  'type' in value &&
  value.type === 'Program' &&
  'body' in value &&
  Array.isArray(value.body)

/** Walk `parent` links from a node up to the enclosing `Program`, if reachable. */
const findProgram = (node: unknown): Option.Option<ProgramLike> => {
  let current: unknown = node
  for (let depth = 0; depth < 1000; depth += 1) {
    if (isProgramLike(current)) return Option.some(current)
    if (!P.isObject(current) || !('parent' in current)) return Option.none()
    current = current.parent
  }
  return Option.none()
}

/** Collect the names of every identifier-callee call within an AST subtree. */
const collectCalledIdentifierNames = (
  root: unknown,
  acc: Set<string>,
): void => {
  if (!P.isObject(root)) return
  if (
    'type' in root &&
    root.type === 'CallExpression' &&
    'callee' in root &&
    isIdentifierLike(root.callee)
  ) {
    acc.add(root.callee.name)
  }
  pipe(
    Object.entries(root),
    Arr.forEach(([key, child]) => {
      if (key === 'parent') return
      if (Array.isArray(child)) {
        pipe(
          child,
          Arr.forEach(c => collectCalledIdentifierNames(c, acc)),
        )
      } else {
        collectCalledIdentifierNames(child, acc)
      }
    }),
  )
}

const declaratorLike = (value: unknown): Option.Option<unknown> => {
  if (!P.isObject(value) || !('type' in value)) return Option.none()
  // Unwrap `export const/function …`.
  if (value.type === 'ExportNamedDeclaration' && 'declaration' in value) {
    return declaratorLike(value.declaration)
  }
  return Option.some(value)
}

/**
 * Resolve a top-level `function name(){}` or `const name = (…) => …` body from
 * the module Program, so one level of local-function indirection can be
 * inspected for a catch.
 */
const topLevelDeclBody = (
  program: ProgramLike,
  name: string,
): Option.Option<unknown> =>
  pipe(
    program.body,
    Arr.findFirst(statement =>
      pipe(
        declaratorLike(statement),
        Option.flatMap(decl => {
          if (!P.isObject(decl) || !('type' in decl)) {
            return Option.none()
          }
          if (
            decl.type === 'FunctionDeclaration' &&
            'id' in decl &&
            isIdentifierLike(decl.id) &&
            decl.id.name === name &&
            'body' in decl
          ) {
            return Option.some(decl.body)
          }
          if (
            decl.type === 'VariableDeclaration' &&
            'declarations' in decl &&
            Array.isArray(decl.declarations)
          ) {
            return pipe(
              decl.declarations,
              Arr.findFirst(
                (d): d is { readonly init: unknown } =>
                  P.isObject(d) &&
                  'id' in d &&
                  isIdentifierLike(d.id) &&
                  d.id.name === name &&
                  'init' in d &&
                  d.init !== null,
              ),
              Option.map(d => d.init),
            )
          }
          return Option.none()
        }),
      ),
    ),
  )

/**
 * True when the applied Effect body calls a locally-defined function whose own
 * body contains an `Effect.catch*`/`Effect.match*` — i.e. the catch is extracted
 * into a helper instead of inlined. Follows one level of indirection; if the
 * helper can't be resolved in this Program, returns false (keep flagging).
 */
const appliedCallsLocalCatcher = (call: ESTree.CallExpression): boolean => {
  const names = new Set<string>()
  pipe(
    call.arguments,
    Arr.forEach(arg => collectCalledIdentifierNames(arg, names)),
  )
  if (names.size === 0) return false
  return pipe(
    findProgram(call),
    Option.match({
      onNone: () => false,
      onSome: program =>
        pipe(
          Array.from(names),
          Arr.some(name =>
            pipe(
              topLevelDeclBody(program, name),
              Option.match({
                onNone: () => false,
                onSome: containsCatch,
              }),
            ),
          ),
        ),
    }),
  )
}

const failedList = (defineCall: ESTree.CallExpression): string =>
  pipe(failedResultNames(defineCall), Arr.join(', '))

const rule: CreateRule = Rule.define({
  name: 'command-failed-result-requires-catch',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Commands declaring Failed* results must catch failures into those result messages',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.on('CallExpression', node => {
      if (isCommandDefineCall(node)) {
        return hasFailedResult(node) && !isImmediatelyApplied(node)
          ? ctx.report(
              Diagnostic.make({
                node,
                message: `\`Command.define\` declares ${failedList(node)} but is not immediately applied to an Effect factory. Apply it in-place and catch failures into the Failed result. (FK commands)`,
              }),
            )
          : Effect.void
      }
      return pipe(
        appliedCommandDefine(node),
        Option.filter(hasFailedResult),
        Option.filter(
          () =>
            !appliedArgumentContainsCatch(node) &&
            !appliedCallsLocalCatcher(node),
        ),
        Option.match({
          onNone: () => Effect.void,
          onSome: defineCall =>
            ctx.report(
              Diagnostic.make({
                node,
                message: `\`Command.define\` declares ${failedList(defineCall)} but the applied Effect does not contain \`Effect.catch*\` or \`Effect.match*\`. Catch failures and return the Failed result so the Foldkit runtime receives a Message instead of a defect. (FK commands)`,
              }),
            ),
        }),
      )
    })
  },
})

export default rule
