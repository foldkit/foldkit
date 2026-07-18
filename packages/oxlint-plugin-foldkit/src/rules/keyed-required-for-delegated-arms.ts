import { Array, Effect, Option, pipe } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import {
  calleeMatchesHelperName,
  helperCalleeName,
  isArrayExpression,
  isCallExpression,
  isIdentifier,
  isMemberExpression,
  isObjectExpression,
  isProgram,
  isVariableDeclaration,
  isVariableDeclarator,
} from '../guards.ts'

const matchFamilyHelperNames = ['tags', 'tagsExhaustive', 'match', '$match']

const mutuallyPatchableDelegatedArmCount = 2

const lowercaseTagNamePattern = /^[a-z][a-z0-9]*$/

const htmlTagNames: ReadonlySet<string> = new Set([
  'a',
  'abbr',
  'address',
  'area',
  'article',
  'aside',
  'audio',
  'b',
  'base',
  'bdi',
  'bdo',
  'blockquote',
  'body',
  'br',
  'button',
  'canvas',
  'caption',
  'circle',
  'cite',
  'code',
  'col',
  'colgroup',
  'data',
  'datalist',
  'dd',
  'defs',
  'del',
  'details',
  'dfn',
  'dialog',
  'div',
  'dl',
  'dt',
  'ellipse',
  'em',
  'embed',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'g',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hgroup',
  'hr',
  'html',
  'i',
  'iframe',
  'img',
  'input',
  'ins',
  'kbd',
  'label',
  'legend',
  'li',
  'line',
  'link',
  'main',
  'mark',
  'menu',
  'meta',
  'meter',
  'nav',
  'noscript',
  'ol',
  'optgroup',
  'option',
  'output',
  'p',
  'path',
  'picture',
  'polygon',
  'polyline',
  'pre',
  'progress',
  'q',
  'rect',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'search',
  'section',
  'select',
  'slot',
  'small',
  'source',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'svg',
  'table',
  'tbody',
  'td',
  'template',
  'text',
  'textarea',
  'tfoot',
  'th',
  'thead',
  'time',
  'title',
  'tr',
  'track',
  'u',
  'ul',
  'use',
  'video',
  'wbr',
])

// GUARDS

type EstreeLike = Readonly<{ type: string }>

const isEstreeLike = (value: unknown): value is EstreeLike =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  typeof value.type === 'string'

const isConditionalExpression = (
  node: unknown,
): node is Readonly<{
  type: 'ConditionalExpression'
  consequent: unknown
  alternate: unknown
}> => isEstreeLike(node) && node.type === 'ConditionalExpression'

const isBlockStatement = (
  node: unknown,
): node is Readonly<{ type: 'BlockStatement'; body: ReadonlyArray<unknown> }> =>
  isEstreeLike(node) && node.type === 'BlockStatement'

const isReturnStatement = (
  node: unknown,
): node is Readonly<{ type: 'ReturnStatement'; argument: unknown }> =>
  isEstreeLike(node) && node.type === 'ReturnStatement'

const isProperty = (
  node: unknown,
): node is Readonly<{ type: 'Property'; value: unknown }> =>
  isEstreeLike(node) && node.type === 'Property'

type HandlerFunction = Readonly<{
  type: 'ArrowFunctionExpression' | 'FunctionExpression'
  body: unknown
}>

