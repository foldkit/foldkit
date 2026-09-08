import { Array, Option } from 'effect'
import {
  type ESTree,
  type OxlintScope,
  type Reference,
  type Variable,
} from 'effect-oxlint'

export const isIdentifier = (
  node: unknown,
  name?: string,
): node is Readonly<{ type: 'Identifier'; name: string }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Identifier' &&
  'name' in node &&
  typeof node.name === 'string' &&
  (name === undefined || node.name === name)

export const isIdentifierReference = (
  node: unknown,
): node is ESTree.IdentifierReference => isIdentifier(node)

export const isStringLiteral = (node: unknown): node is ESTree.StringLiteral =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Literal' &&
  'value' in node &&
  typeof node.value === 'string'

export const isTemplateLiteral = (
  node: unknown,
): node is ESTree.TemplateLiteral =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'TemplateLiteral'

export const isCallExpression = (
  node: unknown,
): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression'

export const isMemberExpression = (
  node: unknown,
): node is ESTree.MemberExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'MemberExpression'

export const isObjectExpression = (
  node: unknown,
): node is ESTree.ObjectExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ObjectExpression'

export const isObjectProperty = (
  node: unknown,
): node is ESTree.ObjectProperty =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Property'

export const isArrayExpression = (
  node: unknown,
): node is Readonly<{
  type: 'ArrayExpression'
  elements: ReadonlyArray<unknown>
}> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ArrayExpression'

export const isSpreadElement = (node: unknown): boolean =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'SpreadElement'

export const helperCalleeName = (callee: unknown): Option.Option<string> => {
  if (isIdentifier(callee)) {
    return Option.some(callee.name)
  }
  if (
    isMemberExpression(callee) &&
    !callee.computed &&
    isIdentifier(callee.property)
  ) {
    return Option.some(callee.property.name)
  }
  return Option.none()
}

type TransparentExpression =
  | ESTree.ChainExpression
  | ESTree.ParenthesizedExpression
  | ESTree.TSAsExpression
  | ESTree.TSInstantiationExpression
  | ESTree.TSNonNullExpression
  | ESTree.TSSatisfiesExpression
  | ESTree.TSTypeAssertion

const isTransparentExpression = (
  node: unknown,
): node is TransparentExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  (node.type === 'ChainExpression' ||
    node.type === 'ParenthesizedExpression' ||
    node.type === 'TSAsExpression' ||
    node.type === 'TSInstantiationExpression' ||
    node.type === 'TSNonNullExpression' ||
    node.type === 'TSSatisfiesExpression' ||
    node.type === 'TSTypeAssertion')

const innermostExpression = (node: unknown): unknown =>
  isTransparentExpression(node) ? innermostExpression(node.expression) : node

const isTSQualifiedName = (node: unknown): node is ESTree.TSQualifiedName =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'TSQualifiedName'

export type StaticMemberPath = Readonly<{
  root: ESTree.IdentifierReference
  members: ReadonlyArray<string>
}>

export const staticMemberPath = (
  node: unknown,
): Option.Option<StaticMemberPath> => {
  const expression = innermostExpression(node)
  if (isIdentifierReference(expression)) {
    return Option.some({ root: expression, members: [] })
  }
  if (isTSQualifiedName(expression)) {
    return Option.map(staticMemberPath(expression.left), path => ({
      root: path.root,
      members: [...path.members, expression.right.name],
    }))
  }
  if (!isMemberExpression(expression)) {
    return Option.none()
  }

  return Option.flatMap(staticMemberPath(expression.object), path =>
    Option.map(staticMemberName(expression), member => ({
      root: path.root,
      members: [...path.members, member],
    })),
  )
}

export const calleeMatchesHelperName = (
  callee: unknown,
  helperName: string,
): boolean =>
  Option.exists(helperCalleeName(callee), name => name === helperName)

export const staticStringValue = (node: unknown): Option.Option<string> => {
  if (isStringLiteral(node)) {
    return Option.some(node.value)
  }
  if (isTemplateLiteral(node) && Array.isArrayEmpty(node.expressions)) {
    return Option.flatMap(Array.head(node.quasis), quasi =>
      Option.fromNullishOr(quasi.value.cooked),
    )
  }
  return Option.none()
}

export const staticMemberName = (
  node: ESTree.MemberExpression,
): Option.Option<string> => {
  if (!node.computed && isIdentifier(node.property)) {
    return Option.some(node.property.name)
  }
  return staticStringValue(node.property)
}

export const staticPropertyName = (
  property: Readonly<{
    computed?: boolean
    key: ESTree.PropertyKey
  }>,
): Option.Option<string> => {
  if (!property.computed && isIdentifier(property.key)) {
    return Option.some(property.key.name)
  }
  return staticStringValue(property.key)
}

export const indexReferences = (
  scopes: ReadonlyArray<OxlintScope>,
): WeakMap<ESTree.Node, Reference> => {
  const references = new WeakMap<ESTree.Node, Reference>()

  for (const scope of scopes) {
    for (const reference of scope.references) {
      references.set(reference.identifier, reference)
    }
  }
  return references
}

export const resolvedVariable = (
  references: WeakMap<ESTree.Node, Reference>,
  node: ESTree.IdentifierReference,
): Option.Option<Variable> =>
  Option.flatMap(Option.fromNullishOr(references.get(node)), reference =>
    Option.fromNullishOr(reference.resolved),
  )

export type ImportedPath = Readonly<{
  source: string
  members: ReadonlyArray<string>
  localMembers: ReadonlyArray<string>
}>

const importedName = (specifier: ESTree.ImportSpecifier): string =>
  specifier.imported.type === 'Identifier'
    ? specifier.imported.name
    : specifier.imported.value

