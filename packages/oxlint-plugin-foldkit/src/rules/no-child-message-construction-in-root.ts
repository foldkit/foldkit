import { Array, Effect, Option, pipe } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
} from 'effect-oxlint'

import {
  type ImportedPath,
  indexReferences,
  isCallExpression,
  isIdentifier,
  isMemberExpression,
  resolveFoldkitApiPath,
  resolveImportedPath,
  staticMemberPath,
} from '../guards.ts'

const pascalIdentifierPattern = /^[A-Z][A-Za-z0-9]*$/

const childMessageConstructionMessage = (calleeLabel: string): string =>
  `Do not construct the child Message \`${calleeLabel}(...)\` from a parent. Expose a child update capability that applies this fact, then invoke it with Update.foldChild or Update.foldChildStep. Child-owned views, Commands, and Subscriptions may construct their own Messages.`

type ImportedMessagePath = Pick<ImportedPath, 'source' | 'members'>

type ChildMessageConstruction = Readonly<{
  calleeLabel: string
  messagePath?: ImportedMessagePath
}>

const moduleExtensionPattern = /\.(?:cjs|cts|js|jsx|mjs|mts|ts|tsx)$/

const moduleSegmentName = (segment: string): string =>
  segment.replace(moduleExtensionPattern, '')

const messageModuleSegmentNames: ReadonlySet<string> = new Set([
  'index',
  'main',
  'message',
  'schema',
])

const isMessageModuleSegment = (segment: string | undefined): boolean =>
  segment !== undefined &&
  messageModuleSegmentNames.has(moduleSegmentName(segment).toLowerCase())

