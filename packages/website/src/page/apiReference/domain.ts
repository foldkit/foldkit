import {
  Array,
  Option,
  Order,
  Schema as S,
  String,
  pipe,
} from 'effect'

import { typeDefFromChildren, typeToString } from './typeToString'
import {
  Kind,
  TypeDocCommentPart,
  type TypeDocItem,
  type TypeDocJson,
  type TypeDocModule,
  type TypeDocParam,
} from './typedoc'

// SCHEMA

export const ApiParameter = S.Struct({
  name: S.String,
  type: S.String,
  isOptional: S.Boolean,
  defaultValue: S.Option(S.String),
  description: S.Option(S.String),
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
  description: S.Option(S.String),
  signatures: S.Array(ApiFunctionSignature),
  sourceUrl: S.Option(S.String),
})

export type ApiFunction = typeof ApiFunction.Type

export const ApiType = S.Struct({
  name: S.String,
  description: S.Option(S.String),
  typeDefinition: S.String,
  sourceUrl: S.Option(S.String),
})

export type ApiType = typeof ApiType.Type

export const ApiVariable = S.Struct({
  name: S.String,
  description: S.Option(S.String),
  type: S.String,
  sourceUrl: S.Option(S.String),
})

export type ApiVariable = typeof ApiVariable.Type

export const ApiInterface = S.Struct({
  name: S.String,
  description: S.Option(S.String),
  typeDefinition: S.String,
  sourceUrl: S.Option(S.String),
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
      pipe(
        signature.typeParameters,
        Array.join(', '),
        String.length,
      ) +
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

const itemToDescription = (
  item: TypeDocItem,
): Option.Option<string> =>
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

const signatureToDescription = (
  item: TypeDocItem,
): Option.Option<string> =>
  pipe(
    item.signatures,
    Option.flatMap(Array.head),
    Option.flatMap(({ comment }) => comment),
    Option.flatMap(comment => comment.summary),
    Option.flatMap(partsToSummaryText),
  )

const parseParameter = (parameter: TypeDocParam): ApiParameter => ({
  name: parameter.name,
  type: typeToString(parameter.type),
  isOptional: parameter.flags.isOptional,
  defaultValue: parameter.defaultValue,
  description: pipe(
    parameter.comment,
    Option.flatMap(comment => comment.summary),
    Option.flatMap(partsToSummaryText),
  ),
})

const parseSignatures = (
  item: TypeDocItem,
): ReadonlyArray<ApiFunctionSignature> =>
  Option.match(item.signatures, {
    onNone: () => [],
    onSome: Array.map(signature => ({
      parameters: Option.match(signature.parameters, {
        onNone: () => [],
        onSome: Array.map(parseParameter),
      }),
      returnType: typeToString(signature.type),
      typeParameters: Option.match(signature.typeParameters, {
        onNone: () => [],
        onSome: Array.map(({ name }) => name),
      }),
    })),
  })

const parseFunction = (item: TypeDocItem): ApiFunction => ({
  name: item.name,
  description: signatureToDescription(item),
  sourceUrl: itemToSourceUrl(item),
  signatures: parseSignatures(item),
})

const parseType = (item: TypeDocItem): ApiType => ({
  name: item.name,
  description: itemToDescription(item),
  typeDefinition: Option.match(item.type, {
    onNone: () => typeDefFromChildren(item.children),
    onSome: () => typeToString(item.type),
  }),
  sourceUrl: itemToSourceUrl(item),
})

const parseInterface = (item: TypeDocItem): ApiInterface => ({
  name: item.name,
  description: itemToDescription(item),
  typeDefinition: typeDefFromChildren(item.children),
  sourceUrl: itemToSourceUrl(item),
})

const parseVariable = (item: TypeDocItem): ApiVariable => ({
  name: item.name,
  description: itemToDescription(item),
  type: typeToString(item.type),
  sourceUrl: itemToSourceUrl(item),
})

const parseItemsAsModule = (
  name: string,
  children: ReadonlyArray<TypeDocItem>,
): ApiModule => ({
  name,
  functions: pipe(
    children,
    Array.filter(item => item.kind === Kind.Function),
    Array.map(parseFunction),
    Array.sort(byName()),
  ),
  types: pipe(
    children,
    Array.filter(
      ({ kind, type }) =>
        kind === Kind.TypeAlias &&
        !Option.exists(type, ({ type }) => type === 'query'),
    ),
    Array.map(parseType),
    Array.sort(byName()),
  ),
  interfaces: pipe(
    children,
    Array.filter(item => item.kind === Kind.Interface),
    Array.map(parseInterface),
    Array.sort(byName()),
  ),
  variables: pipe(
    children,
    Array.filter(item => item.kind === Kind.Variable),
    Array.map(parseVariable),
    Array.sort(byName()),
  ),
})

const parseModule = (
  module: TypeDocModule,
): ReadonlyArray<ApiModule> => {
  const namespaces = Array.filter(
    module.children,
    ({ kind }) => kind === Kind.Namespace,
  )
  const directChildren = Array.filter(
    module.children,
    ({ kind }) => kind !== Kind.Namespace,
  )

  const namespaceModules = Array.flatMap(namespaces, namespace =>
    Option.match(namespace.children, {
      onNone: () => [],
      onSome: children => [
        parseItemsAsModule(
          `${module.name}/${namespace.name}`,
          children,
        ),
      ],
    }),
  )

  return Array.match(directChildren, {
    onEmpty: () => namespaceModules,
    onNonEmpty: () => [
      parseItemsAsModule(module.name, directChildren),
      ...namespaceModules,
    ],
  })
}

export const parseTypedocJson = (
  json: TypeDocJson,
): ParsedApiReference => ({
  modules: Array.flatMap(json.children, parseModule),
})

export type TableOfContentsEntry = {
  readonly id: string
  readonly text: string
  readonly level: 'h2' | 'h3' | 'h4'
}

const byName = <
  T extends { readonly name: string },
>(): Order.Order<T> =>
  Order.mapInput(Order.string, ({ name }: T) => name)

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
        id: `${moduleName}-${label.toLowerCase()}`,
        text: label,
        level: 'h3' as const,
      },
      ...pipe(
        items,
        sortByName,
        Array.map(item => ({
          id: `${idPrefix}-${moduleName}/${item.name}`,
          text: item.name,
          level: 'h4' as const,
        })),
      ),
    ],
  })

export const toTableOfContents = (
  parsed: ParsedApiReference,
): ReadonlyArray<TableOfContentsEntry> =>
  Array.flatMap(parsed.modules, module => [
    { id: module.name, text: module.name, level: 'h2' as const },
    ...sectionEntries(
      module.name,
      'Functions',
      module.functions,
      'function',
    ),
    ...sectionEntries(module.name, 'Types', module.types, 'type'),
    ...sectionEntries(
      module.name,
      'Interfaces',
      module.interfaces,
      'interface',
    ),
    ...sectionEntries(
      module.name,
      'Constants',
      module.variables,
      'const',
    ),
  ])
