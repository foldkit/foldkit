import { Effect } from 'effect'
import { Diagnostic, type ESTree, type Ranged, Rule, RuleContext } from 'effect-oxlint'

const isProgram = (node: unknown): node is ESTree.Program =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Program' &&
  'body' in node &&
  Array.isArray((node as { body: unknown }).body)

const isVariableDeclaration = (
  node: unknown,
): node is Readonly<{ type: 'VariableDeclaration'; declarations: ReadonlyArray<unknown> }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'VariableDeclaration' &&
  'declarations' in node &&
  Array.isArray((node as { declarations: unknown }).declarations)

const isExportNamedDeclaration = (
  node: unknown,
): node is Readonly<{ type: 'ExportNamedDeclaration'; declaration: unknown }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ExportNamedDeclaration' &&
  'declaration' in node

const isIdentifier = (
  node: unknown,
): node is Readonly<{ type: 'Identifier'; name: string }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Identifier' &&
  'name' in node &&
  typeof node.name === 'string'

const isIdentifierNamed = (node: unknown, name: string): boolean =>
  isIdentifier(node) && node.name === name

const isCallExpression = (node: unknown): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression' &&
  'arguments' in node &&
  Array.isArray((node as { arguments: unknown }).arguments)

const isArrayExpression = (
  node: unknown,
): node is Readonly<{ type: 'ArrayExpression'; elements: ReadonlyArray<unknown> }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ArrayExpression' &&
  'elements' in node &&
  Array.isArray((node as { elements: unknown }).elements)

// A Message union is `Schema.Union(...)` or its `S.Union(...)` alias.
const isSchemaUnionCall = (node: unknown): node is ESTree.CallExpression => {
  if (!isCallExpression(node)) {
    return false
  }
  const callee = node.callee
  return (
    typeof callee === 'object' &&
    callee !== null &&
    'type' in callee &&
    callee.type === 'MemberExpression' &&
    'property' in callee &&
    isIdentifierNamed(callee.property, 'Union') &&
    'object' in callee &&
    (isIdentifierNamed(callee.object, 'Schema') ||
      isIdentifierNamed(callee.object, 'S'))
  )
}

// A Message constructor is declared with the `m('Tag', ...)` combinator.
const isMessageConstructorInit = (init: unknown): boolean =>
  isCallExpression(init) && isIdentifierNamed(init.callee, 'm')

// Union members appear either spread as direct identifier arguments
// (`Union(A, B)`) or inside a single array literal (`Union([A, B])`).
const collectUnionMemberNames = (
  call: ESTree.CallExpression,
): ReadonlyArray<string> =>
  call.arguments.flatMap(argument => {
    if (isIdentifier(argument)) {
      return [argument.name]
    }
    if (isArrayExpression(argument)) {
      return argument.elements.flatMap(element =>
        isIdentifier(element) ? [element.name] : [],
      )
    }
    return []
  })

const declarationOf = (statement: unknown): unknown =>
  isExportNamedDeclaration(statement) ? statement.declaration : statement

type Constructor = Readonly<{ name: string; node: Ranged }>

const unregisteredMessage = (name: string): string =>
  `Message constructor \`${name}\` is declared with \`m(...)\` but is not registered in the module's \`Message\` Schema.Union(...). Add ${name} to the union so every Message is part of the app's Message type.`

/**
 * Keeps a message module's `m(...)` constructors in sync with its `Message`
 * `Schema.Union(...)` (or the `S.Union` alias). Flags any top-level Message
 * constructor that was declared but never registered in the union, so a new
 * Message can't silently fall outside the app's Message type.
 */
export const messageUnionMemberRegistration = Rule.define({
  name: 'message-union-member-registration',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Register every m(...) Message constructor in the module Message Schema.Union.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      Program: (node: ESTree.Node) => {
        if (!isProgram(node)) {
          return Effect.void
        }
        const constructors: Array<Constructor> = []
        let unionMemberNames: ReadonlyArray<string> | undefined

        for (const statement of node.body) {
          const declaration = declarationOf(statement)
          if (!isVariableDeclaration(declaration)) {
            continue
          }
          for (const declarator of declaration.declarations) {
            if (
              typeof declarator !== 'object' ||
              declarator === null ||
              !('id' in declarator) ||
              !('init' in declarator)
            ) {
              continue
            }
            const id = (declarator as { id: unknown }).id
            const init = (declarator as { init: unknown }).init
            if (!isIdentifier(id)) {
              continue
            }
            if (id.name === 'Message' && isSchemaUnionCall(init)) {
              unionMemberNames = collectUnionMemberNames(init)
              continue
            }
            if (isMessageConstructorInit(init)) {
              constructors.push({
                name: id.name,
                node: declarator as unknown as Ranged,
              })
            }
          }
        }

        // Only enforce when the module is a self-contained message module:
        // it must declare at least one constructor AND its Message union.
        if (unionMemberNames === undefined || constructors.length === 0) {
          return Effect.void
        }

        const registered = unionMemberNames
        const unregistered = constructors.filter(
          constructor => !registered.includes(constructor.name),
        )
        return Effect.forEach(
          unregistered,
          constructor =>
            ctx.report(
              Diagnostic.make({
                node: constructor.node,
                message: unregisteredMessage(constructor.name),
              }),
            ),
          { discard: true },
        )
      },
    }
  },
})
