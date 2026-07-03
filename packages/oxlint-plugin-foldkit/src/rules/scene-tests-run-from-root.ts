import { pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { AST, Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as HashSet from 'effect/HashSet'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Ref from 'effect/Ref'
import * as Result from 'effect/Result'
import * as Str from 'effect/String'

interface ImportBinding {
  readonly local: string
  readonly source: string
}

interface ObjectBinding {
  readonly local: string
  readonly object: ESTree.ObjectExpression
}

type Provenance =
  | {
      readonly kind: 'page'
      readonly source: string
    }
  | {
      readonly kind: 'widget'
      readonly source: string
      readonly widget: string
    }

const normalizedPath = (filename: string): string =>
  Str.replaceAll('\\', '/')(filename)

const isTestFile = (filename: string): boolean => {
  const normalized = normalizedPath(filename)
  return (
    Str.includes('/apps/ui/test/')(normalized) && /\.tsx?$/.test(normalized)
  )
}

const parentOf = (node: {
  readonly parent?: unknown
}): Option.Option<{ readonly type: string; readonly parent?: unknown }> =>
  pipe(
    Option.fromNullishOr(node.parent),
    Option.filter(
      (
        parent,
      ): parent is { readonly type: string; readonly parent?: unknown } =>
        P.isObject(parent) && 'type' in parent && P.isString(parent.type),
    ),
  )

const isIdentifier = (
  value: unknown,
): value is ESTree.IdentifierName | ESTree.IdentifierReference =>
  P.isObject(value) &&
  'type' in value &&
  value.type === 'Identifier' &&
  'name' in value &&
  P.isString(value.name)

const isMemberExpression = (value: unknown): value is ESTree.MemberExpression =>
  P.isObject(value) && 'type' in value && value.type === 'MemberExpression'

const isFunctionLike = (
  value: unknown,
): value is ESTree.ArrowFunctionExpression | ESTree.Function =>
  P.isObject(value) &&
  'type' in value &&
  (value.type === 'ArrowFunctionExpression' ||
    value.type === 'FunctionExpression') &&
  'params' in value &&
  Array.isArray(value.params) &&
  'body' in value

const isObjectExpression = (value: unknown): value is ESTree.ObjectExpression =>
  P.isObject(value) && 'type' in value && value.type === 'ObjectExpression'

const isObjectProperty = (value: unknown): value is ESTree.ObjectProperty =>
  P.isObject(value) && 'type' in value && value.type === 'Property'

const isVariableDeclaration = (
  value: unknown,
): value is ESTree.VariableDeclaration =>
  P.isObject(value) && 'type' in value && value.type === 'VariableDeclaration'

const unwrapExpression = (value: unknown): unknown => {
  if (!P.isObject(value) || !('type' in value)) return value
  if (
    (value.type === 'ChainExpression' ||
      value.type === 'ParenthesizedExpression' ||
      value.type === 'TSNonNullExpression' ||
      value.type === 'TSAsExpression' ||
      value.type === 'TSSatisfiesExpression' ||
      value.type === 'TSTypeAssertion' ||
      value.type === 'TSInstantiationExpression') &&
    'expression' in value
  ) {
    return unwrapExpression(value.expression)
  }
  return value
}

const staticKeyName = (
  property: ESTree.ObjectProperty,
): Option.Option<string> => {
  if (property.computed) return Option.none()
  if (isIdentifier(property.key)) return Option.some(property.key.name)
  return property.key.type === 'Literal' && P.isString(property.key.value)
    ? Option.some(property.key.value)
    : Option.none()
}

const objectValue = (
  object: ESTree.ObjectExpression,
  key: string,
): Option.Option<ESTree.Node> =>
  pipe(
    object.properties,
    Arr.findFirst(
      (property): property is ESTree.ObjectProperty =>
        isObjectProperty(property) &&
        pipe(
          staticKeyName(property),
          Option.match({
            onNone: () => false,
            onSome: name => name === key,
          }),
        ),
    ),
    Option.map(property => property.value),
  )

const localName = (
  specifier: ESTree.ImportDeclaration['specifiers'][number],
): Option.Option<string> => {
  if (
    specifier.type === 'ImportSpecifier' ||
    specifier.type === 'ImportDefaultSpecifier' ||
    specifier.type === 'ImportNamespaceSpecifier'
  ) {
    return Option.some(specifier.local.name)
  }
  return Option.none()
}

const importBindings = (
  node: ESTree.ImportDeclaration,
): ReadonlyArray<ImportBinding> =>
  pipe(
    node.specifiers,
    Arr.filterMap(specifier =>
      pipe(
        localName(specifier),
        Option.map(local => ({ local, source: node.source.value })),
        Result.fromOption(() => undefined),
      ),
    ),
  )

const lookupImportSource = (
  imports: ReadonlyArray<ImportBinding>,
  local: string,
): Option.Option<string> =>
  pipe(
    imports,
    Arr.findFirst(binding => binding.local === local),
    Option.map(binding => binding.source),
  )

const stripExtension = (segment: string): string =>
  segment.replace(/\.[cm]?tsx?$/, '')

const widgetNameFromSource = (source: string): Option.Option<string> => {
  const segments = Str.split('/')(normalizedPath(source))
  const widgetIndex = Arr.findFirstIndex(
    segments,
    segment => segment === 'widget',
  )
  return pipe(
    widgetIndex,
    Option.flatMap(index => Arr.get(segments, index + 1)),
    Option.map(stripExtension),
  )
}

const provenanceFromSource = (source: string): Option.Option<Provenance> => {
  const normalized = normalizedPath(source)
  if (Str.includes('/page/')(normalized)) {
    return Option.some({ kind: 'page', source })
  }
  return Str.includes('/widget/')(normalized)
    ? pipe(
        widgetNameFromSource(source),
        Option.map(widget => ({
          kind: 'widget' as const,
          source,
          widget,
        })),
      )
    : Option.none()
}

const rootIdentifier = (value: unknown): Option.Option<string> => {
  const unwrapped = unwrapExpression(value)
  if (isIdentifier(unwrapped)) return Option.some(unwrapped.name)
  if (isMemberExpression(unwrapped)) return rootIdentifier(unwrapped.object)
  return Option.none()
}

const importedProvenance = (
  imports: ReadonlyArray<ImportBinding>,
  local: string,
): ReadonlyArray<Provenance> =>
  pipe(
    lookupImportSource(imports, local),
    Option.flatMap(provenanceFromSource),
    Option.match({
      onNone: () => [],
      onSome: provenance => [provenance],
    }),
  )

const paramNames = (value: unknown): ReadonlyArray<string> => {
  if (!isFunctionLike(value)) return []
  return pipe(
    value.params,
    Arr.filterMap(param =>
      isIdentifier(param) ? Result.succeed(param.name) : Result.failVoid,
    ),
  )
}

const declaredName = (value: unknown): Option.Option<string> =>
  P.isObject(value) &&
  'type' in value &&
  value.type === 'VariableDeclarator' &&
  'id' in value &&
  isIdentifier(value.id)
    ? Option.some(value.id.name)
    : Option.none()

const importSourcesIn = (
  root: unknown,
  imports: ReadonlyArray<ImportBinding>,
  shadowed: HashSet.HashSet<string> = HashSet.empty(),
): ReadonlyArray<string> => {
  const unwrapped = unwrapExpression(root)
  if (isIdentifier(unwrapped)) {
    return HashSet.has(shadowed, unwrapped.name)
      ? []
      : pipe(
          lookupImportSource(imports, unwrapped.name),
          Option.match({
            onNone: () => [],
            onSome: source => [source],
          }),
        )
  }
  if (isMemberExpression(unwrapped)) {
    const rootSources = pipe(
      rootIdentifier(unwrapped.object),
      Option.filter(name => !HashSet.has(shadowed, name)),
      Option.flatMap(name => lookupImportSource(imports, name)),
      Option.match({
        onNone: () => [],
        onSome: source => [source],
      }),
    )
    const computedSources = unwrapped.computed
      ? importSourcesIn(unwrapped.property, imports, shadowed)
      : []
    return [...rootSources, ...computedSources]
  }
  if (isObjectProperty(unwrapped)) {
    const keySources = unwrapped.computed
      ? importSourcesIn(unwrapped.key, imports, shadowed)
      : []
    return [
      ...keySources,
      ...importSourcesIn(unwrapped.value, imports, shadowed),
    ]
  }
  if (!P.isObject(unwrapped)) return []
  const nextShadowed = isFunctionLike(unwrapped)
    ? pipe(
        paramNames(unwrapped),
        Arr.reduce(shadowed, (set, name) => HashSet.add(set, name)),
      )
    : pipe(
        declaredName(unwrapped),
        Option.match({
          onNone: () => shadowed,
          onSome: name => HashSet.add(shadowed, name),
        }),
      )
  return pipe(
    Object.entries(unwrapped),
    Arr.flatMap(([key, child]) =>
      key === 'parent'
        ? []
        : Array.isArray(child)
          ? pipe(
              child,
              Arr.flatMap(item => importSourcesIn(item, imports, nextShadowed)),
            )
          : importSourcesIn(child, imports, nextShadowed),
    ),
  )
}

const expressionProvenance = (
  expression: ESTree.Node,
  imports: ReadonlyArray<ImportBinding>,
): ReadonlyArray<Provenance> => {
  const unwrapped = unwrapExpression(expression)
  if (isIdentifier(unwrapped))
    return importedProvenance(imports, unwrapped.name)
  if (isMemberExpression(unwrapped)) {
    return pipe(
      rootIdentifier(unwrapped.object),
      Option.match({
        onNone: () => [],
        onSome: name => importedProvenance(imports, name),
      }),
    )
  }
  if (isFunctionLike(unwrapped)) {
    return pipe(
      importSourcesIn(unwrapped.body, imports),
      Arr.filterMap(source =>
        pipe(
          provenanceFromSource(source),
          Result.fromOption(() => undefined),
        ),
      ),
    )
  }
  return []
}

const isSceneSceneCall = (call: ESTree.CallExpression): boolean =>
  call.callee.type === 'MemberExpression' &&
  pipe(
    AST.memberPath(call.callee),
    Option.match({
      onNone: () => false,
      onSome: path =>
        path.length === 2 && path[0] === 'Scene' && path[1] === 'scene',
    }),
  )

const constObjectBinding = (
  node: ESTree.VariableDeclarator,
): Option.Option<ObjectBinding> => {
  const id = node.id
  const init = node.init
  if (!isIdentifier(id) || !isObjectExpression(init)) return Option.none()
  return pipe(
    parentOf(node),
    Option.filter(
      parent => isVariableDeclaration(parent) && parent.kind === 'const',
    ),
    Option.map(() => ({ local: id.name, object: init })),
  )
}

const resolveConfigObject = (
  arg: ESTree.Node,
  objects: ReadonlyArray<ObjectBinding>,
): Option.Option<ESTree.ObjectExpression> => {
  const unwrapped = unwrapExpression(arg)
  if (isObjectExpression(unwrapped)) return Option.some(unwrapped)
  return isIdentifier(unwrapped)
    ? pipe(
        objects,
        Arr.findFirst(binding => binding.local === unwrapped.name),
        Option.map(binding => binding.object),
      )
    : Option.none()
}

const sameWidget = (
  left: ReadonlyArray<Provenance>,
  right: ReadonlyArray<Provenance>,
): Option.Option<string> => {
  const leftWidgets = pipe(
    left,
    Arr.filterMap(provenance =>
      provenance.kind === 'widget'
        ? Result.succeed(provenance.widget)
        : Result.failVoid,
    ),
  )
  const rightWidgets = pipe(
    right,
    Arr.filterMap(provenance =>
      provenance.kind === 'widget'
        ? Result.succeed(provenance.widget)
        : Result.failVoid,
    ),
  )
  return pipe(
    leftWidgets,
    Arr.findFirst(widget => Arr.contains(rightWidgets, widget)),
  )
}

const violationReason = (
  updateProvenance: ReadonlyArray<Provenance>,
  viewProvenance: ReadonlyArray<Provenance>,
): Option.Option<string> => {
  const all = [...updateProvenance, ...viewProvenance]
  const page = pipe(
    all,
    Arr.findFirst(provenance => provenance.kind === 'page'),
  )
  if (Option.isSome(page)) {
    return Option.some(
      `Scene.scene config traces to page module \`${page.value.source}\``,
    )
  }
  return pipe(
    sameWidget(updateProvenance, viewProvenance),
    Option.map(
      widget =>
        `Scene.scene config isolates widget \`${widget}\` for both update and view`,
    ),
  )
}

const analyzeSceneCall = (
  ctx: RuleContext['Service'],
  call: ESTree.CallExpression,
  imports: ReadonlyArray<ImportBinding>,
  objects: ReadonlyArray<ObjectBinding>,
): Effect.Effect<void> => {
  const arg = call.arguments[0]
  if (arg === undefined || arg.type === 'SpreadElement') return Effect.void
  return pipe(
    resolveConfigObject(arg, objects),
    Option.flatMap(config =>
      Option.all({
        update: objectValue(config, 'update'),
        view: objectValue(config, 'view'),
      }),
    ),
    Option.flatMap(({ update, view }) =>
      violationReason(
        expressionProvenance(update, imports),
        expressionProvenance(view, imports),
      ),
    ),
    Option.match({
      onNone: () => Effect.void,
      onSome: reason =>
        ctx.report(
          Diagnostic.make({
            node: call,
            message: `${reason}. Scene tests must run from the root update and root view; child-isolation belongs in Story tests or pure render-helper tests with stub updates. (FK Scene)`,
          }),
        ),
    }),
  )
}

const rule: CreateRule = Rule.define({
  name: 'scene-tests-run-from-root',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Require Foldkit Scene.scene tests to use root update and root view instead of page/widget-isolated configs',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const importsRef = yield* Ref.make<ReadonlyArray<ImportBinding>>([])
    const objectsRef = yield* Ref.make<ReadonlyArray<ObjectBinding>>([])
    const sceneCallsRef = yield* Ref.make<ReadonlyArray<ESTree.CallExpression>>(
      [],
    )

    return yield* Visitor.filter(
      isTestFile,
      Visitor.merge(
        Visitor.on('ImportDeclaration', node =>
          Ref.update(importsRef, imports => [
            ...imports,
            ...importBindings(node),
          ]),
        ),
        Visitor.on('VariableDeclarator', node =>
          pipe(
            constObjectBinding(node),
            Option.match({
              onNone: () => Effect.void,
              onSome: binding =>
                Ref.update(objectsRef, objects => [...objects, binding]),
            }),
          ),
        ),
        Visitor.on('CallExpression', node =>
          isSceneSceneCall(node)
            ? Ref.update(sceneCallsRef, calls => [...calls, node])
            : Effect.void,
        ),
        Visitor.on('Program:exit', () =>
          Effect.gen(function* () {
            const imports = yield* Ref.get(importsRef)
            const objects = yield* Ref.get(objectsRef)
            const sceneCalls = yield* Ref.get(sceneCallsRef)
            yield* Effect.forEach(
              sceneCalls,
              call => analyzeSceneCall(ctx, call, imports, objects),
              { concurrency: 1, discard: true },
            )
          }),
        ),
      ),
    )
  },
})

export default rule