const isHandlerFunction = (node: unknown): node is HandlerFunction =>
  isEstreeLike(node) &&
  (node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression')

const isFunctionLikeNode = (node: unknown): boolean =>
  isEstreeLike(node) &&
  (node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression' ||
    node.type === 'FunctionDeclaration')

const wrapperExpressionTypes: ReadonlyArray<string> = [
  'ChainExpression',
  'ParenthesizedExpression',
  'TSAsExpression',
  'TSInstantiationExpression',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
]

const isWrapperExpression = (
  node: unknown,
): node is Readonly<{ type: string; expression: unknown }> =>
  isEstreeLike(node) &&
  wrapperExpressionTypes.includes(node.type) &&
  'expression' in node

const unwrapExpression = (node: unknown): unknown =>
  isWrapperExpression(node) ? unwrapExpression(node.expression) : node

// CLASSIFICATION

const isKeyedWrapped = (node: ESTree.CallExpression): boolean =>
  isCallExpression(node.callee) &&
  calleeMatchesHelperName(node.callee.callee, 'keyed')

const isElementConstruction = (node: ESTree.CallExpression): boolean => {
  const callee = node.callee
  if (isIdentifier(callee)) {
    return htmlTagNames.has(callee.name)
  }
  if (
    isMemberExpression(callee) &&
    !callee.computed &&
    isIdentifier(callee.object, 'h')
  ) {
    const propertyNode = callee.property
    return (
      isIdentifier(propertyNode) &&
      lowercaseTagNamePattern.test(propertyNode.name)
    )
  }
  return false
}

const hasKeyAttributeArgument = (call: ESTree.CallExpression): boolean =>
  Array.some(
    call.arguments,
    argument =>
      isArrayExpression(argument) &&
      Array.some(
        argument.elements,
        element =>
          isCallExpression(element) &&
          calleeMatchesHelperName(element.callee, 'Key'),
      ),
  )

const isKeyedArm = (node: ESTree.CallExpression): boolean =>
  isKeyedWrapped(node) || hasKeyAttributeArgument(node)

const isMatchFamilyCall = (node: ESTree.CallExpression): boolean =>
  Option.exists(helperCalleeName(node.callee), helperName =>
    matchFamilyHelperNames.includes(helperName),
  )

const isPipeCall = (node: ESTree.CallExpression): boolean =>
  calleeMatchesHelperName(node.callee, 'pipe')

const isDelegatedArm = (arm: unknown): arm is ESTree.CallExpression =>
  isCallExpression(arm) &&
  !isKeyedArm(arm) &&
  !isElementConstruction(arm) &&
  !isMatchFamilyCall(arm) &&
  !isPipeCall(arm)

const isNullLiteralArm = (arm: unknown): boolean =>
  isEstreeLike(arm) &&
  arm.type === 'Literal' &&
  'value' in arm &&
  arm.value === null &&
  !('regex' in arm)

const isEmptyMemberArm = (arm: unknown): boolean =>
  isMemberExpression(arm) &&
  !arm.computed &&
  isIdentifier(arm.object, 'h') &&
  isIdentifier(arm.property, 'empty')

const isAbsenceArm = (arm: unknown): boolean =>
  isNullLiteralArm(arm) ||
  isIdentifier(arm, 'undefined') ||
  isEmptyMemberArm(arm) ||
  (isArrayExpression(arm) && Array.isReadonlyArrayEmpty(arm.elements))

const isBranchKeyingCall = (node: unknown): node is ESTree.CallExpression =>
  isCallExpression(node) && isKeyedArm(node)

// CONDITIONALS

const handlerResultExpression = (
  handler: HandlerFunction,
): Option.Option<unknown> => {
  if (!isBlockStatement(handler.body)) {
    return Option.some(handler.body)
  }
  return pipe(
    handler.body.body,
    Array.findLast(isReturnStatement),
    Option.flatMap(returnStatement =>
      Option.fromNullishOr(returnStatement.argument),
    ),
  )
}

const matchFamilyArms = (
  call: ESTree.CallExpression,
): Option.Option<ReadonlyArray<unknown>> => {
  if (!isMatchFamilyCall(call)) {
    return Option.none()
  }
  return pipe(
    call.arguments,
    Array.findFirst(isObjectExpression),
    Option.map(handlersObject =>
      pipe(
        handlersObject.properties,
        Array.flatMap(property => {
          if (!isProperty(property) || !isHandlerFunction(property.value)) {
            return []
          }
          return Option.toArray(handlerResultExpression(property.value))
        }),
      ),
    ),
    Option.filter(Array.isArrayNonEmpty),
  )
}

const conditionalArms = (
  node: EstreeLike,
): Option.Option<ReadonlyArray<unknown>> => {
  if (isConditionalExpression(node)) {
    return Option.some([node.consequent, node.alternate])
  }
  if (isCallExpression(node)) {
    return matchFamilyArms(node)
  }
  return Option.none()
}

// INDEX

type ParentIndex = ReadonlyMap<EstreeLike, EstreeLike>

type ProgramIndex = Readonly<{
  parentOf: ParentIndex
  nodes: ReadonlyArray<EstreeLike>
}>

const childValuesOf = (node: EstreeLike): ReadonlyArray<unknown> =>
  pipe(
    Object.entries(node),
    Array.flatMap(([fieldName, fieldValue]) =>
      fieldName === 'parent' ? [] : [fieldValue],
    ),
  )

const indexProgram = (program: ESTree.Program): ProgramIndex => {
  const parentOf = new Map<EstreeLike, EstreeLike>()
  const nodes: Array<EstreeLike> = []
  const visitValue = (value: unknown, parentNode: EstreeLike): void => {
    if (Array.isArray(value)) {
      for (const element of value) {
        visitValue(element, parentNode)
      }
      return
    }
    if (!isEstreeLike(value)) {
      return
    }
    parentOf.set(value, parentNode)
    nodes.push(value)
    for (const childValue of childValuesOf(value)) {
      visitValue(childValue, value)
    }
  }
  for (const childValue of childValuesOf(program)) {
    visitValue(childValue, program)
  }
  return { parentOf, nodes }
}

const parentNodeOf = (
  node: EstreeLike,
  parentOf: ParentIndex,
): Option.Option<EstreeLike> => Option.fromNullishOr(parentOf.get(node))

const attachmentRoot = (node: EstreeLike, parentOf: ParentIndex): EstreeLike =>
  pipe(
    parentNodeOf(node, parentOf),
    Option.filter(
      parent =>
        isWrapperExpression(parent) ||
        (isCallExpression(parent) &&
          isPipeCall(parent) &&
          Array.some(parent.arguments, argument => argument === node)),
    ),
    Option.match({
      onNone: () => node,
      onSome: parent => attachmentRoot(parent, parentOf),
    }),
  )

const isInsideBranchKeyingArguments = (
  node: EstreeLike,
  parentOf: ParentIndex,
): boolean =>
  pipe(
    parentNodeOf(node, parentOf),
    Option.match({
      onNone: () => false,
      onSome: parent => {
        if (isFunctionLikeNode(parent)) {
          return false
        }
        if (
          isBranchKeyingCall(parent) &&
          Array.some(parent.arguments, argument => argument === node)
        ) {
          return true
        }
        return isInsideBranchKeyingArguments(parent, parentOf)
      },
    }),
  )

const enclosingScopeRoot = (
  node: EstreeLike,
  parentOf: ParentIndex,
): EstreeLike =>
  pipe(
    parentNodeOf(node, parentOf),
    Option.match({
      onNone: () => node,
      onSome: parent =>
        isFunctionLikeNode(parent)
          ? parent
          : enclosingScopeRoot(parent, parentOf),
    }),
  )

type ConstBinding = Readonly<{ bindingName: string }>

const constBindingOf = (
  root: EstreeLike,
  parentOf: ParentIndex,
): Option.Option<ConstBinding> => {
  const maybeDeclarator = pipe(
    parentNodeOf(root, parentOf),
    Option.filter(isVariableDeclarator),
  )
  if (Option.isNone(maybeDeclarator)) {
    return Option.none()
  }
  const declarator = maybeDeclarator.value
  if (declarator.init !== root || !isIdentifier(declarator.id)) {
    return Option.none()
  }
  const isConstDeclared = pipe(
    parentNodeOf(declarator, parentOf),
    Option.exists(
      declaration =>
        isVariableDeclaration(declaration) && declaration.kind === 'const',
    ),
  )
  if (!isConstDeclared) {
    return Option.none()
  }
  return Option.some({ bindingName: declarator.id.name })
}

// EVIDENCE

const referencesIdentifierNamed = (
  value: unknown,
  bindingName: string,
): boolean => {
  if (Array.isArray(value)) {
    return value.some(element =>
      referencesIdentifierNamed(element, bindingName),
    )
  }
  if (typeof value !== 'object' || value === null) {
    return false
  }
  if (isIdentifier(value, bindingName)) {
    return true
  }
  return Object.entries(value).some(
    ([fieldName, fieldValue]) =>
      fieldName !== 'parent' &&
      referencesIdentifierNamed(fieldValue, bindingName),
  )
}

const isNameKeyedInScope = (value: unknown, bindingName: string): boolean => {
  if (Array.isArray(value)) {
    return value.some(element => isNameKeyedInScope(element, bindingName))
  }
  if (typeof value !== 'object' || value === null) {
    return false
  }
  if (
    isBranchKeyingCall(value) &&
    referencesIdentifierNamed(value.arguments, bindingName)
  ) {
    return true
  }
  return Object.entries(value).some(
    ([fieldName, fieldValue]) =>
      fieldName !== 'parent' && isNameKeyedInScope(fieldValue, bindingName),
  )
}

const isNameInUnkeyedChildren = (
  value: unknown,
  bindingName: string,
): boolean => {
  if (Array.isArray(value)) {
    return value.some(element => isNameInUnkeyedChildren(element, bindingName))
  }
  if (typeof value !== 'object' || value === null) {
    return false
  }
  if (
    isCallExpression(value) &&
    isElementConstruction(value) &&
    !hasKeyAttributeArgument(value) &&
    Array.some(
      value.arguments,
      argument =>
        isArrayExpression(argument) &&
        Array.some(argument.elements, element =>
          isIdentifier(element, bindingName),
        ),
    )
  ) {
    return true
  }
  return Object.entries(value).some(
    ([fieldName, fieldValue]) =>
      fieldName !== 'parent' &&
      isNameInUnkeyedChildren(fieldValue, bindingName),
  )
}

const isInChildrenArrayPosition = (
  root: EstreeLike,
  parentOf: ParentIndex,
): boolean =>
  pipe(
    parentNodeOf(root, parentOf),
    Option.filter(isArrayExpression),
    Option.flatMap(childrenArray =>
      pipe(
        parentNodeOf(childrenArray, parentOf),
        Option.filter(isCallExpression),
        Option.map(containerCall => ({ childrenArray, containerCall })),
      ),
    ),
    Option.exists(
      ({ childrenArray, containerCall }) =>
        Array.some(
          containerCall.arguments,
          argument => argument === childrenArray,
        ) &&
        (isElementConstruction(containerCall) || isKeyedWrapped(containerCall)),
    ),
  )

// MESSAGE

const calleeDisplayName = (callee: unknown): Option.Option<string> => {
  if (isIdentifier(callee)) {
    return Option.some(callee.name)
  }
  if (isMemberExpression(callee) && !callee.computed) {
    const propertyNode = callee.property
    if (isIdentifier(propertyNode)) {
      return Option.map(
        calleeDisplayName(callee.object),
        objectName => `${objectName}.${propertyNode.name}`,
      )
    }
  }
  return Option.none()
}

const delegatedArmMessage = (delegatedCall: ESTree.CallExpression): string => {
  const delegateDescription = Option.match(
    calleeDisplayName(delegatedCall.callee),
    {
      onNone: () => 'another view function',
      onSome: calleeName => `\`${calleeName}(...)\``,
    },
  )
  return `This branch arm delegates to ${delegateDescription}, so the element call lives inside the callee and the automatic branch keys from the build integration cannot reach it; they cover only arms that construct an element directly. Because a sibling arm is also unkeyed, the runtime can patch the old branch's DOM into the new one in place when the branch switches. Wrap the branch result as \`h.keyed('div')(discriminatingKey, [], [content])\`, key this arm explicitly, or suppress a genuinely safe arm with \`// oxlint-disable-next-line foldkit/keyed-required-for-delegated-arms\`.`
}

// RULE

type Offense = Readonly<{
  node: ESTree.CallExpression
  message: string
}>

const delegatedArmOffenses = (
  candidate: EstreeLike,
  parentOf: ParentIndex,
): ReadonlyArray<Offense> => {
  const maybeArms = conditionalArms(candidate)
  if (Option.isNone(maybeArms)) {
    return []
  }
  const arms = Array.map(maybeArms.value, unwrapExpression)
  const delegatedArms = Array.filter(arms, isDelegatedArm)
  if (Array.isArrayEmpty(delegatedArms)) {
    return []
  }
  const hasAbsenceArm = Array.some(arms, isAbsenceArm)
  const isMutuallyPatchable =
    delegatedArms.length >= mutuallyPatchableDelegatedArmCount || hasAbsenceArm
  if (!isMutuallyPatchable) {
    return []
  }
  if (isInsideBranchKeyingArguments(candidate, parentOf)) {
    return []
  }
  const root = attachmentRoot(candidate, parentOf)
  const bindingUsage = pipe(
    constBindingOf(root, parentOf),
    Option.map(binding => {
      const scopeRoot = enclosingScopeRoot(root, parentOf)
      return {
        isKeyedUsage: isNameKeyedInScope(scopeRoot, binding.bindingName),
        isUnkeyedChildrenUsage: isNameInUnkeyedChildren(
          scopeRoot,
          binding.bindingName,
        ),
      }
    }),
  )
  if (Option.exists(bindingUsage, usage => usage.isKeyedUsage)) {
    return []
  }
  const isHtmlPositioned =
    Array.some(arms, isEmptyMemberArm) ||
    isInChildrenArrayPosition(root, parentOf) ||
    Option.exists(bindingUsage, usage => usage.isUnkeyedChildrenUsage)
  if (!isHtmlPositioned) {
    return []
  }
  return Array.map(delegatedArms, delegatedArm => ({
    node: delegatedArm,
    message: delegatedArmMessage(delegatedArm),
  }))
}

/**
 * Requires a key at the branch site when a conditional Html arm delegates to
 * another view function and can collide with an unkeyed sibling arm. The
 * build integration injects branch keys only onto arms that construct an
 * element directly, and a keyed vnode never patches into an unkeyed one, so
 * a delegated arm is hazardous only next to another delegated arm or next to
 * an absence arm such as \`h.empty\`, \`null\`, \`undefined\`, or \`[]\`.
 */
export const keyedRequiredForDelegatedArms = Rule.define({
  name: 'keyed-required-for-delegated-arms',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Key branch sites where a delegated view arm can patch into another delegated or absence arm; automatic branch keys cover only direct element arms.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      'Program:exit': (node: ESTree.Node) => {
        if (!isProgram(node)) {
          return Effect.void
        }
        const { parentOf, nodes } = indexProgram(node)
        const offenses = pipe(
          nodes,
          Array.flatMap(candidate => delegatedArmOffenses(candidate, parentOf)),
        )
        return Effect.forEach(
          offenses,
          offense => ctx.report(Diagnostic.make(offense)),
          { discard: true },
        )
      },
    }
  },
})
