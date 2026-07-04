import { Array, Effect, Option, String, pipe } from 'effect'
import {
  AST,
  Diagnostic,
  type ESTree,
  Rule,
  RuleContext,
  Visitor,
} from 'effect-oxlint'

const subscriptionWrapperTypes: ReadonlyArray<string> = [
  'ParenthesizedExpression',
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
  'TSNonNullExpression',
  'TSInstantiationExpression',
  'ChainExpression',
]

const subscriptionMethods: ReadonlyArray<string> = ['make', 'lift', 'aggregate']

const canonicalExportName = 'subscriptions'

const missingCanonicalMessage =
  'A subscription.ts file that builds Subscriptions must export one canonical `subscriptions` const created with Subscription.make, Subscription.aggregate, or Subscription.lift.'

const invalidCanonicalMessage =
  'Initialize the canonical `subscriptions` export from Subscription.make, Subscription.aggregate, or Subscription.lift. Build intermediate records in local consts and combine them with Subscription.aggregate.'

const extraExportedMessage = (method: string): string =>
  `Only the canonical \`subscriptions\` const may be exported from subscription.ts. Keep this Subscription.${method} record local and fold it into \`subscriptions\` with Subscription.aggregate.`

const subscriptionSpreadMessage =
  'Do not spread Subscription records or `.subscriptions` members into object literals. Combine records with Subscription.aggregate so duplicate Subscription keys fail loudly.'

const isSubscriptionFile = (filename: string): boolean =>
  pipe(
    filename,
    String.replaceAll('\\', '/'),
    String.split('/'),
    Array.lastNonEmpty,
  ) === 'subscription.ts'

const isWrapperExpression = (
  node: unknown,
): node is Readonly<{ expression: unknown }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  typeof node.type === 'string' &&
  subscriptionWrapperTypes.includes(node.type) &&
  'expression' in node

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

const isObjectExpression = (node: unknown): node is ESTree.ObjectExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ObjectExpression'

const isVariableDeclaration = (
  node: unknown,
): node is ESTree.VariableDeclaration =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'VariableDeclaration'

const isProgram = (node: ESTree.Node): node is ESTree.Program =>
  node.type === 'Program'

const rootedSubscriptionMethod = (node: unknown): Option.Option<string> => {
  if (isWrapperExpression(node)) {
    return rootedSubscriptionMethod(node.expression)
  }
  if (isCallExpression(node)) {
    return rootedSubscriptionMethod(node.callee)
  }
  if (isMemberExpression(node)) {
    return pipe(
      AST.memberPath(node),
      Option.flatMap(path => {
        const [root, method, extraSegment] = path
        return root === 'Subscription' &&
          method !== undefined &&
          extraSegment === undefined &&
          subscriptionMethods.includes(method)
          ? Option.some(method)
          : Option.none()
      }),
    )
  }
  return Option.none()
}

type ModuleConst = Readonly<{
  name: string
  identifier: ESTree.BindingIdentifier
  maybeInitializer: Option.Option<ESTree.Expression>
  isExported: boolean
}>

const specifierExportedNames = (
  program: ESTree.Program,
): ReadonlySet<string> => {
  const names = program.body.flatMap(statement => {
    if (
      statement.type !== 'ExportNamedDeclaration' ||
      statement.declaration !== null
    ) {
      return []
    }
    return statement.specifiers.flatMap(specifier =>
      specifier.local.type === 'Identifier' ? [specifier.local.name] : [],
    )
  })
  return new Set(names)
}

const moduleConsts = (program: ESTree.Program): ReadonlyArray<ModuleConst> => {
  const exportedBySpecifier = specifierExportedNames(program)
  return program.body.flatMap(statement => {
    const isInlineExported = statement.type === 'ExportNamedDeclaration'
    const declaration = isInlineExported ? statement.declaration : statement
    if (!isVariableDeclaration(declaration) || declaration.kind !== 'const') {
      return []
    }
    const declarators = declaration.declarations
    return declarators.flatMap(declarator => {
      const id = declarator.id
      if (id.type !== 'Identifier') {
        return []
      }
      return [
        {
          name: id.name,
          identifier: id,
          maybeInitializer: Option.fromNullishOr(declarator.init),
          isExported: isInlineExported || exportedBySpecifier.has(id.name),
        },
      ]
    })
  })
}

const isSubscriptionRootedInitializer = (moduleConst: ModuleConst): boolean =>
  pipe(
    moduleConst.maybeInitializer,
    Option.flatMap(rootedSubscriptionMethod),
    Option.isSome,
  )

const collectSubscriptionCalls = (
  value: unknown,
): ReadonlyArray<ESTree.CallExpression> => {
  if (typeof value !== 'object' || value === null) {
    return []
  }
  const selfMatches =
    isCallExpression(value) && Option.isSome(rootedSubscriptionMethod(value))
      ? [value]
      : []
  const childEntries = Object.entries(value)
  const childMatches = childEntries.flatMap(([key, child]) =>
    key === 'parent' ? [] : collectSubscriptionCalls(child),
  )
  return [...selfMatches, ...childMatches]
}

