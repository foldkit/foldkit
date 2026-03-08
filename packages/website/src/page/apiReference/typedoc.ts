import { Option, Schema as S } from 'effect'

export const TypeDocFlags = S.Struct({
  isOptional: S.optionalWith(S.Boolean, { default: () => false }),
  isPrivate: S.optionalWith(S.Boolean, { default: () => false }),
  isProtected: S.optionalWith(S.Boolean, { default: () => false }),
  isStatic: S.optionalWith(S.Boolean, { default: () => false }),
})

export type TypeDocFlags = typeof TypeDocFlags.Type

const defaultFlags: TypeDocFlags = {
  isOptional: false,
  isPrivate: false,
  isProtected: false,
  isStatic: false,
}

export const TypeDocCommentPart = S.Struct({
  kind: S.String,
  text: S.String,
})

export type TypeDocCommentPart = typeof TypeDocCommentPart.Type

export const TypeDocBlockTag = S.Struct({
  tag: S.String,
  content: S.Array(TypeDocCommentPart),
})

export type TypeDocBlockTag = typeof TypeDocBlockTag.Type

export const TypeDocComment = S.Struct({
  summary: S.OptionFromUndefinedOr(S.Array(TypeDocCommentPart)),
  blockTags: S.OptionFromUndefinedOr(S.Array(TypeDocBlockTag)),
})

export type TypeDocComment = typeof TypeDocComment.Type

export const TypeDocSource = S.Struct({
  fileName: S.String,
  line: S.Number,
  character: S.Number,
  url: S.OptionFromUndefinedOr(S.String),
})

export type TypeDocSource = typeof TypeDocSource.Type

type TypeDocIntrinsicType = Readonly<{
  type: 'intrinsic'
  name: string
}>

type TypeDocLiteralType = Readonly<{
  type: 'literal'
  value: unknown
}>

interface TypeDocReferenceType<Self> {
  readonly type: 'reference'
  readonly name: string
  readonly package?: string | undefined
  readonly typeArguments?: ReadonlyArray<Self> | undefined
}

interface TypeDocArrayType<Self> {
  readonly type: 'array'
  readonly elementType: Self
}

interface TypeDocTupleType<Self> {
  readonly type: 'tuple'
  readonly elements: ReadonlyArray<Self>
}

interface TypeDocUnionType<Self> {
  readonly type: 'union'
  readonly types: ReadonlyArray<Self>
}

interface TypeDocIntersectionType<Self> {
  readonly type: 'intersection'
  readonly types: ReadonlyArray<Self>
}

interface TypeDocReflectionType<Declaration> {
  readonly type: 'reflection'
  readonly declaration: Declaration
}

interface TypeDocTypeOperatorType<Self> {
  readonly type: 'typeOperator'
  readonly operator: string
  readonly target: Self
}

interface TypeDocMappedType<Self> {
  readonly type: 'mapped'
  readonly parameter: string
  readonly parameterType: Self
  readonly templateType: Self
  readonly readonlyModifier?: string | undefined
}

interface TypeDocConditionalType<Self> {
  readonly type: 'conditional'
  readonly checkType: Self
  readonly extendsType: Self
  readonly trueType: Self
  readonly falseType: Self
}

interface TypeDocIndexedAccessType<Self> {
  readonly type: 'indexedAccess'
  readonly objectType: Self
  readonly indexType: Self
}

interface TypeDocQueryType<Self> {
  readonly type: 'query'
  readonly queryType: Self
}

type TypeDocInferredType = Readonly<{
  type: 'inferred'
  name: string
}>

type TypeDocPredicateType = Readonly<{
  type: 'predicate'
}>

type TypeDocUnknownType = Readonly<{
  type: 'unknown'
}>

