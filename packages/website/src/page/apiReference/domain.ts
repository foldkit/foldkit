import {
  Array,
  Match,
  Option,
  Order,
  Predicate,
  Record,
  Schema,
  String,
  flow,
  pipe,
} from 'effect'

import {
  type NamedSchemas,
  reflectionFingerprint,
  typeDefFromChildren,
  typeToString,
} from './typeToString'
import {
  Kind,
  TypeDocCommentPart,
  type TypeDocItem,
  type TypeDocJson,
  type TypeDocModule,
  type TypeDocParam,
  type TypeDocType,
} from './typedoc'

// SCHEMA

const NullableString = Schema.OptionFromNullishOr(Schema.String, {
  onNoneEncoding: null,
})

export const ApiParameter = Schema.Struct({
  name: Schema.String,
  type: Schema.String,
  isOptional: Schema.Boolean,
  isRest: Schema.Boolean,
  defaultValue: NullableString,
  description: NullableString,
})
export type ApiParameter = typeof ApiParameter.Type

export const ApiFunctionSignature = Schema.Struct({
  parameters: Schema.Array(ApiParameter),
  returnType: Schema.String,
  typeParameters: Schema.Array(Schema.String),
})
export type ApiFunctionSignature = typeof ApiFunctionSignature.Type

export const ApiFunction = Schema.Struct({
  name: Schema.String,
  description: NullableString,
  signatures: Schema.Array(ApiFunctionSignature),
  sourceUrl: NullableString,
})
export type ApiFunction = typeof ApiFunction.Type

export const ApiType = Schema.Struct({
  name: Schema.String,
  description: NullableString,
  typeDefinition: Schema.String,
  sourceUrl: NullableString,
})
export type ApiType = typeof ApiType.Type

export const ApiVariable = Schema.Struct({
  name: Schema.String,
  description: NullableString,
  type: Schema.String,
  sourceUrl: NullableString,
})
export type ApiVariable = typeof ApiVariable.Type

export const ApiInterface = Schema.Struct({
  name: Schema.String,
  description: NullableString,
  typeDefinition: Schema.String,
  sourceUrl: NullableString,
})
export type ApiInterface = typeof ApiInterface.Type

export const ApiModule = Schema.Struct({
  name: Schema.String,
  functions: Schema.Array(ApiFunction),
  types: Schema.Array(ApiType),
  interfaces: Schema.Array(ApiInterface),
  variables: Schema.Array(ApiVariable),
})
export type ApiModule = typeof ApiModule.Type

export const ParsedApiReference = Schema.Struct({
  modules: Schema.Array(ApiModule),
})
export type ParsedApiReference = typeof ParsedApiReference.Type

// SHARED

export const SIGNATURE_COLLAPSE_THRESHOLD = 500

export const signaturesLength = (apiFunction: ApiFunction): number =>
  Array.reduce(
    apiFunction.signatures,
    0,
    (total, signature) =>
      total +
      pipe(signature.typeParameters, Array.join(', '), String.length) +
      Array.reduce(
        signature.parameters,
        0,
        (innerTotal, parameter) =>
          innerTotal +
          String.length(parameter.name) +
          String.length(parameter.type),
      ) +
      String.length(signature.returnType),
  )

export const scopedId = (
  kind: string,
  moduleName: string,
  name: string,
): string => `${kind}-${moduleName}/${name}`

// NOTE: highlight ids read `${kind}-${moduleName}/${name}`, and for items
// inside namespaces the name itself contains further slashes
// (`function-Http/Task/attempt`). The kind never contains a dash, so the id
// belongs to a module exactly when the segment after the first dash starts
// with `${moduleName}/`.
export const scopedIdBelongsToModule = (
  id: string,
  moduleName: string,
): boolean =>
  Option.exists(String.indexOf('-')(id), kindSeparatorIndex =>
    id.startsWith(`${moduleName}/`, kindSeparatorIndex + 1),
  )

export const sectionId = (moduleName: string, label: string): string =>
  `${moduleName}-${label.toLowerCase()}`

// NAMED SCHEMA

const isEffectStructReference = (type: TypeDocType): boolean =>
  type.type === 'reference' &&
  Predicate.isObject(type.target) &&
  type.target.qualifiedName === 'Struct' &&
  Predicate.isString(type.target.packagePath) &&
  type.target.packagePath.endsWith('Schema.ts')

const isReflectionType = (
  type: TypeDocType,
): type is Extract<TypeDocType, { type: 'reflection' }> =>
  type.type === 'reflection'

const findStructReflection = (
  type: TypeDocType,
): Option.Option<TypeDocItem> => {
  if (type.type !== 'reference') {
    return Option.none()
  }
  const arguments_ = type.typeArguments ?? []
  const direct = isEffectStructReference(type)
    ? pipe(
        arguments_,
        Array.head,
        Option.filter(isReflectionType),
        Option.flatMap(({ declaration }) => declaration),
      )
    : Option.none()
  return Option.orElse(direct, () =>
    pipe(
      arguments_,
      Array.flatMap(flow(findStructReflection, Array.fromOption)),
      Array.head,
    ),
  )
}

