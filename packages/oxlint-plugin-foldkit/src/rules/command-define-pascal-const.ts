import { Array, Effect, Option } from 'effect'
import {
  AST,
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
} from 'effect-oxlint'

import {
  indexReferences,
  firstCommandNameArgument,
  isCallExpression,
  isIdentifier,
  isVariableDeclaration,
  isVariableDeclarator,
  resolveFoldkitApiPath,
  staticMemberPath,
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

const isCommandDefineCall = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (references === undefined) {
    return AST.isCallOf(node, 'Command', 'define')
  }

  return Option.exists(resolveFoldkitApiPath(references, node.callee), path => {
    const [namespace, methodName, extraMember] = path

    return (
      namespace === 'Command' &&
      methodName === 'define' &&
      extraMember === undefined
    )
  })
}

const headCommandDefineCall = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ESTree.CallExpression> => {
  if (!isCallExpression(node)) {
    return Option.none()
  }
  if (isCommandDefineCall(node, references)) {
    return Option.some(node)
  }
  return headCommandDefineCall(node.callee, references)
}

const commandApiLabel = (node: ESTree.CallExpression): string =>
  Option.match(staticMemberPath(node.callee), {
    onNone: () => 'Command.define',
    onSome: path => {
      const method = Option.getOrElse(Array.last(path.members), () => 'define')
      return `${path.root.name}.${method}`
    },
  })

const missingLiteralNameMessage = (apiLabel: string): string =>
  `${apiLabel} needs a literal string name as its first argument. The name is the Command's identity and cannot be computed.`

const nonPascalCaseMessage = (apiLabel: string, name: string): string =>
  `${apiLabel}('${name}', ...) must use a PascalCase name, like FetchWeather or FocusInput.`

const notAssignedMessage = (apiLabel: string, name: string): string =>
  `${apiLabel}('${name}', ...) must be assigned to a PascalCase const, never inlined in a pipe or expression. Write const ${name} = ${apiLabel}('${name}', ...).`

const mismatchedConstMessage = (
  apiLabel: string,
  name: string,
  actualName: string,
): string =>
  `${apiLabel}('${name}', ...) should be assigned to a const named ${name}, not ${actualName}. The const name mirrors the Command identity.`

const notConstMessage = (apiLabel: string, name: string): string =>
  `${apiLabel}('${name}', ...) must be assigned to a const, not let or var. Write const ${name} = ${apiLabel}('${name}', ...).`

const diagnosticMessage = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<string> => {
  const apiLabel = commandApiLabel(node)
  const nameArgument = firstCommandNameArgument(node)
  if (nameArgument === undefined) {
    return Option.some(missingLiteralNameMessage(apiLabel))
  }
  const name = nameArgument.value
  if (!PASCAL_CASE_NAME.test(name)) {
    return Option.some(nonPascalCaseMessage(apiLabel, name))
  }
  return Option.match(nearestVariableDeclarator(node.parent), {
    onNone: () => Option.some(notAssignedMessage(apiLabel, name)),
    onSome: declarator => {
      const headsInitializer = Option.exists(
        headCommandDefineCall(declarator.init, references),
        call => call === node,
      )
      if (!headsInitializer) {
        return Option.some(notAssignedMessage(apiLabel, name))
      }
      if (!isConstDeclarator(declarator)) {
        return Option.some(notConstMessage(apiLabel, name))
      }
      if (isIdentifier(declarator.id) && declarator.id.name !== name) {
        return Option.some(
          mismatchedConstMessage(apiLabel, name, declarator.id.name),
        )
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
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node) || !isCommandDefineCall(node, references)) {
          return Effect.void
        }
        return Option.match(diagnosticMessage(node, references), {
          onNone: () => Effect.void,
          onSome: message => ctx.report(Diagnostic.make({ node, message })),
        })
      },
    }
  },
})
