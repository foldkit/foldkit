import { Array, Effect, Option, pipe } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
  type Variable,
} from 'effect-oxlint'

import {
  indexReferences,
  isArrowFunction,
  isCallExpression,
  isIdentifier,
  isObjectExpression,
  isObjectProperty,
  isProgram,
  isVariableDeclarator,
  resolveFoldkitApiPath,
  resolveImportedPath,
  resolvedVariable,
  staticMemberPath,
  staticPropertyName,
} from '../guards.ts'

type ChildReturnOrigin = Readonly<{
  childFieldName: string
  helperLabel: string
  parentModel: ESTree.IdentifierReference
}>

const sameNames = (
  actual: ReadonlyArray<string>,
  expected: ReadonlyArray<string>,
): boolean =>
  Array.length(actual) === Array.length(expected) &&
  Array.every(
    Array.zip(actual, expected),
    ([actualName, expectedName]) => actualName === expectedName,
  )

const sameIdentifierName = (
  reference: ESTree.IdentifierReference,
  binding: Readonly<{ name: string }>,
): boolean => reference.name === binding.name

const isFoldkitEvoCall = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (references !== undefined) {
    return Option.exists(resolveFoldkitApiPath(references, node.callee), path =>
      sameNames(path, ['Struct', 'evo']),
    )
  }

  return Option.exists(
    staticMemberPath(node.callee),
    path =>
      (path.root.name === 'evo' && Array.isReadonlyArrayEmpty(path.members)) ||
      (path.root.name === 'Struct' && sameNames(path.members, ['evo'])),
  )
}

const isFoldCall = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  const isFoldPath = (path: ReadonlyArray<string>): boolean =>
    sameNames(path, ['Update', 'foldChild']) ||
    sameNames(path, ['Update', 'foldChildStep'])

  if (references !== undefined) {
    return Option.exists(
      resolveFoldkitApiPath(references, node.callee),
      isFoldPath,
    )
  }

  return Option.exists(staticMemberPath(node.callee), path =>
    isFoldPath([path.root.name, ...path.members]),
  )
}

const isInsideFoldWrite = (
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  let ancestor = node.parent

  while (ancestor !== null && ancestor !== undefined) {
    if (
      isObjectProperty(ancestor) &&
      Option.contains(staticPropertyName(ancestor), 'write') &&
      isObjectExpression(ancestor.parent) &&
      isCallExpression(ancestor.parent.parent) &&
      isFoldCall(ancestor.parent.parent, references)
    ) {
      return true
    }

    ancestor = ancestor.parent
  }

  return false
}

const isNode = (value: unknown): value is ESTree.Node =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  typeof value.type === 'string'

const walk = (root: ESTree.Node, visit: (node: ESTree.Node) => void): void => {
  const visited = new WeakSet<object>()
  const visitNode = (node: ESTree.Node): void => {
    if (visited.has(node)) {
      return
    }
    visited.add(node)
    visit(node)

    for (const [key, value] of Object.entries(node)) {
      if (key === 'parent') {
        continue
      }
      if (isNode(value)) {
        visitNode(value)
      } else if (globalThis.Array.isArray(value)) {
        for (const item of value) {
          if (isNode(item)) {
            visitNode(item)
          }
        }
      }
    }
  }

  visitNode(root)
}

const isReturnStatement = (node: unknown): node is ESTree.ReturnStatement =>
  isNode(node) && node.type === 'ReturnStatement'

const returnedExpression = (
  callback: ESTree.ArrowFunctionExpression,
): ESTree.Expression | undefined => {
  if (callback.body.type !== 'BlockStatement') {
    return callback.body
  }

  for (const statement of callback.body.body) {
    if (isReturnStatement(statement) && statement.argument !== null) {
      return statement.argument
    }
  }
  return undefined
}