const variableQualifiedName = (
  modulePath: string,
  variableName: string,
): string =>
  pipe(
    modulePath,
    String.split('/'),
    Array.last,
    Option.getOrElse(() => modulePath),
    namespace => `${namespace}.${variableName}`,
  )

type FingerprintEntry = readonly [string, string]

const itemFingerprintEntries = (
  qualifiedName: string,
  item: TypeDocItem,
): ReadonlyArray<FingerprintEntry> =>
  pipe(
    item.type,
    Option.flatMap(findStructReflection),
    Option.flatMap(({ children }) => children),
    Option.filter(Array.isReadonlyArrayNonEmpty),
    Option.match({
      onNone: () => [],
      onSome: children => [[reflectionFingerprint(children), qualifiedName]],
    }),
  )

const collectFromItems = (
  modulePath: string,
  items: ReadonlyArray<TypeDocItem>,
): ReadonlyArray<FingerprintEntry> =>
  Array.flatMap(items, item =>
    Match.value(item.kind).pipe(
      Match.when(Kind.Variable, () =>
        itemFingerprintEntries(
          variableQualifiedName(modulePath, item.name),
          item,
        ),
      ),
      Match.when(Kind.Namespace, () =>
        Option.match(item.children, {
          onNone: () => [],
          onSome: children =>
            collectFromItems(`${modulePath}/${item.name}`, children),
        }),
      ),
      Match.orElse(() => []),
    ),
  )

export const collectNamedSchemas = (json: TypeDocJson): NamedSchemas => {
  const entries = Array.flatMap(json.children, module =>
    collectFromItems(module.name, module.children),
  )
  const counts = Array.reduce(
    entries,
    new Map<string, number>(),
    (acc, [fingerprint]) =>
      acc.set(fingerprint, (acc.get(fingerprint) ?? 0) + 1),
  )
  return new Map(
    Array.filter(entries, ([fingerprint]) => counts.get(fingerprint) === 1),
  )
}

// PARSE

const partsToSummaryText = (
  parts: ReadonlyArray<TypeDocCommentPart>,
): Option.Option<string> =>
  pipe(
    Array.map(parts, ({ text }) => text),
    Array.join(''),
    String.trim,
    Option.liftPredicate(String.isNonEmpty),
  )

const itemToDescription = (item: TypeDocItem): Option.Option<string> =>
  pipe(
    item.comment,
    Option.flatMap(comment => comment.summary),
    Option.flatMap(partsToSummaryText),
  )

const itemToSourceUrl = (item: TypeDocItem): Option.Option<string> =>
  pipe(
    item.sources,
    Option.flatMap(Array.head),
    Option.flatMap(({ url }) => url),
  )

const signatureToDescription = (item: TypeDocItem): Option.Option<string> =>
  pipe(
    item.signatures,
    Option.flatMap(Array.head),
    Option.flatMap(({ comment }) => comment),
    Option.flatMap(comment => comment.summary),
    Option.flatMap(partsToSummaryText),
  )

const parseParameter =
  (namedSchemas: NamedSchemas) =>
  (parameter: TypeDocParam): ApiParameter => ({
    name: parameter.name,
    type: typeToString(parameter.type, 0, namedSchemas),
    isOptional: parameter.flags.isOptional,
    isRest: parameter.flags.isRest,
    defaultValue: parameter.defaultValue,
    description: pipe(
      parameter.comment,
      Option.flatMap(comment => comment.summary),
      Option.flatMap(partsToSummaryText),
    ),
  })

const parseSignatures = (
  namedSchemas: NamedSchemas,
  item: TypeDocItem,
): ReadonlyArray<ApiFunctionSignature> =>
  Option.match(item.signatures, {
    onNone: () => [],
    onSome: Array.map(signature => ({
      parameters: Option.match(signature.parameters, {
        onNone: () => [],
        onSome: Array.map(parseParameter(namedSchemas)),
      }),
      returnType: typeToString(signature.type, 0, namedSchemas),
      typeParameters: Option.match(signature.typeParameters, {
        onNone: () => [],
        onSome: Array.map(({ name }) => name),
      }),
    })),
  })

const parseFunction =
  (namedSchemas: NamedSchemas) =>
  (item: TypeDocItem): ApiFunction => ({
    name: item.name,
    description: signatureToDescription(item),
    sourceUrl: itemToSourceUrl(item),
    signatures: parseSignatures(namedSchemas, item),
  })

const parseType =
  (namedSchemas: NamedSchemas) =>
  (item: TypeDocItem): ApiType => ({
    name: item.name,
    description: itemToDescription(item),
    typeDefinition: Option.match(item.type, {
      onNone: () => typeDefFromChildren(item.children, namedSchemas),
      onSome: () => typeToString(item.type, 0, namedSchemas),
    }),
    sourceUrl: itemToSourceUrl(item),
  })

