import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { AST, Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Result from 'effect/Result'
import * as Str from 'effect/String'

const normalizedPath = (filename: string): string =>
  Str.replaceAll('\\', '/')(filename)

const pathSegments = (filename: string): ReadonlyArray<string> =>
  Str.split('/')(normalizedPath(filename))

const basename = (filename: string): string =>
  pipe(
    pathSegments(filename),
    Arr.last,
    Option.getOrElse(() => filename),
  )

const parentDirectory = (filename: string): Option.Option<string> =>
  pipe(pathSegments(filename), Arr.dropRight(1), Arr.last)

const isRoleFile = (filename: string, role: string): boolean =>
  basename(filename) === `${role}.ts` ||
  pipe(
    parentDirectory(filename),
    Option.match({
      onNone: () => false,
      onSome: dir => dir === role,
    }),
  )

const isMessageRoleFile = (filename: string): boolean =>
  isRoleFile(filename, 'message')

const isCommandRoleFile = (filename: string): boolean =>
  isRoleFile(filename, 'command')

const isSubscriptionRoleFile = (filename: string): boolean =>
  isRoleFile(filename, 'subscription')

const importSource = (node: ESTree.ImportDeclaration): string =>
  node.source.value

const isImportSpecifier = (
  specifier: ESTree.ImportDeclaration['specifiers'][number],
): specifier is ESTree.ImportSpecifier => specifier.type === 'ImportSpecifier'

const importedName = (
  specifier: ESTree.ImportSpecifier,
): Option.Option<string> => {
  const imported = specifier.imported
  if (imported.type === 'Identifier') return Option.some(imported.name)
  return imported.type === 'Literal' && P.isString(imported.value)
    ? Option.some(imported.value)
    : Option.none()
}

const mSchemaImportSpecifiers = (
  importNode: ESTree.ImportDeclaration,
): ReadonlyArray<ESTree.Node> =>
  importSource(importNode) === 'foldkit/schema'
    ? pipe(
        importNode.specifiers,
        Arr.filterMap(specifier =>
          isImportSpecifier(specifier)
            ? pipe(
                importedName(specifier),
                Option.filter(name => name === 'm'),
                Option.map(() => specifier),
                Result.fromOption(() => undefined),
              )
            : Result.failVoid,
        ),
      )
    : []

const subscriptionMethod = (
  call: ESTree.CallExpression,
): Option.Option<string> =>
  pipe(
    AST.matchCallOf(call, 'Subscription', [
      'make',
      'lift',
      'aggregate',
      'persistent',
    ]),
    Option.flatMap(matched =>
      matched.callee.type === 'MemberExpression' &&
      matched.callee.property.type === 'Identifier'
        ? Option.some(matched.callee.property.name)
        : Option.none(),
    ),
  )

const rule: CreateRule = Rule.define({
  name: 'foldkit-primitives-declared-in-role-files',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Keep Foldkit primitive declarations in their role files: message.ts, command.ts, and subscription.ts',
  }),
  create: function* () {
    const ctx = yield* RuleContext

    return Visitor.merge(
      Visitor.on('ImportDeclaration', node => {
        if (isMessageRoleFile(ctx.filename)) return Effect.void
        const foldkitMessage =
          importSource(node) === 'foldkit/message'
            ? [
                ctx.report(
                  Diagnostic.make({
                    node,
                    message:
                      'Foldkit Message primitives must be declared from a `message.ts` file or `message/` role folder. Move this `foldkit/message` import into the role file and re-export helpers from there. (FK role files)',
                  }),
                ),
              ]
            : []
        const schemaMImports = pipe(
          mSchemaImportSpecifiers(node),
          Arr.map(specifier =>
            ctx.report(
              Diagnostic.make({
                node: specifier,
                message:
                  'Foldkit Message constructors (`m`) must be declared from a `message.ts` file or `message/` role folder. Move this `m` import into the role file and export the Message API from there. (FK role files)',
              }),
            ),
          ),
        )
        return Effect.all([...foldkitMessage, ...schemaMImports], {
          concurrency: 1,
          discard: true,
        })
      }),
      Visitor.on('CallExpression', node => {
        if (
          !isCommandRoleFile(ctx.filename) &&
          AST.isCallOf(node, 'Command', 'define')
        ) {
          return ctx.report(
            Diagnostic.make({
              node,
              message:
                '`Command.define(...)` belongs in a `command.ts` file or `command/` role folder. Keep the Command catalog centralized and import the exported command instead. (FK role files)',
            }),
          )
        }
        return pipe(
          subscriptionMethod(node),
          Option.filter(() => !isSubscriptionRoleFile(ctx.filename)),
          Option.match({
            onNone: () => Effect.void,
            onSome: method =>
              ctx.report(
                Diagnostic.make({
                  node,
                  message: `\`Subscription.${method}(...)\` belongs in a \`subscription.ts\` file or \`subscription/\` role folder. Keep subscription declarations centralized and lift/aggregate them from the role file. (FK role files)`,
                }),
              ),
          }),
        )
      }),
    )
  },
})

export default rule
