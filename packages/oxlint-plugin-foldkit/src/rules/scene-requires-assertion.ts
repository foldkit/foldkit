import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

// The block constructors, keyed by namespace, whose bodies we inspect.
const SCENE_BLOCKS: ReadonlyArray<readonly [string, string]> = [
  ['Scene', 'scene'],
  ['Story', 'story'],
]

// Names that only prepare state (never assert): Scene.with / Story.with and the
// block constructors themselves are excluded so a setup-only block reports.
const INTERACTION_METHODS: ReadonlyArray<string> = [
  'click',
  'doubleClick',
  'type',
  'submit',
  'tap',
  'keydown',
  'pointerDown',
  'pointerUp',
  'hover',
  'focus',
  'blur',
  'change',
  'changeFiles',
  'dropFiles',
  'role',
  'text',
  'label',
]

const isCallExpression = (node: unknown): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression'

const isMemberExpression = (node: unknown): node is ESTree.MemberExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'MemberExpression'

const isIdentifierNamed = (
  node: unknown,
  name: string,
): node is Readonly<{ type: 'Identifier'; name: string }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Identifier' &&
  'name' in node &&
  node.name === name

const propertyName = (node: ESTree.MemberExpression): string | undefined =>
  !node.computed &&
  typeof node.property === 'object' &&
  node.property !== null &&
  'type' in node.property &&
  node.property.type === 'Identifier' &&
  'name' in node.property &&
  typeof node.property.name === 'string'
    ? node.property.name
    : undefined

// True when the call is `Scene.<m>()`, `Story.<m>()`, `Scene.Command.<m>()`, or
// `Story.Command.<m>()` for some namespace root and returns the leaf method name.
const namespaceCallLeaf = (node: ESTree.CallExpression): string | undefined => {
  const callee = node.callee
  if (!isMemberExpression(callee)) {
    return undefined
  }
  const leaf = propertyName(callee)
  if (leaf === undefined) {
    return undefined
  }
  const object = callee.object
  const rootedInNamespace =
    isIdentifierNamed(object, 'Scene') ||
    isIdentifierNamed(object, 'Story') ||
    (isMemberExpression(object) &&
      propertyName(object) === 'Command' &&
      (isIdentifierNamed(object.object, 'Scene') ||
        isIdentifierNamed(object.object, 'Story')))
  return rootedInNamespace ? leaf : undefined
}

// An assertion (`expect*`), a Command resolution (`resolve*`), a model check
// (`model`), or an interaction proves the block does more than set up state.
const isMeaningfulLeaf = (leaf: string): boolean =>
  leaf.startsWith('expect') ||
  leaf.startsWith('resolve') ||
  leaf === 'model' ||
  INTERACTION_METHODS.includes(leaf)

// Depth-first scan for any meaningful Scene/Story call among the descendants.
const containsMeaningfulCall = (node: unknown): boolean => {
  if (typeof node !== 'object' || node === null) {
    return false
  }
  if (
    isCallExpression(node) &&
    ((): boolean => {
      const leaf = namespaceCallLeaf(node)
      return leaf !== undefined && isMeaningfulLeaf(leaf)
    })()
  ) {
    return true
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      if (value.some(containsMeaningfulCall)) {
        return true
      }
    } else if (containsMeaningfulCall(value)) {
      return true
    }
  }
  return false
}

const isSceneBlock = (node: ESTree.CallExpression): boolean => {
  const callee = node.callee
  if (!isMemberExpression(callee)) {
    return false
  }
  const leaf = propertyName(callee)
  return SCENE_BLOCKS.some(
    ([root, method]) => leaf === method && isIdentifierNamed(callee.object, root),
  )
}

const SCENE_REQUIRES_ASSERTION_MESSAGE =
  'This Scene.scene/Story.story block only sets up a model and asserts nothing, so it passes green without testing anything. Add at least one assertion (Scene.expect / Story.Command.expect* / Story.model), a Command resolution (Command.resolve), or an interaction (Scene.click / Scene.type).'

/**
 * Requires every Scene.scene/Story.story block to contain at least one
 * assertion, Command resolution, or interaction. A block that only calls
 * Scene.with sets up state, asserts nothing, and passes green vacuously.
 */
export const sceneRequiresAssertion = Rule.define({
  name: 'scene-requires-assertion',
  meta: Rule.meta({
    type: 'problem',
    description:
      'A Scene.scene/Story.story block must assert something, resolve a Command, or interact — not just set up a model.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node) || !isSceneBlock(node)) {
          return Effect.void
        }
        if (node.arguments.some(containsMeaningfulCall)) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node,
            message: SCENE_REQUIRES_ASSERTION_MESSAGE,
          }),
        )
      },
    }
  },
})
