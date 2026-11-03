import { Array, Option } from 'effect'
import type { ESTree, Reference, Variable } from 'effect-oxlint'

import {
  type DefinitionMethodOwner,
  isCallExpression,
  isIdentifier,
  isIdentifierReference,
  isMemberExpression,
  isVariableDeclaration,
  isVariableDeclarator,
  ownedDefinitionMethodOwner,
  resolvedVariable,
  staticMemberName,
  staticPropertyName,
} from './guards.ts'

type UpdateMethod = 'makeUpdate' | 'makeInMessageUpdate'

type ResolvedUpdateAuthoring = Readonly<{
  isCompleteBuilder: boolean
  kind: 'Record' | 'ContextRecord' | 'Shared' | 'Selector'
  method: UpdateMethod
  owner: DefinitionMethodOwner
}>

/** The authenticated handler shape and owner of one update authoring call. */
export type UpdateAuthoring = Pick<
  ResolvedUpdateAuthoring,
  'method' | 'owner'
> &
  Readonly<{ kind: 'Record' | 'ContextRecord' | 'Shared' }>

const selectMember = (
  authored: ResolvedUpdateAuthoring,
  member: string,
): Option.Option<ResolvedUpdateAuthoring> => {
  if (member === 'withContext' && authored.kind === 'Record') {
    return Option.some({
      ...authored,
      isCompleteBuilder: false,
      kind: 'ContextRecord',
    })
  }
  if (!authored.isCompleteBuilder) {
    return Option.none()
  }
  if (member === 'cases') {
    return Option.some({ ...authored, isCompleteBuilder: false })
  }
  if (member === 'each') {
    return Option.some({
      ...authored,
      isCompleteBuilder: false,
      kind: 'Shared',
    })
  }
  if (member === 'on' || member === 'except') {
    return Option.some({
      ...authored,
      isCompleteBuilder: false,
      kind: 'Selector',
    })
  }
  return Option.none()
}

const resolveUpdateAuthoring = (
  callee: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
  filename: string | undefined,
  visited: ReadonlySet<Variable>,
): Option.Option<ResolvedUpdateAuthoring> => {
  for (const method of [
    'makeUpdate',
    'makeInMessageUpdate',
  ] satisfies ReadonlyArray<UpdateMethod>) {
    const owner = ownedDefinitionMethodOwner(
      callee,
      method,
      references,
      filename,
    )
    if (Option.isSome(owner)) {
      return Option.some({
        isCompleteBuilder: true,
        kind: 'Record',
        method,
        owner: owner.value,
      })
    }
  }

  if (isMemberExpression(callee)) {
    return Option.gen(function* () {
      const member = yield* staticMemberName(callee)
      const authored = yield* resolveUpdateAuthoring(
        callee.object,
        references,
        filename,
        visited,
      )
      return yield* selectMember(authored, member)
    })
  }
  if (isCallExpression(callee)) {
    return Option.flatMap(
      resolveUpdateAuthoring(callee.callee, references, filename, visited),
      authored =>
        authored.kind === 'Selector'
          ? Option.some({ ...authored, kind: 'Shared' })
          : Option.none(),
    )
  }
  if (references === undefined || !isIdentifierReference(callee)) {
    return Option.none()
  }

  return Option.gen(function* () {
    const variable = yield* resolvedVariable(references, callee)
    if (visited.has(variable) || Array.length(variable.defs) !== 1) {
      return yield* Option.none()
    }
    const [definition] = variable.defs
    if (
      definition?.type !== 'Variable' ||
      !isVariableDeclarator(definition.node) ||
      !isVariableDeclaration(definition.node.parent) ||
      definition.node.parent.kind !== 'const'
    ) {
      return yield* Option.none()
    }
    const initializer = yield* Option.fromNullishOr(definition.node.init)
    const authored = yield* resolveUpdateAuthoring(
      initializer,
      references,
      filename,
      new Set([...visited, variable]),
    )
    if (isIdentifier(definition.node.id)) {
      return authored
    }
    if (definition.node.id.type !== 'ObjectPattern') {
      return yield* Option.none()
    }
    const property = yield* Array.findFirst(
      definition.node.id.properties,
      property =>
        property.type === 'Property' &&
        isIdentifier(property.value, callee.name),
    )
    if (property.type !== 'Property') {
      return yield* Option.none()
    }
    const member = yield* staticPropertyName(property)
    return yield* selectMember(authored, member)
  })
}

/** Resolves complete, focused, contextual and curried update builders through their original owner. */
export const ownedUpdateAuthoringCallee = (
  callee: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
  filename?: string,
): Option.Option<UpdateAuthoring> =>
  Option.flatMap(
    resolveUpdateAuthoring(callee, references, filename, new Set()),
    authored =>
      authored.kind === 'Selector'
        ? Option.none()
        : Option.some({ ...authored, kind: authored.kind }),
  )
