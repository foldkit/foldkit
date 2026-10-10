import { Array, Effect, Option, pipe } from 'effect'
import {
  AST,
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
} from 'effect-oxlint'

import { effectConstructorValue } from '../effect-constructor.ts'
import {
  indexReferences,
  isCallExpression,
  isIdentifier,
  isIdentifierReference,
  isMemberExpression,
  isVariableDeclarator,
  resolveFoldkitApiPath,
  resolvedVariable,
  staticMemberName,
} from '../guards.ts'

const MOUNT_DEFINITION_METHODS = ['define', 'defineStream']

const isMountDefinitionCall = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (references === undefined) {
    return AST.isCallOf(node, 'Mount', MOUNT_DEFINITION_METHODS)
  }

  return Option.exists(resolveFoldkitApiPath(references, node.callee), path => {
    const [namespace, methodName, extraMember] = path

    return (
      namespace === 'Mount' &&
      methodName !== undefined &&
      MOUNT_DEFINITION_METHODS.includes(methodName) &&
      extraMember === undefined
    )
  })
}

const ELEMENT_FIELD = 'element'

const NO_ELEMENT_BINDING_MESSAGE = `This Mount handler never receives the element: it does not destructure \`element\` from its input. A Mount exists for element-caused, element-targeted work. If the element is irrelevant, use a Command, Subscription, or ManagedResource instead.`

const ignoredElementBindingMessage = (bindingName: string): string =>
  `The element binding \`${bindingName}\` is named as ignored. A Mount handler must read or write its live element; if the element does not matter here, the side effect has a different cause and belongs in a Command, Subscription, or ManagedResource.`

const unusedElementBindingMessage = (bindingName: string): string =>
  `The element binding \`${bindingName}\` is never referenced in this Mount handler. A Mount handler must use its live element; work that does not need the element belongs in a Command, Subscription, or ManagedResource.`

const unreadElementFieldMessage = (bindingName: string): string =>
  `This Mount handler reads other fields off \`${bindingName}\` but never its \`element\`. Destructure \`element\` from the input so the check can see the read, or if the element is irrelevant, use a Command, Subscription, or ManagedResource instead.`

const unusedInputMessage = (bindingName: string): string =>
  `This Mount handler never references \`${bindingName}\`, so it never reaches the live element. Destructure \`element\` from the input so the check can see the read, or if the element is irrelevant, use a Command, Subscription, or ManagedResource instead.`

type MountHandler = ESTree.ArrowFunctionExpression | ESTree.Function

const isMountHandler = (node: unknown): node is MountHandler =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  (node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression' ||
    node.type === 'FunctionDeclaration')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const shadowsBindingName = (
  functionNode: Record<string, unknown>,
  bindingName: string,
): boolean => {
  const parameters = functionNode.params
  if (!isRecord(parameters)) return false
  return Object.values(parameters).some(
    parameter =>
      isRecord(parameter) &&
      parameter.type === 'Identifier' &&
      parameter.name === bindingName,
  )
}

const referencesHandlerParameter = (
  value: Record<string, unknown>,
  handler: MountHandler,
  bindingName: string,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (value.type !== 'Identifier' || value.name !== bindingName) {
    return false
  }

  if (references === undefined) {
    return true
  }

  return (
    isIdentifierReference(value) &&
    Option.exists(resolvedVariable(references, value), variable =>
      variable.defs.some(
        definition =>
          definition.type === 'Parameter' && definition.node === handler,
      ),
    )
  )
}

const referencesName = (
  value: unknown,
  handler: MountHandler,
  bindingName: string,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (!isRecord(value)) return false
  if (referencesHandlerParameter(value, handler, bindingName, references)) {
    return true
  }
  if (
    references === undefined &&
    (value.type === 'ArrowFunctionExpression' ||
      value.type === 'FunctionExpression' ||
      value.type === 'FunctionDeclaration') &&
    shadowsBindingName(value, bindingName)
  ) {
    return false
  }
  if (value.type === 'MemberExpression' && value.computed !== true) {
    return referencesName(value.object, handler, bindingName, references)
  }
  if (value.type === 'Property') {
    const computedKeyReferences =
      value.computed === true &&
      referencesName(value.key, handler, bindingName, references)
    return (
      computedKeyReferences ||
      referencesName(value.value, handler, bindingName, references)
    )
  }
  return Object.entries(value).some(
    ([key, child]) =>
      key !== 'parent' &&
      referencesName(child, handler, bindingName, references),
  )
}

type InputUse = 'Element' | 'OtherField' | 'MaybeElement'

