import { Effect, Option } from 'effect'
import { AST, Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import {
  isCallExpression,
  isIdentifier,
  isStringLiteral,
  isVariableDeclaration,
  isVariableDeclarator,
} from '../guards.ts'

const PASCAL_CASE_NAME = /^[A-Z][A-Za-z0-9]*$/

const isConstDeclarator = (declarator: unknown): boolean =>
  typeof declarator === 'object' &&
  declarator !== null &&
  'parent' in declarator &&
  isVariableDeclaration(declarator.parent) &&
  declarator.parent.kind === 'const'

const nearestVariableDeclarator = (
  node: unknown,
): Option.Option<ESTree.VariableDeclarator> => {
  if (typeof node !== 'object' || node === null) {
    return Option.none()
  }
  if (isVariableDeclarator(node)) {
    return Option.some(node)
  }
  return 'parent' in node
    ? nearestVariableDeclarator(node.parent)
    : Option.none()
}

const headCommandDefineCall = (
  node: unknown,
): Option.Option<ESTree.CallExpression> => {
  if (!isCallExpression(node)) {
    return Option.none()
  }
  if (AST.isCallOf(node, 'Command', 'define')) {
    return Option.some(node)
  }
  return headCommandDefineCall(node.callee)
}

const missingLiteralNameMessage =
  "Command.define needs a literal string name as its first argument. The name is the Command's identity and cannot be computed."

const nonPascalCaseMessage = (name: string): string =>
  `Command.define('${name}', ...) must use a PascalCase name, like FetchWeather or FocusInput.`

const notAssignedMessage = (name: string): string =>
  `Command.define('${name}', ...) must be assigned to a PascalCase const, never inlined in a pipe or expression. Write const ${name} = Command.define('${name}', ...).`

const mismatchedConstMessage = (name: string, actualName: string): string =>
  `Command.define('${name}', ...) should be assigned to a const named ${name}, not ${actualName}. The const name mirrors the Command identity.`

const notConstMessage = (name: string): string =>
  `Command.define('${name}', ...) must be assigned to a const, not let or var. Write const ${name} = Command.define('${name}', ...).`

const diagnosticMessage = (
  node: ESTree.CallExpression,
): Option.Option<string> => {
  const [firstArgument] = node.arguments
  if (!isStringLiteral(firstArgument)) {
    return Option.some(missingLiteralNameMessage)
  }
  const name = firstArgument.value
  if (!PASCAL_CASE_NAME.test(name)) {
    return Option.some(nonPascalCaseMessage(name))
  }
  return Option.match(nearestVariableDeclarator(node.parent), {
    onNone: () => Option.some(notAssignedMessage(name)),
    onSome: declarator => {
      const headsInitializer = Option.exists(
        headCommandDefineCall(declarator.init),
        call => call === node,
      )
      if (!headsInitializer) {
        return Option.some(notAssignedMessage(name))
      }
      if (!isConstDeclarator(declarator)) {
        return Option.some(notConstMessage(name))
      }
      if (isIdentifier(declarator.id) && declarator.id.name !== name) {
        return Option.some(mismatchedConstMessage(name, declarator.id.name))
      }
      return Option.none()
    },
  })
}

/**
 * Requires every Command.define call to name the Command with a literal
 * PascalCase string and to be assigned to a const whose identifier equals
 * that name.
 */
export const commandDefinePascalConst = Rule.define({
  name: 'command-define-pascal-const',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Name Commands with a literal PascalCase string assigned to a const of the same name.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (
          !isCallExpression(node) ||
          !AST.isCallOf(node, 'Command', 'define')
        ) {
          return Effect.void
        }
        return Option.match(diagnosticMessage(node), {
          onNone: () => Effect.void,
          onSome: message => ctx.report(Diagnostic.make({ node, message })),
        })
      },
    }
  },
})