const spreadProperties = (
  objectExpression: ESTree.ObjectExpression,
): ReadonlyArray<ESTree.SpreadElement> => {
  const properties = objectExpression.properties
  return properties.flatMap(property =>
    property.type === 'SpreadElement' ? [property] : [],
  )
}

const collectObjectSpreads = (
  value: unknown,
): ReadonlyArray<ESTree.SpreadElement> => {
  if (typeof value !== 'object' || value === null) {
    return []
  }
  const selfMatches = isObjectExpression(value) ? spreadProperties(value) : []
  const childEntries = Object.entries(value)
  const childMatches = childEntries.flatMap(([key, child]) =>
    key === 'parent' ? [] : collectObjectSpreads(child),
  )
  return [...selfMatches, ...childMatches]
}

const isSpreadOffense = (
  spread: ESTree.SpreadElement,
  subscriptionConstNames: ReadonlyArray<string>,
): boolean => {
  const argument = spread.argument
  if (argument.type === 'Identifier') {
    return subscriptionConstNames.includes(argument.name)
  }
  if (argument.type === 'MemberExpression') {
    return pipe(
      AST.memberPath(argument),
      Option.exists(path => Array.lastNonEmpty(path) === canonicalExportName),
    )
  }
  return false
}

/**
 * Requires a subscription.ts file to expose exactly one canonical
 * `subscriptions` export rooted at a Foldkit Subscription constructor and to
 * combine Subscription records with Subscription.aggregate instead of object
 * spreads.
 */
export const subscriptionFileCanonicalShape = Rule.define({
  name: 'subscription-file-canonical-shape',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Shape subscription.ts around one canonical `subscriptions` export built with Subscription.make, Subscription.aggregate, or Subscription.lift.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const visitor = Visitor.onExit('Program', (node: ESTree.Node) => {
      if (!isProgram(node)) {
        return Effect.void
      }
      const consts = moduleConsts(node)
      const subscriptionCalls = collectSubscriptionCalls(node)
      const subscriptionConstNames = consts.flatMap(moduleConst =>
        isSubscriptionRootedInitializer(moduleConst) ? [moduleConst.name] : [],
      )
      const objectSpreads = collectObjectSpreads(node)
      const offendingSpreads = objectSpreads.filter(spread =>
        isSpreadOffense(spread, subscriptionConstNames),
      )
      const maybeCanonicalConst = Array.findFirst(
        consts,
        moduleConst =>
          moduleConst.isExported && moduleConst.name === canonicalExportName,
      )

      const reportMissingCanonical = Option.isSome(maybeCanonicalConst)
        ? Effect.void
        : pipe(
            Array.head(subscriptionCalls),
            Option.orElse(() => Array.head(offendingSpreads)),
            Option.match({
              onNone: () => Effect.void,
              onSome: usageNode =>
                ctx.report(
                  Diagnostic.make({
                    node: usageNode,
                    message: missingCanonicalMessage,
                  }),
                ),
            }),
          )

      const reportInvalidCanonical = pipe(
        maybeCanonicalConst,
        Option.match({
          onNone: () => Effect.void,
          onSome: canonicalConst =>
            isSubscriptionRootedInitializer(canonicalConst)
              ? Effect.void
              : ctx.report(
                  Diagnostic.make({
                    node: Option.getOrElse(
                      canonicalConst.maybeInitializer,
                      () => canonicalConst.identifier,
                    ),
                    message: invalidCanonicalMessage,
                  }),
                ),
        }),
      )

      const extraExportedSubscriptionConsts = consts.flatMap(moduleConst => {
        if (
          !moduleConst.isExported ||
          moduleConst.name === canonicalExportName
        ) {
          return []
        }
        return pipe(
          moduleConst.maybeInitializer,
          Option.flatMap(rootedSubscriptionMethod),
          Option.match({
            onNone: () => [],
            onSome: method => [{ identifier: moduleConst.identifier, method }],
          }),
        )
      })
      const reportExtraExports = Effect.forEach(
        extraExportedSubscriptionConsts,
        extraExport =>
          ctx.report(
            Diagnostic.make({
              node: extraExport.identifier,
              message: extraExportedMessage(extraExport.method),
            }),
          ),
        { discard: true },
      )

      const reportSpreads = Effect.forEach(
        offendingSpreads,
        spread =>
          ctx.report(
            Diagnostic.make({
              node: spread,
              message: subscriptionSpreadMessage,
            }),
          ),
        { discard: true },
      )

      return Effect.all(
        [
          reportMissingCanonical,
          reportInvalidCanonical,
          reportExtraExports,
          reportSpreads,
        ],
        { discard: true },
      )
    })
    return yield* Visitor.filter(isSubscriptionFile, visitor)
  },
})