const isFunction = (
  node: unknown,
): node is ESTree.ArrowFunctionExpression | ESTree.Function =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  (node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression')

const isTypeReference = (node: unknown): node is ESTree.TSTypeReference =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'TSTypeReference'

const isTypeAnnotatedIdentifier = (
  node: unknown,
): node is Readonly<{
  type: 'Identifier'
  typeAnnotation?: ESTree.TSTypeAnnotation | null
}> => isIdentifier(node)

const importedMessagePath = (
  references: WeakMap<ESTree.Node, Reference>,
  node: unknown,
): Option.Option<ImportedMessagePath> =>
  isTypeReference(node)
    ? Option.map(resolveImportedPath(references, node.typeName), path => ({
        source: path.source,
        members: path.members,
      }))
    : Option.none()

const pascalCaseModuleSegment = (segment: string): string =>
  moduleSegmentName(segment)
    .split(/[-_]/)
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('')

const messageModuleSegments = (
  path: ImportedMessagePath,
): ReadonlyArray<string> => {
  const sourceSegments = path.source
    .split('/')
    .filter(segment => segment !== '.')
  const [lastSourceSegment] = sourceSegments.slice(-1)
  const moduleSourceSegments = isMessageModuleSegment(lastSourceSegment)
    ? sourceSegments.slice(0, -1)
    : sourceSegments
  const namespaceMembers = path.members.slice(0, -1)
  const [firstNamespaceMember] = namespaceMembers
  const [moduleSourceName] = moduleSourceSegments.slice(-1)
  const remainingNamespaceMembers =
    firstNamespaceMember !== undefined &&
    moduleSourceName !== undefined &&
    pascalCaseModuleSegment(firstNamespaceMember) ===
      pascalCaseModuleSegment(moduleSourceName)
      ? namespaceMembers.slice(1)
      : namespaceMembers

  return [...moduleSourceSegments, ...remainingNamespaceMembers].map(
    pascalCaseModuleSegment,
  )
}

const sameSegments = (
  a: ReadonlyArray<string>,
  b: ReadonlyArray<string>,
): boolean =>
  Array.length(a) === Array.length(b) &&
  Array.every(Array.zip(a, b), ([aSegment, bSegment]) => aSegment === bSegment)

const sameImportedMessagePath = (
  a: ImportedMessagePath,
  b: ImportedMessagePath,
): boolean => {
  if (a.source === b.source && sameSegments(a.members, b.members)) {
    return true
  }

  const aSegments = messageModuleSegments(a)
  const bSegments = messageModuleSegments(b)

  return sameSegments(aSegments, bSegments)
}

const htmlBuilderMessagePath = (
  references: WeakMap<ESTree.Node, Reference>,
  parameter: unknown,
): Option.Option<ImportedMessagePath> => {
  if (!isTypeAnnotatedIdentifier(parameter)) {
    return Option.none()
  }

  const typeAnnotation = parameter.typeAnnotation?.typeAnnotation
  if (!isTypeReference(typeAnnotation)) {
    return Option.none()
  }

  const isHtmlBuilder = Option.exists(
    resolveFoldkitApiPath(references, typeAnnotation.typeName),
    path => {
      const [namespace, typeName, extraMember] = path
      return (
        namespace === 'Html' &&
        typeName === 'HtmlBuilder' &&
        extraMember === undefined
      )
    },
  )
  if (!isHtmlBuilder) {
    return Option.none()
  }

  return Option.gen(function* () {
    const typeArguments = yield* Option.fromNullishOr(
      typeAnnotation.typeArguments,
    )
    const messageType = yield* Option.fromNullishOr(typeArguments.params[0])
    return yield* importedMessagePath(references, messageType)
  })
}

const defineViewMessagePath = (
  references: WeakMap<ESTree.Node, Reference>,
  functionNode: ESTree.ArrowFunctionExpression | ESTree.Function,
): Option.Option<ImportedMessagePath> => {
  const parent = functionNode.parent
  if (!isCallExpression(parent) || !parent.arguments.includes(functionNode)) {
    return Option.none()
  }

  const isDefineView = Option.exists(
    resolveFoldkitApiPath(references, parent.callee),
    path => {
      const [namespace, helperName, extraMember] = path
      return (
        namespace === 'Submodel' &&
        helperName === 'defineView' &&
        extraMember === undefined
      )
    },
  )
  if (!isDefineView) {
    return Option.none()
  }

  return Option.gen(function* () {
    const typeArguments = yield* Option.fromNullishOr(parent.typeArguments)
    const messageType = yield* Option.fromNullishOr(typeArguments.params[1])
    return yield* importedMessagePath(references, messageType)
  })
}

const isOwnedByEnclosingView = (
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference>,
  messagePath: ImportedMessagePath,
): boolean => {
  const ownsMessage = (ancestor: ESTree.Node | null | undefined): boolean => {
    if (ancestor === null || ancestor === undefined) {
      return false
    }

    if (isFunction(ancestor)) {
      const ownsAnnotatedBuilder = ancestor.params.some(parameter =>
        Option.exists(
          htmlBuilderMessagePath(references, parameter),
          builderMessagePath =>
            sameImportedMessagePath(builderMessagePath, messagePath),
        ),
      )
      if (ownsAnnotatedBuilder) {
        return true
      }

      const ownsDefinedView = Option.exists(
        defineViewMessagePath(references, ancestor),
        viewMessagePath =>
          sameImportedMessagePath(viewMessagePath, messagePath),
      )
      if (ownsDefinedView) {
        return true
      }
    }

    return ownsMessage(ancestor.parent)
  }

  return ownsMessage(node.parent)
}

const hasComputedMember = (node: unknown): boolean =>
  isMemberExpression(node) && (node.computed || hasComputedMember(node.object))

const relativeModuleSegments = (source: string): ReadonlyArray<string> =>
  source.split('/').filter(segment => segment !== '.' && segment !== '..')

const isTopLevelRootAlias = (source: string): boolean => {
  if (!source.startsWith('@/') && !source.startsWith('~/')) {
    return false
  }

  return !source.slice(2).includes('/')
}

const isRootMessageModule = (source: string): boolean => {
  const sourceSegments = relativeModuleSegments(source)
  const [lastSourceSegment] = sourceSegments.slice(-1)
  const [parentSourceSegment] = sourceSegments.slice(-2, -1)

  if (lastSourceSegment === undefined) {
    return true
  }

  if (!isMessageModuleSegment(lastSourceSegment)) {
    return false
  }

  return source.startsWith('.')
    ? parentSourceSegment === undefined
    : isTopLevelRootAlias(source)
}

const childNamespace = (
  source: string,
  importedMembers: ReadonlyArray<string>,
  localMembers: ReadonlyArray<string>,
): string => {
  const namespaceMembers = importedMembers.slice(0, -2)
  const [importedNamespace] = namespaceMembers.slice(-1)
  if (importedNamespace !== undefined) {
    return importedNamespace
  }

  const sourceSegments = relativeModuleSegments(source)
  const [lastSourceSegment] = sourceSegments.slice(-1)
  const [parentSourceSegment] = sourceSegments.slice(-2, -1)
  const sourceNamespace = isMessageModuleSegment(lastSourceSegment)
    ? parentSourceSegment
    : lastSourceSegment
  if (sourceNamespace !== undefined) {
    return pascalCaseModuleSegment(sourceNamespace)
  }

  const [localRoot] = localMembers
  return localRoot ?? 'Child'
}

const childMessageConstruction = (
  callee: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ChildMessageConstruction> => {
  if (hasComputedMember(callee)) {
    return Option.none()
  }

  if (references === undefined) {
    return Option.flatMap(staticMemberPath(callee), path => {
      const [namespace, middle, constructorName, extraSegment] = [
        path.root.name,
        ...path.members,
      ]
      return namespace !== undefined &&
        middle === 'Message' &&
        constructorName !== undefined &&
        constructorName !== 'Message' &&
        extraSegment === undefined &&
        pascalIdentifierPattern.test(namespace) &&
        pascalIdentifierPattern.test(constructorName)
        ? Option.some({
            calleeLabel: `${namespace}.Message.${constructorName}`,
          })
        : Option.none()
    })
  }

  return Option.flatMap(resolveImportedPath(references, callee), path => {
    const [messageNamespace, constructorName] = path.members.slice(-2)
    if (
      messageNamespace !== 'Message' ||
      constructorName === undefined ||
      constructorName === 'Message' ||
      !pascalIdentifierPattern.test(constructorName) ||
      isRootMessageModule(path.source)
    ) {
      return Option.none()
    }

    return Option.some({
      calleeLabel: `${childNamespace(path.source, path.members, path.localMembers)}.Message.${constructorName}`,
      messagePath: {
        source: path.source,
        members: path.members.slice(0, -1),
      },
    })
  })
}

/**
 * Flags direct construction of a child Submodel Message variant from outside
 * the child, such as Chat.Message.ClickedOpen(...).
 */
export const noChildMessageConstructionInRoot = Rule.define({
  name: 'no-child-message-construction-in-root',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Drive child Submodels through child-owned update capabilities instead of constructing their Messages from a parent.',
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
        return pipe(
          childMessageConstruction(node.callee, references),
          Option.match({
            onNone: () => Effect.void,
            onSome: ({ calleeLabel, messagePath }) => {
              if (
                references !== undefined &&
                messagePath !== undefined &&
                isOwnedByEnclosingView(node, references, messagePath)
              ) {
                return Effect.void
              }

              return ctx.report(
                Diagnostic.make({
                  node,
                  message: childMessageConstructionMessage(calleeLabel),
                }),
              )
            },
          }),
        )
      },
    }
  },
})