const parseInterface =
  (namedSchemas: NamedSchemas) =>
  (item: TypeDocItem): ApiInterface => ({
    name: item.name,
    description: itemToDescription(item),
    typeDefinition: typeDefFromChildren(item.children, namedSchemas),
    sourceUrl: itemToSourceUrl(item),
  })

const parseVariable =
  (namedSchemas: NamedSchemas) =>
  (item: TypeDocItem): ApiVariable => ({
    name: item.name,
    description: itemToDescription(item),
    type: typeToString(item.type, 0, namedSchemas),
    sourceUrl: itemToSourceUrl(item),
  })

const parseItemsAsModule = (
  namedSchemas: NamedSchemas,
  name: string,
  children: ReadonlyArray<TypeDocItem>,
): ApiModule => ({
  name,
  functions: pipe(
    children,
    Array.filter(item => item.kind === Kind.Function),
    Array.map(parseFunction(namedSchemas)),
    Array.sort(byName()),
  ),
  types: pipe(
    children,
    Array.filter(
      ({ kind, type }) =>
        kind === Kind.TypeAlias &&
        !Option.exists(type, ({ type }) => type === 'query'),
    ),
    Array.map(parseType(namedSchemas)),
    Array.sort(byName()),
  ),
  interfaces: pipe(
    children,
    Array.filter(item => item.kind === Kind.Interface),
    Array.map(parseInterface(namedSchemas)),
    Array.sort(byName()),
  ),
  variables: pipe(
    children,
    Array.filter(item => item.kind === Kind.Variable),
    Array.map(parseVariable(namedSchemas)),
    Array.sort(byName()),
  ),
})

const collectModules = (
  namedSchemas: NamedSchemas,
  qualifiedName: string,
  children: ReadonlyArray<TypeDocItem>,
): ReadonlyArray<ApiModule> => {
  const namespaces = Array.filter(
    children,
    ({ kind }) => kind === Kind.Namespace,
  )
  const directChildren = Array.filter(
    children,
    ({ kind }) => kind !== Kind.Namespace,
  )

  const nestedModules = Array.flatMap(namespaces, namespace =>
    Option.match(namespace.children, {
      onNone: () => [],
      onSome: namespaceChildren =>
        collectModules(
          namedSchemas,
          `${qualifiedName}/${namespace.name}`,
          namespaceChildren,
        ),
    }),
  )

  return Array.match(directChildren, {
    onEmpty: () => nestedModules,
    onNonEmpty: () => [
      parseItemsAsModule(namedSchemas, qualifiedName, directChildren),
      ...nestedModules,
    ],
  })
}

const parseModule = (
  namedSchemas: NamedSchemas,
  module: TypeDocModule,
): ReadonlyArray<ApiModule> =>
  collectModules(namedSchemas, module.name, module.children)

export const parseTypedocJson = (json: TypeDocJson): ParsedApiReference => {
  const namedSchemas = collectNamedSchemas(json)
  return {
    modules: Array.flatMap(json.children, module =>
      parseModule(namedSchemas, module),
    ),
  }
}

export type TableOfContentsEntry = {
  readonly id: string
  readonly text: string
  readonly level: 'h2' | 'h3' | 'h4'
}

const byName = <T extends { readonly name: string }>(): Order.Order<T> =>
  Order.mapInput(Order.String, ({ name }: T) => name)

const sortByName = Array.sort(byName())

const sectionEntries = <T extends { readonly name: string }>(
  moduleName: string,
  label: string,
  items: ReadonlyArray<T>,
  idPrefix: string,
): ReadonlyArray<TableOfContentsEntry> =>
  Array.match(items, {
    onEmpty: () => [],
    onNonEmpty: () => [
      {
        id: sectionId(moduleName, label),
        text: label,
        level: 'h2' as const,
      },
      ...pipe(
        items,
        sortByName,
        Array.map(item => ({
          id: `${idPrefix}-${moduleName}/${item.name}`,
          text: item.name,
          level: 'h3' as const,
        })),
      ),
    ],
  })

export const toModuleTableOfContents = (
  module: ApiModule,
): ReadonlyArray<TableOfContentsEntry> => [
  ...sectionEntries(module.name, 'Functions', module.functions, 'function'),
  ...sectionEntries(module.name, 'Types', module.types, 'type'),
  ...sectionEntries(module.name, 'Interfaces', module.interfaces, 'interface'),
  ...sectionEntries(module.name, 'Constants', module.variables, 'const'),
]

const pascalToKebab = (text: string): string =>
  text.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

export const moduleNameToSlug = (name: string): string =>
  pipe(name, String.replaceAll('/', '-'), pascalToKebab)

export const slugToModuleName = (slug: string): string =>
  pipe(slug, String.split('-'), Array.map(String.capitalize), Array.join(''))

const modulesBySlug = (
  modules: ReadonlyArray<ApiModule>,
): Record<string, ApiModule> =>
  Record.fromIterableBy(modules, module => moduleNameToSlug(module.name))

export const resolveModule = (
  parsedApi: ParsedApiReference,
  slug: string,
): Option.Option<ApiModule> =>
  Record.get(modulesBySlug(parsedApi.modules), slug)