export type TypeDocType =
  | TypeDocIntrinsicType
  | TypeDocLiteralType
  | TypeDocReferenceType<TypeDocType>
  | TypeDocArrayType<TypeDocType>
  | TypeDocTupleType<TypeDocType>
  | TypeDocUnionType<TypeDocType>
  | TypeDocIntersectionType<TypeDocType>
  | TypeDocReflectionType<Option.Option<TypeDocItem>>
  | TypeDocTypeOperatorType<TypeDocType>
  | TypeDocMappedType<TypeDocType>
  | TypeDocConditionalType<TypeDocType>
  | TypeDocIndexedAccessType<TypeDocType>
  | TypeDocQueryType<TypeDocType>
  | TypeDocInferredType
  | TypeDocPredicateType
  | TypeDocUnknownType

// NOTE: Manual type definitions are required here because TypeScript cannot infer
// types from mutually recursive schemas (TypeDocType ↔ TypeDocItem via S.suspend).
type TypeDocTypeEncoded =
  | TypeDocIntrinsicType
  | TypeDocLiteralType
  | TypeDocReferenceType<TypeDocTypeEncoded>
  | TypeDocArrayType<TypeDocTypeEncoded>
  | TypeDocTupleType<TypeDocTypeEncoded>
  | TypeDocUnionType<TypeDocTypeEncoded>
  | TypeDocIntersectionType<TypeDocTypeEncoded>
  | TypeDocReflectionType<TypeDocItemEncoded | undefined>
  | TypeDocTypeOperatorType<TypeDocTypeEncoded>
  | TypeDocMappedType<TypeDocTypeEncoded>
  | TypeDocConditionalType<TypeDocTypeEncoded>
  | TypeDocIndexedAccessType<TypeDocTypeEncoded>
  | TypeDocQueryType<TypeDocTypeEncoded>
  | TypeDocInferredType
  | TypeDocPredicateType
  | TypeDocUnknownType

export const TypeDocTypeSchema: S.Schema<TypeDocType, TypeDocTypeEncoded> =
  S.suspend(() =>
    S.Union(
      S.Struct({ type: S.Literal('intrinsic'), name: S.String }),
      S.Struct({ type: S.Literal('literal'), value: S.Unknown }),
      S.Struct({
        type: S.Literal('reference'),
        name: S.String,
        package: S.optional(S.String),
        typeArguments: S.optional(S.Array(TypeDocTypeSchema)),
      }),
      S.Struct({
        type: S.Literal('array'),
        elementType: TypeDocTypeSchema,
      }),
      S.Struct({
        type: S.Literal('tuple'),
        elements: S.Array(TypeDocTypeSchema),
      }),
      S.Struct({
        type: S.Literal('union'),
        types: S.Array(TypeDocTypeSchema),
      }),
      S.Struct({
        type: S.Literal('intersection'),
        types: S.Array(TypeDocTypeSchema),
      }),
      S.Struct({
        type: S.Literal('reflection'),
        declaration: S.OptionFromUndefinedOr(TypeDocItem),
      }),
      S.Struct({
        type: S.Literal('typeOperator'),
        operator: S.String,
        target: TypeDocTypeSchema,
      }),
      S.Struct({
        type: S.Literal('mapped'),
        parameter: S.String,
        parameterType: TypeDocTypeSchema,
        templateType: TypeDocTypeSchema,
        readonlyModifier: S.optional(S.String),
      }),
      S.Struct({
        type: S.Literal('conditional'),
        checkType: TypeDocTypeSchema,
        extendsType: TypeDocTypeSchema,
        trueType: TypeDocTypeSchema,
        falseType: TypeDocTypeSchema,
      }),
      S.Struct({
        type: S.Literal('indexedAccess'),
        objectType: TypeDocTypeSchema,
        indexType: TypeDocTypeSchema,
      }),
      S.Struct({
        type: S.Literal('query'),
        queryType: TypeDocTypeSchema,
      }),
      S.Struct({ type: S.Literal('inferred'), name: S.String }),
      S.Struct({ type: S.Literal('predicate') }),
      S.Struct({ type: S.Literal('unknown') }),
    ),
  )