const modelFieldNames = (
  functionNode: ESTree.ArrowFunctionExpression,
): ReadonlySet<string> => {
  const [parentModel] = functionNode.params
  const returned = returnedExpression(functionNode)
  if (!isIdentifier(parentModel) || returned === undefined) {
    return new Set()
  }

  const fieldNames = new Set<string>()
  walk(returned, node => {
    pipe(
      staticMemberPath(node),
      Option.filter(
        path =>
          Array.length(path.members) === 1 &&
          sameIdentifierName(path.root, parentModel),
      ),
      Option.flatMap(path => Array.head(path.members)),
      Option.map(fieldName => fieldNames.add(fieldName)),
    )
  })
  return fieldNames
}

const evoFieldNames = (
  functionNode: ESTree.ArrowFunctionExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ReadonlySet<string> => {
  const [parentModel, nextChild] = functionNode.params
  if (!isIdentifier(parentModel) || !isIdentifier(nextChild)) {
    return new Set()
  }

  const fieldNames = new Set<string>()
  walk(functionNode.body, node => {
    if (!isCallExpression(node) || !isFoldkitEvoCall(node, references)) {
      return
    }

    const [evoModel, updates] = node.arguments
    if (
      !isIdentifier(evoModel) ||
      !sameIdentifierName(evoModel, parentModel) ||
      !isObjectExpression(updates)
    ) {
      return
    }

    for (const property of updates.properties) {
      if (
        !isObjectProperty(property) ||
        property.computed ||
        !isArrowFunction(property.value)
      ) {
        continue
      }

      const replacement = returnedExpression(property.value)
      if (
        !isIdentifier(replacement) ||
        !sameIdentifierName(replacement, nextChild)
      ) {
        continue
      }

      pipe(
        staticPropertyName(property),
        Option.map(fieldName => fieldNames.add(fieldName)),
      )
    }
  })
  return fieldNames
}

const moduleCallbacks = (
  program: ESTree.Program,
): ReadonlyMap<string, ESTree.ArrowFunctionExpression> => {
  const callbacks = new Map<string, ESTree.ArrowFunctionExpression>()
  for (const statement of program.body) {
    const declaration =
      statement.type === 'ExportNamedDeclaration'
        ? statement.declaration
        : statement
    if (declaration?.type !== 'VariableDeclaration') {
      continue
    }

    for (const declarator of declaration.declarations) {
      if (isIdentifier(declarator.id) && isArrowFunction(declarator.init)) {
        callbacks.set(declarator.id.name, declarator.init)
      }
    }
  }
  return callbacks
}

const callbackValue = (
  value: unknown,
  callbacks: ReadonlyMap<string, ESTree.ArrowFunctionExpression>,
): ESTree.ArrowFunctionExpression | undefined => {
  if (isArrowFunction(value)) {
    return value
  }
  if (isIdentifier(value)) {
    return callbacks.get(value.name)
  }
  return undefined
}

const foldChildFieldsByNamespace = (
  program: ESTree.Program,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): ReadonlyMap<string, ReadonlySet<string>> => {
  const fieldsByNamespace = new Map<string, Set<string>>()
  const callbacks = moduleCallbacks(program)
  walk(program, node => {
    if (!isCallExpression(node) || !isFoldCall(node, references)) {
      return
    }

    const [configuration] = node.arguments
    if (!isObjectExpression(configuration)) {
      return
    }

    let namespace: string | undefined
    let readFields: ReadonlySet<string> | undefined
    let writeFields: ReadonlySet<string> | undefined
    for (const property of configuration.properties) {
      if (!isObjectProperty(property)) {
        continue
      }

      if (Option.contains(staticPropertyName(property), 'update')) {
        pipe(
          staticMemberPath(property.value),
          Option.filter(path => Array.length(path.members) === 1),
          Option.map(path => {
            namespace = path.root.name
          }),
        )
      } else if (Option.contains(staticPropertyName(property), 'read')) {
        const callback = callbackValue(property.value, callbacks)
        if (callback !== undefined) {
          readFields = modelFieldNames(callback)
        }
      } else if (Option.contains(staticPropertyName(property), 'write')) {
        const callback = callbackValue(property.value, callbacks)
        if (callback !== undefined) {
          writeFields = evoFieldNames(callback, references)
        }
      }
    }

    if (
      namespace === undefined ||
      readFields === undefined ||
      writeFields === undefined
    ) {
      return
    }

    for (const fieldName of readFields) {
      if (!writeFields.has(fieldName)) {
        continue
      }

      const fieldNames = fieldsByNamespace.get(namespace) ?? new Set<string>()
      fieldNames.add(fieldName)
      fieldsByNamespace.set(namespace, fieldNames)
    }
  })
  return fieldsByNamespace
}

const childModelField = (
  node: unknown,
): Option.Option<
  Readonly<{
    fieldName: string
    parentModel: ESTree.IdentifierReference
  }>
> =>
  Option.flatMap(staticMemberPath(node), path => {
    const [fieldName, extraFieldName] = path.members
    return fieldName !== undefined && extraFieldName === undefined
      ? Option.some({ fieldName, parentModel: path.root })
      : Option.none()
  })

const childReturnOrigin = (
  node: ESTree.VariableDeclarator,
  references: WeakMap<ESTree.Node, Reference> | undefined,
  foldFieldsByNamespace: ReadonlyMap<string, ReadonlySet<string>>,
): Option.Option<ChildReturnOrigin> =>
  Option.gen(function* () {
    if (!isIdentifier(node.id) || !isCallExpression(node.init)) {
      return yield* Option.none()
    }

    const childModel = yield* Option.flatMap(
      Array.head(node.init.arguments),
      childModelField,
    )
    const callee = yield* staticMemberPath(node.init.callee)
    const [helperName, extraHelperName] = callee.members
    if (helperName === undefined || extraHelperName !== undefined) {
      return yield* Option.none()
    }

    if (references !== undefined) {
      const importedPath = yield* resolveImportedPath(
        references,
        node.init.callee,
      )
      const [namespace, importedHelperName, extraImportedHelperName] =
        importedPath.localMembers
      if (
        !importedPath.source.startsWith('.') ||
        namespace === undefined ||
        importedHelperName === undefined ||
        extraImportedHelperName !== undefined ||
        namespace !== callee.root.name ||
        importedHelperName !== helperName
      ) {
        return yield* Option.none()
      }
    } else if (
      callee.root.name.charAt(0) !== callee.root.name.charAt(0).toUpperCase()
    ) {
      return yield* Option.none()
    }

    const foldFields = foldFieldsByNamespace.get(callee.root.name)
    if (foldFields === undefined || !foldFields.has(childModel.fieldName)) {
      return yield* Option.none()
    }

    return {
      childFieldName: childModel.fieldName,
      helperLabel: `${callee.root.name}.${helperName}`,
      parentModel: childModel.parentModel,
    }
  })

const resultBinding = (
  updater: ESTree.ArrowFunctionExpression,
): Option.Option<ESTree.IdentifierReference> =>
  Option.flatMap(staticMemberPath(updater.body), path =>
    sameNames(path.members, ['model']) ? Option.some(path.root) : Option.none(),
  )

const sameBinding = (
  a: ESTree.IdentifierReference,
  b: ESTree.IdentifierReference,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (references === undefined) {
    return a.name === b.name
  }

  const maybeA = resolvedVariable(references, a)
  const maybeB = resolvedVariable(references, b)
  return Option.isSome(maybeA) && Option.isSome(maybeB)
    ? maybeA.value === maybeB.value
    : a.name === b.name
}

const manualChildResultMessage = (
  childFieldName: string,
  helperLabel: string,
  resultName: string,
): string =>
  `The parent writes \`${resultName}.model\` into \`${childFieldName}\` after calling \`${helperLabel}\`. A child Return can include Commands or an OutMessage that this copy ignores. Use Update.foldChild or Update.foldChildStep.`

/** Flags a parent that copies a namespaced child helper or update Return's Model
 *  into the matching evo field. It requires a matching Update.foldChild or
 *  Update.foldChildStep reference in the file, and leaves ordinary helpers,
 *  direct imports, aliases, init assembly, and Model-only reflect helpers alone. */
export const requireFoldForChildUpdateResult = Rule.define({
  name: 'require-fold-for-child-update-result',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Fold child update results instead of manually copying their Models into a parent.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)
    const originsByVariable = new WeakMap<Variable, ChildReturnOrigin>()
    const fallbackOriginsByName = new Map<string, ChildReturnOrigin>()
    let foldFieldsByNamespace: ReadonlyMap<
      string,
      ReadonlySet<string>
    > = new Map()

    return {
      Program: (node: ESTree.Node) => {
        if (!isProgram(node)) {
          return Effect.void
        }
        foldFieldsByNamespace = foldChildFieldsByNamespace(node, references)

        if (references === undefined) {
          return Effect.void
        }

        for (const scope of scopes ?? []) {
          for (const variable of scope.variables) {
            const definition = variable.defs.find(
              candidate =>
                candidate.type === 'Variable' &&
                isVariableDeclarator(candidate.node),
            )
            if (
              definition === undefined ||
              !isVariableDeclarator(definition.node)
            ) {
              continue
            }

            pipe(
              childReturnOrigin(
                definition.node,
                references,
                foldFieldsByNamespace,
              ),
              Option.map(origin => originsByVariable.set(variable, origin)),
            )
          }
        }
        return Effect.void
      },
      VariableDeclarator: (node: ESTree.Node) => {
        if (references !== undefined || !isVariableDeclarator(node)) {
          return Effect.void
        }

        return pipe(
          childReturnOrigin(node, references, foldFieldsByNamespace),
          Option.match({
            onNone: () => Effect.void,
            onSome: origin => {
              if (isIdentifier(node.id)) {
                fallbackOriginsByName.set(node.id.name, origin)
              }
              return Effect.void
            },
          }),
        )
      },
      CallExpression: (node: ESTree.Node) => {
        if (
          !isCallExpression(node) ||
          !isFoldkitEvoCall(node, references) ||
          isInsideFoldWrite(node, references)
        ) {
          return Effect.void
        }

        const [parentModel, updates] = node.arguments
        if (!isIdentifier(parentModel) || !isObjectExpression(updates)) {
          return Effect.void
        }

        return Effect.forEach(
          updates.properties,
          property => {
            if (
              !isObjectProperty(property) ||
              property.computed ||
              !isArrowFunction(property.value)
            ) {
              return Effect.void
            }

            return pipe(
              Option.all({
                childFieldName: staticPropertyName(property),
                result: resultBinding(property.value),
              }),
              Option.flatMap(({ childFieldName, result }) => {
                const origin =
                  references === undefined
                    ? fallbackOriginsByName.get(result.name)
                    : Option.getOrUndefined(
                        Option.map(
                          resolvedVariable(references, result),
                          variable => originsByVariable.get(variable),
                        ),
                      )
                return origin === undefined
                  ? Option.none()
                  : Option.some({ childFieldName, origin, result })
              }),
              Option.filter(
                ({ childFieldName, origin, result }) =>
                  childFieldName === origin.childFieldName &&
                  sameBinding(parentModel, origin.parentModel, references) &&
                  !sameBinding(result, origin.parentModel, references),
              ),
              Option.match({
                onNone: () => Effect.void,
                onSome: ({ childFieldName, origin, result }) =>
                  ctx.report(
                    Diagnostic.make({
                      node: property.value,
                      message: manualChildResultMessage(
                        childFieldName,
                        origin.helperLabel,
                        result.name,
                      ),
                    }),
                  ),
              }),
            )
          },
          { discard: true },
        )
      },
    }
  },
})