export const resolveImportedPath = (
  references: WeakMap<ESTree.Node, Reference>,
  node: unknown,
): Option.Option<ImportedPath> =>
  Option.gen(function* () {
    const path = yield* staticMemberPath(node)
    const variable = yield* resolvedVariable(references, path.root)
    const definition = yield* Array.findFirst(
      variable.defs,
      definition => definition.type === 'ImportBinding',
    )

    if (definition.parent?.type !== 'ImportDeclaration') {
      return yield* Option.none()
    }

    const localMembers = [path.root.name, ...path.members]
    if (definition.node.type === 'ImportNamespaceSpecifier') {
      return {
        source: definition.parent.source.value,
        members: path.members,
        localMembers,
      }
    }
    if (definition.node.type !== 'ImportSpecifier') {
      return yield* Option.none()
    }

    return {
      source: definition.parent.source.value,
      members: [importedName(definition.node), ...path.members],
      localMembers,
    }
  })

const foldkitNamespaceBySource: Readonly<Record<string, string>> = {
  'foldkit/command': 'Command',
  'foldkit/html': 'Html',
  'foldkit/managedResource': 'ManagedResource',
  'foldkit/message': 'Message',
  'foldkit/mount': 'Mount',
  'foldkit/navigation': 'Navigation',
  'foldkit/route': 'Route',
  'foldkit/runtime': 'Runtime',
  'foldkit/schema': 'Schema',
  'foldkit/struct': 'Struct',
  'foldkit/submodel': 'Submodel',
  'foldkit/subscription': 'Subscription',
}

export const resolveFoldkitApiPath = (
  references: WeakMap<ESTree.Node, Reference>,
  node: unknown,
): Option.Option<ReadonlyArray<string>> =>
  Option.flatMap(resolveImportedPath(references, node), path => {
    if (path.source === 'foldkit') {
      return Option.some(path.members)
    }

    const namespace = foldkitNamespaceBySource[path.source]
    return namespace === undefined
      ? Option.none()
      : Option.some([namespace, ...path.members])
  })

const isTypeAnnotatedIdentifier = (
  node: unknown,
): node is Readonly<{
  type: 'Identifier'
  typeAnnotation?: ESTree.TSTypeAnnotation | null
}> => isIdentifier(node)

const isFunctionWithParameters = (
  node: unknown,
): node is ESTree.ArrowFunctionExpression | ESTree.Function =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  (node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression')

const isFoldkitDefineViewCallback = (
  references: WeakMap<ESTree.Node, Reference>,
  functionNode: ESTree.ArrowFunctionExpression | ESTree.Function,
): boolean => {
  const parent = functionNode.parent
  if (!isCallExpression(parent) || !parent.arguments.includes(functionNode)) {
    return false
  }

  return Option.exists(
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
}

const hasHtmlBuilderTypeAnnotation = (
  references: WeakMap<ESTree.Node, Reference>,
  identifier: Readonly<{
    type: 'Identifier'
    typeAnnotation?: ESTree.TSTypeAnnotation | null
  }>,
): boolean => {
  const typeAnnotation = identifier.typeAnnotation?.typeAnnotation
  if (typeAnnotation?.type !== 'TSTypeReference') {
    return false
  }

  return Option.exists(
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
}

const isHtmlBuilderParameter = (
  references: WeakMap<ESTree.Node, Reference>,
  root: ESTree.IdentifierReference,
): boolean =>
  Option.exists(resolvedVariable(references, root), variable =>
    variable.defs.some(definition => {
      if (
        definition.type !== 'Parameter' ||
        !isTypeAnnotatedIdentifier(definition.name)
      ) {
        return false
      }

      if (hasHtmlBuilderTypeAnnotation(references, definition.name)) {
        return true
      }

      if (!isFunctionWithParameters(definition.node)) {
        return false
      }

      return (
        Option.exists(
          Array.last(definition.node.params),
          parameter => parameter === definition.name,
        ) && isFoldkitDefineViewCallback(references, definition.node)
      )
    }),
  )

export const isFoldkitHtmlBuilderMember = (
  callee: unknown,
  memberName: string,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (references === undefined) {
    return calleeMatchesHelperName(callee, memberName)
  }

  const isFoldkitInertHtmlMember = Option.exists(
    resolveFoldkitApiPath(references, callee),
    path => {
      const [namespace, builderName, importedMember, extraImportedMember] = path
      return (
        namespace === 'Html' &&
        builderName === 'inertHtml' &&
        importedMember === memberName &&
        extraImportedMember === undefined
      )
    },
  )
  if (isFoldkitInertHtmlMember) {
    return true
  }

  return Option.exists(staticMemberPath(callee), path => {
    const [member, extraMember] = path.members

    return (
      member === memberName &&
      extraMember === undefined &&
      isHtmlBuilderParameter(references, path.root)
    )
  })
}

export const isUnshadowedReference = (
  references: WeakMap<ESTree.Node, Reference> | undefined,
  node: ESTree.Node,
): boolean => {
  if (references === undefined) {
    return true
  }

  const reference = references.get(node)
  return (
    reference !== undefined &&
    (reference.resolved === null || Array.isArrayEmpty(reference.resolved.defs))
  )
}

export const isVariableDeclarator = (
  node: unknown,
): node is ESTree.VariableDeclarator =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'VariableDeclarator'

export const isVariableDeclaration = (
  node: unknown,
): node is ESTree.VariableDeclaration =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'VariableDeclaration'

export const isProgram = (node: unknown): node is ESTree.Program =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Program'

export const firstStringArgument = (
  node: ESTree.CallExpression,
): ESTree.StringLiteral | undefined => {
  const [first] = node.arguments
  return isStringLiteral(first) ? first : undefined
}