export const TypeDocTypeParam = S.Struct({
  id: S.Number,
  name: S.String,
  variant: S.String,
  kind: S.Number,
  type: S.OptionFromUndefinedOr(TypeDocTypeSchema),
  default: S.OptionFromUndefinedOr(TypeDocTypeSchema),
})

export type TypeDocTypeParam = typeof TypeDocTypeParam.Type

export const TypeDocParam = S.Struct({
  id: S.Number,
  name: S.String,
  variant: S.String,
  kind: S.Number,
  flags: S.optionalWith(TypeDocFlags, {
    default: () => defaultFlags,
  }),
  type: S.OptionFromUndefinedOr(TypeDocTypeSchema),
  defaultValue: S.OptionFromUndefinedOr(S.String),
  comment: S.OptionFromUndefinedOr(TypeDocComment),
})

export type TypeDocParam = typeof TypeDocParam.Type

export const TypeDocSignature = S.Struct({
  id: S.Number,
  name: S.String,
  variant: S.String,
  kind: S.Number,
  comment: S.OptionFromUndefinedOr(TypeDocComment),
  parameters: S.OptionFromUndefinedOr(S.Array(TypeDocParam)),
  type: S.OptionFromUndefinedOr(TypeDocTypeSchema),
  typeParameters: S.OptionFromUndefinedOr(S.Array(TypeDocTypeParam)),
})

export type TypeDocSignature = typeof TypeDocSignature.Type

const typeDocItemFields = {
  id: S.Number,
  name: S.String,
  variant: S.String,
  kind: S.Number,
  flags: S.optionalWith(TypeDocFlags, {
    default: () => defaultFlags,
  }),
  comment: S.OptionFromUndefinedOr(TypeDocComment),
  sources: S.OptionFromUndefinedOr(S.Array(TypeDocSource)),
  signatures: S.OptionFromUndefinedOr(S.Array(TypeDocSignature)),
  typeParameters: S.OptionFromUndefinedOr(S.Array(TypeDocTypeParam)),
}

export interface TypeDocItem extends S.Struct.Type<typeof typeDocItemFields> {
  readonly type: Option.Option<TypeDocType>
  readonly children: Option.Option<ReadonlyArray<TypeDocItem>>
}

interface TypeDocItemEncoded extends S.Struct.Encoded<
  typeof typeDocItemFields
> {
  readonly type: TypeDocTypeEncoded | undefined
  readonly children: ReadonlyArray<TypeDocItemEncoded> | undefined
}

export const TypeDocItem = S.Struct({
  ...typeDocItemFields,
  type: S.OptionFromUndefinedOr(TypeDocTypeSchema),
  children: S.OptionFromUndefinedOr(
    S.Array(
      S.suspend((): S.Schema<TypeDocItem, TypeDocItemEncoded> => TypeDocItem),
    ),
  ),
})

export const TypeDocModule = S.Struct({
  id: S.Number,
  name: S.String,
  variant: S.String,
  kind: S.Number,
  children: S.optionalWith(S.Array(TypeDocItem), {
    default: () => [],
  }),
})

export type TypeDocModule = typeof TypeDocModule.Type

export const TypeDocJson = S.Struct({
  schemaVersion: S.String,
  id: S.Number,
  name: S.String,
  variant: S.String,
  kind: S.Number,
  children: S.Array(TypeDocModule),
})

export type TypeDocJson = typeof TypeDocJson.Type

export const Kind = {
  Project: 1,
  Module: 2,
  Namespace: 4,
  Enum: 8,
  EnumMember: 16,
  Variable: 32,
  Function: 64,
  Class: 128,
  Interface: 256,
  Constructor: 512,
  Property: 1024,
  Method: 2048,
  CallSignature: 4096,
  IndexSignature: 8192,
  ConstructorSignature: 16384,
  Parameter: 32768,
  TypeLiteral: 65536,
  TypeParameter: 131072,
  Accessor: 262144,
  GetSignature: 524288,
  SetSignature: 1048576,
  TypeAlias: 2097152,
  Reference: 4194304,
}
