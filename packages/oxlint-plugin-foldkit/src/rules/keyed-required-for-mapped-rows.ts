import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as HashSet from 'effect/HashSet'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Schema from 'effect/Schema'

/**
 * `.map(...)` callbacks that return a row element (`li`, `div`, `tr`, ...)
 * tied to a domain entity's identity must wrap with `keyed('tag')(item.id, ...)`.
 * Otherwise snabbdom can patch the wrong row's event handlers into surviving
 * rows when the list mutates (delete-mid-list, reorder, filter).
 *
 * To reduce false positives over static literal lists, the rule only fires
 * when the callback body references `<param>.id` — i.e. the row is
 * identity-bearing. Stateless rows over literals are passed through.
 *
 * Escape hatch: `// oxlint-disable-next-line @mpsuesser/foldkit/keyed-required-for-mapped-rows`.
 *
 * @since 0.4.0
 */

const ROW_ELEMENT_TAGS = HashSet.make('li', 'div', 'tr', 'article', 'section')

const isRowElementCall = (
  node: ESTree.Node,
): Option.Option<{ readonly tag: string; readonly node: ESTree.Node }> => {
  if (node.type !== 'CallExpression') return Option.none()
  if (node.callee.type !== 'Identifier') return Option.none()
  const name = node.callee.name
  return HashSet.has(ROW_ELEMENT_TAGS, name)
    ? Option.some({ tag: name, node })
    : Option.none()
}

/**
 * Pattern: `keyed('li')(id, attrs, children)` — outer CallExpression whose
 * callee is itself a CallExpression on `keyed`.
 */
const isKeyedWrapped = (node: ESTree.Node): boolean =>
  node.type === 'CallExpression' &&
  node.callee.type === 'CallExpression' &&
  node.callee.callee.type === 'Identifier' &&
  node.callee.callee.name === 'keyed'

/**
 * Recognise both `Array.map(items, fn)` and `items.map(fn)`. Returns the
 * arrow-function callback if the shape matches. Function expressions
 * (`function (item) { ... }`) are deliberately not supported — Foldkit
 * row renderers are uniformly arrow functions.
 */
const mapCallback = (
  call: ESTree.CallExpression,
): Option.Option<ESTree.ArrowFunctionExpression> => {
  if (call.callee.type !== 'MemberExpression') return Option.none()
  if (call.callee.property.type !== 'Identifier') return Option.none()
  if (call.callee.property.name !== 'map') return Option.none()
  const isArrayMapCall =
    call.callee.object.type === 'Identifier' &&
    call.callee.object.name === 'Array'
  const callback = isArrayMapCall ? call.arguments[1] : call.arguments[0]
  if (callback === undefined) return Option.none()
  if (callback.type !== 'ArrowFunctionExpression') return Option.none()
  return Option.some(callback)
}

const callbackReturnExpression = (
  fn: ESTree.ArrowFunctionExpression,
): Option.Option<ESTree.Node> => {
  const body = fn.body
  if (body.type !== 'BlockStatement') {
    return Option.some<ESTree.Node>(body)
  }
  return pipe(
    body.body,
    Arr.findLast(
      (s): s is ESTree.ReturnStatement => s.type === 'ReturnStatement',
    ),
    Option.flatMap(ret =>
      ret.argument === null
        ? Option.none()
        : Option.some<ESTree.Node>(ret.argument),
    ),
  )
}

// ── `<param>.id` reference walker ──────────────────────────────────────────
//
// Recursively walks the callback body looking for a MemberExpression of shape
// `<paramName>.id`. The shape check is Schema-validated so we never need to
// cast back to `ESTree.Node` during the walk.

const buildIsParamIdAccess = (paramName: string) =>
  Schema.is(
    Schema.Struct({
      type: Schema.Literal('MemberExpression'),
      object: Schema.Struct({
        type: Schema.Literal('Identifier'),
        name: Schema.Literal(paramName),
      }),
      property: Schema.Struct({
        type: Schema.Literal('Identifier'),
        name: Schema.Literal('id'),
      }),
    }),
  )

const referencesParamId = (paramName: string, root: unknown): boolean => {
  const matches = buildIsParamIdAccess(paramName)
  const walk = (n: unknown): boolean => {
    if (matches(n)) return true
    if (!P.isObject(n)) return false
    return pipe(
      Object.values(n),
      Arr.some(child =>
        Array.isArray(child) ? pipe(child, Arr.some(walk)) : walk(child),
      ),
    )
  }
  return walk(root)
}

const callbackBodyReferencesId = (
  fn: ESTree.ArrowFunctionExpression,
): boolean => {
  const param = fn.params[0]
  if (param === undefined) return false
  // Destructured params (`({ id }) => ...`) — assume identity-bearing.
  if (param.type !== 'Identifier') return true
  return referencesParamId(param.name, fn.body)
}

// ── Rule ───────────────────────────────────────────────────────────────────

const rule: CreateRule = Rule.define({
  name: 'keyed-required-for-mapped-rows',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Row renderers in `.map` over domain entities must wrap their element in `keyed(...)` to avoid snabbdom patching bugs (FK-5)',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.on('CallExpression', node =>
      pipe(
        mapCallback(node),
        Option.flatMap(cb =>
          pipe(
            callbackReturnExpression(cb),
            Option.flatMap(ret =>
              pipe(
                isRowElementCall(ret),
                Option.filter(() => !isKeyedWrapped(ret)),
                Option.filter(() => callbackBodyReferencesId(cb)),
              ),
            ),
          ),
        ),
        Option.match({
          onNone: () => Effect.void,
          onSome: ({ tag, node: rowNode }) =>
            ctx.report(
              Diagnostic.make({
                node: rowNode,
                message: `Row renderer returns \`${tag}(...)\` without a \`keyed(...)\` wrapper. When the list is reordered or pruned, snabbdom may patch the wrong row's handlers onto surviving rows. Wrap with \`keyed('${tag}')(item.id, attrs, children)\`. (FK-5)`,
              }),
            ),
        }),
      ),
    )
  },
})

export default rule
