import { Array, Effect, Option } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type FixFn,
  type OxlintScope,
  type Reference,
  Rule,
  RuleContext,
  type Variable,
} from 'effect-oxlint'

import { isIdentifier, isStringLiteral } from '../guards.ts'

const EFFECT_MODULE_NAME = /^[A-Z]/

const isSemanticConflictAlias = (name: string, localName: string): boolean =>
  localName === `Effect${name}`

type AliasedEffectModule = Readonly<{
  specifier: ESTree.ImportSpecifier
  name: string
}>

const importedName = (
  specifier: ESTree.ImportSpecifier,
): Option.Option<string> => {
  if (isIdentifier(specifier.imported)) {
    return Option.some(specifier.imported.name)
  }
  if (isStringLiteral(specifier.imported)) {
    return Option.some(specifier.imported.value)
  }
  return Option.none()
}

const importVariable = (
  ctx: RuleContext['Service'],
  specifier: ESTree.ImportSpecifier,
): Variable | undefined => {
  const scopeManager = ctx.sourceCode.scopeManager

  if (scopeManager === undefined) {
    return undefined
  }

  return Array.findFirst(
    scopeManager.getDeclaredVariables(specifier),
    variable => variable.name === specifier.local.name,
  ).pipe(Option.getOrUndefined)
}

const hasUnshadowedReference = (
  ctx: RuleContext['Service'],
  name: string,
): boolean =>
  Array.some(ctx.sourceCode.scopeManager?.scopes ?? [], scope =>
    Array.some(
      scope.references,
      reference =>
        reference.identifier.name === name &&
        (reference.resolved === null ||
          Array.isArrayEmpty(reference.resolved.defs)),
    ),
  )

const preservesObservableName = (node: ESTree.Node): boolean => {
  const parent = node.parent

  if (parent === null) {
    return true
  }
  if (parent.type === 'Property' && parent.shorthand) {
    return false
  }
  return parent.type !== 'ExportSpecifier'
}

const hasInterveningBinding = (
  scope: OxlintScope,
  importScope: OxlintScope,
  name: string,
): boolean => {
  if (scope === importScope) {
    return false
  }
  if (scope.set.get(name) !== undefined || scope.upper === null) {
    return true
  }
  return hasInterveningBinding(scope.upper, importScope, name)
}

const referenceCanBeRenamed = (
  reference: Reference,
  importScope: OxlintScope,
  name: string,
): boolean =>
  preservesObservableName(reference.identifier) &&
  !hasInterveningBinding(reference.from, importScope, name)

const aliasedEffectModule = (
  specifier: ESTree.ImportDeclaration['specifiers'][number],
): Option.Option<AliasedEffectModule> => {
  if (specifier.type !== 'ImportSpecifier' || specifier.importKind === 'type') {
    return Option.none()
  }

  return Option.flatMap(importedName(specifier), name =>
    EFFECT_MODULE_NAME.test(name) &&
    specifier.local.name !== name &&
    !isSemanticConflictAlias(name, specifier.local.name)
      ? Option.some({ specifier, name })
      : Option.none(),
  )
}

const importsEffectModuleAsAlias = (
  variable: Variable,
  name: string,
): boolean =>
  Array.some(variable.defs, definition => {
    if (
      definition.type !== 'ImportBinding' ||
      definition.node.type !== 'ImportSpecifier'
    ) {
      return false
    }

    const declaration = definition.node.parent

    if (
      declaration.type !== 'ImportDeclaration' ||
      declaration.source.value !== 'effect' ||
      declaration.importKind === 'type'
    ) {
      return false
    }

    return Option.match(aliasedEffectModule(definition.node), {
      onNone: () => false,
      onSome: alias => alias.name === name,
    })
  })

const hasCompetingRenameTarget = (variable: Variable, name: string): boolean =>
  Array.some(
    variable.scope.variables,
    candidate =>
      candidate !== variable && importsEffectModuleAsAlias(candidate, name),
  )

const canRenameBinding = (
  ctx: RuleContext['Service'],
  variable: Variable,
  name: string,
): boolean =>
  variable.scope.set.get(name) === undefined &&
  !hasUnshadowedReference(ctx, name) &&
  !hasCompetingRenameTarget(variable, name) &&
  Array.every(variable.references, reference =>
    referenceCanBeRenamed(reference, variable.scope, name),
  )

const fixesForAlias = (
  ctx: RuleContext['Service'],
  { specifier, name }: AliasedEffectModule,
): ReadonlyArray<FixFn> => {
  const variable = importVariable(ctx, specifier)

  if (
    variable === undefined ||
    Array.isArrayNonEmpty(ctx.sourceCode.getCommentsInside(specifier)) ||
    !canRenameBinding(ctx, variable, name)
  ) {
    return []
  }

  return [
    Diagnostic.replaceText(specifier, name),
    ...Array.map(variable.references, reference =>
      Diagnostic.replaceText(reference.identifier, name),
    ),
  ]
}

/** Requires PascalCase Effect modules to keep their exported names. */
export const preferEffectModuleNames = Rule.define({
  name: 'prefer-effect-module-names',
  meta: Rule.meta({
    type: 'suggestion',
    description: 'Use Effect module names without import aliases.',
    fixable: 'code',
  }),
  create: function* () {
    const ctx = yield* RuleContext

    return {
      ImportDeclaration: (node: ESTree.Node) => {
        if (
          node.type !== 'ImportDeclaration' ||
          node.source.value !== 'effect' ||
          node.importKind === 'type'
        ) {
          return Effect.void
        }

        const aliases = Array.flatMap(node.specifiers, specifier =>
          Option.match(aliasedEffectModule(specifier), {
            onNone: () => [],
            onSome: alias => [alias],
          }),
        )

        if (Array.isReadonlyArrayEmpty(aliases)) {
          return Effect.void
        }

        const replacements = Array.map(
          aliases,
          ({ specifier, name }) =>
            `\`${name}\` instead of \`${specifier.local.name}\``,
        )
        const diagnostic = Diagnostic.make({
          node,
          message: `Use Effect module names without aliases: ${replacements.join(', ')}. Qualify same-named globals through \`globalThis\`.`,
        })
        const fixes = Array.flatMap(aliases, alias => fixesForAlias(ctx, alias))

        return ctx.report(
          Array.isReadonlyArrayEmpty(fixes)
            ? diagnostic
            : Diagnostic.withFix(diagnostic, Diagnostic.composeFixes(...fixes)),
        )
      },
    }
  },
})
