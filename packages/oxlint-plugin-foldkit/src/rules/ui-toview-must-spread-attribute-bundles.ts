import { Array, Effect, Option, String, pipe } from 'effect'
import { AST, Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

const UI_COMPONENT_NAMES: ReadonlyArray<string> = [
  'Animation',
  'Button',
  'Calendar',
  'Checkbox',
  'Combobox',
  'DatePicker',
  'Dialog',
  'Disclosure',
  'DragAndDrop',
  'Fieldset',
  'FileDrop',
  'Input',
  'Listbox',
  'Menu',
  'Popover',
  'RadioGroup',
  'Select',
  'Slider',
  'Switch',
  'Tabs',
  'Textarea',
  'Toast',
  'Tooltip',
  'VirtualList',
]

const isCallExpression = (node: ESTree.Node): node is ESTree.CallExpression =>
  node.type === 'CallExpression'

type InlineFunction = ESTree.ArrowFunctionExpression | ESTree.Function

const isInlineFunction = (node: ESTree.Node): node is InlineFunction =>
  node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression'

const isNestedFunctionBoundary = (node: ESTree.Node): boolean =>
  node.type === 'ArrowFunctionExpression' ||
  node.type === 'FunctionExpression' ||
  node.type === 'FunctionDeclaration'

const isEstreeNode = (value: unknown): value is ESTree.Node =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  typeof value.type === 'string'

const childValuesOf = (node: ESTree.Node): ReadonlyArray<unknown> => {
  const entries: ReadonlyArray<readonly [string, unknown]> =
    Object.entries(node)
  return pipe(
    entries,
    Array.flatMap(([key, value]) => (key === 'parent' ? [] : [value])),
  )
}

const containsMatchingNode = (
  value: unknown,
  isMatch: (node: ESTree.Node) => boolean,
): boolean => {
  if (Array.isArray(value)) {
    return value.some(element => containsMatchingNode(element, isMatch))
  }
  if (!isEstreeNode(value)) {
    return false
  }
  if (isMatch(value)) {
    return true
  }
  if (isNestedFunctionBoundary(value)) {
    return false
  }
  const children = childValuesOf(value)
  return children.some(child => containsMatchingNode(child, isMatch))
}

type ComponentView = Readonly<{
  componentName: string
  writtenPath: string
}>

const matchComponentViewPath = (
  node: ESTree.Node,
): Option.Option<ComponentView> => {
  if (node.type !== 'MemberExpression') {
    return Option.none()
  }
  return pipe(
    AST.memberPath(node),
    Option.flatMap(path => {
      const [firstSegment, secondSegment, thirdSegment] = path
      if (
        path.length === 2 &&
        secondSegment === 'view' &&
        UI_COMPONENT_NAMES.includes(firstSegment)
      ) {
        return Option.some({
          componentName: firstSegment,
          writtenPath: `${firstSegment}.view`,
        })
      }
      if (
        path.length === 3 &&
        firstSegment === 'Ui' &&
        secondSegment !== undefined &&
        thirdSegment === 'view'
      ) {
        return Option.some({
          componentName: secondSegment,
          writtenPath: `Ui.${secondSegment}.view`,
        })
      }
      return Option.none()
    }),
  )
}

const isSubmodelCallee = (callee: ESTree.Node): boolean => {
  if (callee.type === 'Identifier') {
    return callee.name === 'submodel'
  }
  if (callee.type === 'MemberExpression') {
    return pipe(
      AST.memberPath(callee),
      Option.map(
        path =>
          path.length === 2 &&
          Array.headNonEmpty(path) === 'h' &&
          Array.lastNonEmpty(path) === 'submodel',
      ),
      Option.getOrElse(() => false),
    )
  }
  return false
}

const isPropertyKeyNamed = (key: ESTree.Node, expected: string): boolean => {
  if (key.type === 'Identifier') {
    return key.name === expected
  }
  return key.type === 'Literal' && key.value === expected
}

const propertyValuesKeyed = (
  object: ESTree.ObjectExpression,
  key: string,
): ReadonlyArray<ESTree.Node> =>
  pipe(
    object.properties,
    Array.flatMap(property =>
      property.type === 'Property' &&
      !property.computed &&
      isPropertyKeyNamed(property.key, key)
        ? [property.value]
        : [],
    ),
  )

const matchObjectExpression = (
  node: ESTree.Node,
): Option.Option<ESTree.ObjectExpression> =>
  node.type === 'ObjectExpression' ? Option.some(node) : Option.none()

const firstArgumentObject = (
  node: ESTree.CallExpression,
): Option.Option<ESTree.ObjectExpression> => {
  const [firstArgument] = node.arguments
  return firstArgument !== undefined &&
    firstArgument.type === 'ObjectExpression'
    ? Option.some(firstArgument)
    : Option.none()
}

type UiViewCandidate = Readonly<{
  componentName: string
  writtenPath: string
  functionNode: InlineFunction
}>

const toViewCandidates = (
  configObject: ESTree.ObjectExpression,
  componentView: ComponentView,
): ReadonlyArray<UiViewCandidate> =>
  pipe(
    propertyValuesKeyed(configObject, 'toView'),
    Array.flatMap(value =>
      isInlineFunction(value)
        ? [{ ...componentView, functionNode: value }]
        : [],
    ),
  )

const directViewCandidates = (
  node: ESTree.CallExpression,
): ReadonlyArray<UiViewCandidate> =>
  pipe(
    matchComponentViewPath(node.callee),
    Option.flatMap(componentView =>
      pipe(
        firstArgumentObject(node),
        Option.map(configObject =>
          toViewCandidates(configObject, componentView),
        ),
      ),
    ),
    Option.getOrElse((): ReadonlyArray<UiViewCandidate> => []),
  )

const submodelCandidates = (
  node: ESTree.CallExpression,
): ReadonlyArray<UiViewCandidate> => {
  if (!isSubmodelCallee(node.callee)) {
    return []
  }
  return pipe(
    firstArgumentObject(node),
    Option.flatMap(configObject =>
      pipe(
        Array.head(propertyValuesKeyed(configObject, 'view')),
        Option.flatMap(matchComponentViewPath),
        Option.flatMap(componentView =>
          pipe(
            Array.head(propertyValuesKeyed(configObject, 'viewInputs')),
            Option.flatMap(matchObjectExpression),
            Option.map(viewInputsObject =>
              toViewCandidates(viewInputsObject, componentView),
            ),
          ),
        ),
      ),
    ),
    Option.getOrElse((): ReadonlyArray<UiViewCandidate> => []),
  )
}

const firstParameterName = (
  functionNode: InlineFunction,
): Option.Option<string> => {
  const [firstParameter] = functionNode.params
  return firstParameter !== undefined && firstParameter.type === 'Identifier'
    ? Option.some(firstParameter.name)
    : Option.none()
}

const hasParameterRootedBundlePath = (
  node: ESTree.Node,
  parameterName: string,
): boolean =>
  node.type === 'MemberExpression' &&
  pipe(
    AST.memberPath(node),
    Option.map(
      path => path.length > 1 && Array.headNonEmpty(path) === parameterName,
    ),
    Option.getOrElse(() => false),
  )

const isBundleUse =
  (parameterName: string) =>
  (node: ESTree.Node): boolean => {
    if (node.type === 'SpreadElement') {
      return hasParameterRootedBundlePath(node.argument, parameterName)
    }
    if (node.type === 'CallExpression') {
      const directArguments = node.arguments
      return directArguments.some(argument =>
        hasParameterRootedBundlePath(argument, parameterName),
      )
    }
    return false
  }

const isDialogElementCall = (node: ESTree.Node): boolean =>
  node.type === 'CallExpression' &&
  node.callee.type === 'MemberExpression' &&
  pipe(
    AST.memberPath(node.callee),
    Option.map(
      path => path.length === 2 && Array.lastNonEmpty(path) === 'dialog',
    ),
    Option.getOrElse(() => false),
  )

const usesAttributeBundles = (functionNode: InlineFunction): boolean =>
  Option.match(firstParameterName(functionNode), {
    onNone: () => false,
    onSome: parameterName =>
      containsMatchingNode(functionNode.body, isBundleUse(parameterName)),
  })

const rendersDialogElement = (functionNode: InlineFunction): boolean =>
  containsMatchingNode(functionNode.body, isDialogElementCall)

const attributeBundleMessage = (candidate: UiViewCandidate): string =>
  `This \`toView\` callback for \`${candidate.writtenPath}\` never uses the attribute bundles Foldkit passes it. Spread them into your elements (\`...attributes.${String.uncapitalize(candidate.componentName)}\`) or pass them through as call arguments, otherwise ARIA wiring, event handlers, and Submodel routing are dropped.`

const DIALOG_ELEMENT_MESSAGE =
  'A Dialog `toView` callback must render an `h.dialog(...)` element. Foldkit opens and closes the native dialog and attaches its dialog attributes there; rendering a different element breaks dialog semantics.'

/**
 * Requires inline `toView` callbacks passed to `@foldkit/ui` component views
 * to use the attribute bundles Foldkit provides, and Dialog `toView`
 * callbacks to render an `h.dialog(...)` element.
 */
export const uiToviewMustSpreadAttributeBundles = Rule.define({
  name: 'ui-toview-must-spread-attribute-bundles',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Spread or pass through the attribute bundles Foldkit hands to Ui toView callbacks.',
  }),
  create: function* () {
    const ctx = yield* RuleContext

    const reportCandidate = (candidate: UiViewCandidate) =>
      Effect.gen(function* () {
        if (!usesAttributeBundles(candidate.functionNode)) {
          yield* ctx.report(
            Diagnostic.make({
              node: candidate.functionNode,
              message: attributeBundleMessage(candidate),
            }),
          )
        }
        if (
          candidate.componentName === 'Dialog' &&
          !rendersDialogElement(candidate.functionNode)
        ) {
          yield* ctx.report(
            Diagnostic.make({
              node: candidate.functionNode,
              message: DIALOG_ELEMENT_MESSAGE,
            }),
          )
        }
      })

    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }
        const candidates = [
          ...directViewCandidates(node),
          ...submodelCandidates(node),
        ]
        return Effect.forEach(candidates, reportCandidate, { discard: true })
      },
    }
  },
})
