import { Array, Effect, Option } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
} from 'effect-oxlint'

import { ELEMENT_BUILDER_NAMES } from '../elementBuilderNames.ts'
import {
  indexReferences,
  isArrayExpression,
  isCallExpression,
  isFoldkitHtmlBuilderMember,
  isIdentifier,
  isMemberExpression,
  staticMemberPath,
} from '../guards.ts'

// The builder bindings Foldkit views use: the `h` a view receives, and
// `inertHtml` under both its own name and the `ih` it is usually imported as.
// Matching on them keeps the rule off unrelated calls that happen to end in an
// empty array.
const BUILDER_BINDINGS: ReadonlySet<string> = new Set(['h', 'ih', 'inertHtml'])

const KEYED_PROPERTY = 'keyed'

type BuilderCallee = Readonly<{ binding: string; property: string }>

const builderCallee = (
  callee: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<BuilderCallee> => {
  if (!isMemberExpression(callee) || callee.computed === true) {
    return Option.none()
  }
  if (!isIdentifier(callee.property)) {
    return Option.none()
  }
  const maybePath = staticMemberPath(callee)
  if (Option.isNone(maybePath)) {
    return Option.none()
  }
  const path = maybePath.value
  const binding = [path.root.name, ...Array.dropRight(path.members, 1)].join(
    '.',
  )
  if (
    references === undefined
      ? !BUILDER_BINDINGS.has(binding)
      : !isFoldkitHtmlBuilderMember(callee, callee.property.name, references)
  ) {
    return Option.none()
  }
  return Option.some({
    binding,
    property: callee.property.name,
  })
}

const elementCallTarget = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<string> =>
  node.arguments.length === 2
    ? builderCallee(node.callee, references).pipe(
        Option.filter(({ property }) => ELEMENT_BUILDER_NAMES.has(property)),
        Option.map(({ binding, property }) => `${binding}.${property}([...])`),
      )
    : Option.none()

// `keyed` applies the tag before the element arguments, so the children slot is
// the third argument of the outer call rather than the second.
const keyedCallTarget = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<string> => {
  if (node.arguments.length !== 3 || !isCallExpression(node.callee)) {
    return Option.none()
  }
  return builderCallee(node.callee.callee, references).pipe(
    Option.filter(({ property }) => property === KEYED_PROPERTY),
    Option.map(
      ({ binding }) => `${binding}.${KEYED_PROPERTY}(tag)(key, [...])`,
    ),
  )
}

const childrenArgument = (
  node: ESTree.CallExpression,
): Option.Option<ESTree.Node> => Array.last(node.arguments)

const emptyChildrenMessage = (target: string): string =>
  `Omit the children argument when an element has none. Write ${target} instead of passing a trailing []. The builder defaults children to an empty array, so the two build the same vnode and the [] carries no information.`

/** Flags builder calls that pass an inline empty array as children, both `h.div([...], [])` and `h.keyed(tag)(key, [...], [])`. The children argument is optional on both, so an element with no children should omit it rather than spell out `[]`. */
export const noEmptyChildrenArray = Rule.define({
  name: 'no-empty-children-array',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Omit the children argument on elements that have no children.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }
        const maybeTarget = Option.orElse(
          elementCallTarget(node, references),
          () => keyedCallTarget(node, references),
        )
        if (Option.isNone(maybeTarget)) {
          return Effect.void
        }
        const maybeChildren = childrenArgument(node)
        if (
          Option.isNone(maybeChildren) ||
          !isArrayExpression(maybeChildren.value) ||
          Array.isReadonlyArrayNonEmpty(maybeChildren.value.elements)
        ) {
          return Effect.void
        }
        // An array holding only a comment still carries the comment, which
        // dropping the argument would delete along with it.
        if (
          Array.isReadonlyArrayNonEmpty(
            ctx.sourceCode.getCommentsInside(maybeChildren.value),
          )
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node: maybeChildren.value,
            message: emptyChildrenMessage(maybeTarget.value),
          }),
        )
      },
    }
  },
})