const inputUses = (
  value: unknown,
  handler: MountHandler,
  inputName: string,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ReadonlyArray<InputUse> => {
  if (!isRecord(value)) return []

  if (
    value.type === 'MemberExpression' &&
    isRecord(value.object) &&
    referencesHandlerParameter(value.object, handler, inputName, references)
  ) {
    if (value.computed === true) return ['MaybeElement']

    return isRecord(value.property) &&
      value.property.type === 'Identifier' &&
      value.property.name === ELEMENT_FIELD
      ? ['Element']
      : ['OtherField']
  }

  if (value.type === 'MemberExpression' && value.computed !== true) {
    return inputUses(value.object, handler, inputName, references)
  }

  if (
    references === undefined &&
    (value.type === 'ArrowFunctionExpression' ||
      value.type === 'FunctionExpression' ||
      value.type === 'FunctionDeclaration') &&
    shadowsBindingName(value, inputName)
  ) {
    return []
  }

  if (value.type === 'Property') {
    const keyUses =
      value.computed === true
        ? inputUses(value.key, handler, inputName, references)
        : []

    return [
      ...keyUses,
      ...inputUses(value.value, handler, inputName, references),
    ]
  }

  if (referencesHandlerParameter(value, handler, inputName, references)) {
    return ['MaybeElement']
  }

  return Object.entries(value).flatMap(([key, child]) =>
    key === 'parent' ? [] : inputUses(child, handler, inputName, references),
  )
}

const elementProperty = (
  pattern: ESTree.ObjectPattern,
): Option.Option<ESTree.BindingProperty> =>
  pipe(
    pattern.properties,
    Array.findFirst(
      (property): property is ESTree.BindingProperty =>
        property.type === 'Property' &&
        (property.key.type === 'Literal'
          ? property.key.value === ELEMENT_FIELD
          : !property.computed &&
            property.key.type === 'Identifier' &&
            property.key.name === ELEMENT_FIELD),
    ),
  )

const restBindingName = (
  pattern: ESTree.ObjectPattern,
): Option.Option<string> =>
  pipe(
    pattern.properties,
    Array.findFirst(property =>
      property.type === 'RestElement' && property.argument.type === 'Identifier'
        ? Option.some(property.argument.name)
        : Option.none<string>(),
    ),
  )

const withoutDefault = (value: ESTree.Node): ESTree.Node =>
  value.type === 'AssignmentPattern' ? value.left : value

const bindingDiagnostic = (
  handler: MountHandler,
  bindingName: string,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<string> => {
  if (bindingName.startsWith('_')) {
    return Option.some(ignoredElementBindingMessage(bindingName))
  }
  return referencesName(handler.body, handler, bindingName, references)
    ? Option.none()
    : Option.some(unusedElementBindingMessage(bindingName))
}

const unpackedDiagnostic = (
  handler: MountHandler,
  bindingName: string,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<string> => {
  const uses = inputUses(handler.body, handler, bindingName, references)

  if (Array.isReadonlyArrayEmpty(uses)) {
    return Option.some(unusedInputMessage(bindingName))
  }

  return uses.every(use => use === 'OtherField')
    ? Option.some(unreadElementFieldMessage(bindingName))
    : Option.none()
}

const handlerDiagnostic = (
  handler: MountHandler,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<string> => {
  const [firstParameter] = handler.params

  if (firstParameter === undefined) {
    return Option.some(NO_ELEMENT_BINDING_MESSAGE)
  }

  if (firstParameter.type === 'Identifier') {
    return unpackedDiagnostic(handler, firstParameter.name, references)
  }

  if (firstParameter.type !== 'ObjectPattern') {
    return Option.some(NO_ELEMENT_BINDING_MESSAGE)
  }

  return Option.match(elementProperty(firstParameter), {
    onNone: () =>
      Option.match(restBindingName(firstParameter), {
        onNone: () => Option.some(NO_ELEMENT_BINDING_MESSAGE),
        onSome: restName => unpackedDiagnostic(handler, restName, references),
      }),
    onSome: property => {
      const pattern = withoutDefault(property.value)

      return pattern.type === 'Identifier'
        ? bindingDiagnostic(handler, pattern.name, references)
        : Option.none<string>()
    },
  })
}

const isLocalMountDefinition = (
  node: ESTree.Node,
  localMountDefinitions: ReadonlySet<string>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (isCallExpression(node)) {
    return isMountDefinitionCall(node, references)
  }

  if (!isIdentifierReference(node)) {
    return false
  }

  if (references === undefined) {
    return localMountDefinitions.has(node.name)
  }

  return Option.exists(resolvedVariable(references, node), variable =>
    variable.defs.some(
      definition =>
        definition.type === 'Variable' &&
        isVariableDeclarator(definition.node) &&
        isCallExpression(definition.node.init) &&
        isMountDefinitionCall(definition.node.init, references),
    ),
  )
}

const mountHandler = (
  node: ESTree.CallExpression,
  localMountDefinitions: ReadonlySet<string>,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<MountHandler> => {
  if (isMountDefinitionCall(node, references) && node.arguments.length === 3) {
    return pipe(
      Array.last(node.arguments),
      Option.flatMap(build => effectConstructorValue(build, references)),
      Option.filter(isMountHandler),
    )
  }

  if (
    !isMemberExpression(node.callee) ||
    !Option.exists(staticMemberName(node.callee), name => name === 'toLayer') ||
    !isLocalMountDefinition(
      node.callee.object,
      localMountDefinitions,
      references,
    )
  ) {
    return Option.none()
  }

  return pipe(
    Array.head(node.arguments),
    Option.flatMap(build => effectConstructorValue(build, references)),
    Option.filter(isMountHandler),
  )
}

/** Flags local Mount handlers whose implementation never uses its element. A Mount exists for element-caused, element-targeted work; work that ignores the element belongs in a Command, Subscription, or ManagedResource. */
export const mountFactoryMustUseElement = Rule.define({
  name: 'mount-factory-must-use-element',
  meta: Rule.meta({
    type: 'suggestion',
    description: 'Require a Mount handler to use its live element.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)
    const localMountDefinitions = new Set<string>()
    return {
      VariableDeclarator: (node: ESTree.Node) => {
        if (
          references === undefined &&
          isVariableDeclarator(node) &&
          isIdentifier(node.id) &&
          isCallExpression(node.init) &&
          isMountDefinitionCall(node.init, references)
        ) {
          localMountDefinitions.add(node.id.name)
        }

        return Effect.void
      },
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }

        return Option.match(
          mountHandler(node, localMountDefinitions, references),
          {
            onNone: () => Effect.void,
            onSome: handler =>
              Option.match(handlerDiagnostic(handler, references), {
                onNone: () => Effect.void,
                onSome: message =>
                  ctx.report(Diagnostic.make({ node: handler, message })),
              }),
          },
        )
      },
    }
  },
})
