import {
  Array,
  Match as M,
  Option,
  Order,
  Predicate,
  Schema as S,
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

const NullableString = S.OptionFromNullishOr(S.String, {
  onNoneEncoding: null,
})

export const ApiParameter = S.Struct({
  name: S.String,
  type: S.String,
  isOptional: S.Boolean,
  isRest: S.Boolean,
  defaultValue: NullableString,
  description: NullableString,
})

export type ApiParameter = typeof ApiParameter.Type

export const ApiFunctionSignature = S.Struct({
  parameters: S.Array(ApiParameter),
  returnType: S.String,
  typeParameters: S.Array(S.String),
})

export type ApiFunctionSignature = typeof ApiFunctionSignature.Type

export const ApiFunction = S.Struct({
  name: S.String,
  description: NullableString,
  signatures: S.Array(ApiFunctionSignature),
  sourceUrl: NullableString,
})

export type ApiFunction = typeof ApiFunction.Type

export const ApiType = S.Struct({
  name: S.String,
  description: NullableString,
  typeDefinition: S.String,
  sourceUrl: NullableString,
})

export type ApiType = typeof ApiType.Type

export const ApiVariable = S.Struct({
  name: S.String,
  description: NullableString,
  type: S.String,
  sourceUrl: NullableString,
})

export type ApiVariable = typeof ApiVariable.Type

export const ApiInterface = S.Struct({
  name: S.String,
  description: NullableString,
  typeDefinition: S.String,
  sourceUrl: NullableString,
})

export type ApiInterface = typeof ApiInterface.Type

export const ApiModule = S.Struct({
  name: S.String,
  functions: S.Array(ApiFunction),
  types: S.Array(ApiType),
  interfaces: S.Array(ApiInterface),
  variables: S.Array(ApiVariable),
})

export type ApiModule = typeof ApiModule.Type

export const ParsedApiReference = S.Struct({
  modules: S.Array(ApiModule),
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
    M.value(item.kind).pipe(
      M.when(Kind.Variable, () =>
        itemFingerprintEntries(
          variableQualifiedName(modulePath, item.name),
          item,
        ),
      ),
      M.when(Kind.Namespace, () =>
        Option.match(item.children, {
          onNone: () => [],
          onSome: children =>
            collectFromItems(`${modulePath}/${item.name}`, children),
        }),
      ),
      M.orElse(() => []),
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
