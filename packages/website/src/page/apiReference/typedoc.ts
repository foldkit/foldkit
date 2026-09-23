import { Effect, Option, Schema } from 'effect'

export const TypeDocFlags = Schema.Struct({
  isOptional: Schema.Boolean.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(false)),
  ),
  isPrivate: Schema.Boolean.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(false)),
  ),
  isProtected: Schema.Boolean.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(false)),
  ),
  isRest: Schema.Boolean.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(false)),
  ),
  isStatic: Schema.Boolean.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(false)),
  ),
})
export type TypeDocFlags = typeof TypeDocFlags.Type

const defaultFlags: TypeDocFlags = {
  isOptional: false,
  isPrivate: false,
  isProtected: false,
  isRest: false,
  isStatic: false,
}

export const TypeDocCommentPart = Schema.Struct({
  kind: Schema.String,
  text: Schema.String,
})
export type TypeDocCommentPart = typeof TypeDocCommentPart.Type

export const TypeDocBlockTag = Schema.Struct({
  tag: Schema.String,
  content: Schema.Array(TypeDocCommentPart),
})
export type TypeDocBlockTag = typeof TypeDocBlockTag.Type

export const TypeDocComment = Schema.Struct({
  summary: Schema.OptionFromOptional(Schema.Array(TypeDocCommentPart)),
  blockTags: Schema.OptionFromOptional(Schema.Array(TypeDocBlockTag)),
})
export type TypeDocComment = typeof TypeDocComment.Type

export const TypeDocSource = Schema.Struct({
  fileName: Schema.String,
  line: Schema.Number,
  character: Schema.Number,
  url: Schema.OptionFromOptional(Schema.String),
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

type TypeDocReferenceTarget =
  | number
  | Readonly<{
      packageName?: string | undefined
      packagePath?: string | undefined
      qualifiedName?: string | undefined
    }>

interface TypeDocReferenceType<Self> {
  readonly type: 'reference'
  readonly name: string
  readonly package?: string | undefined
  readonly target?: TypeDocReferenceTarget | undefined
  readonly typeArguments?: ReadonlyArray<Self> | undefined
}

interface TypeDocArrayType<Self> {
  readonly type: 'array'
  readonly elementType: Self
}

interface TypeDocRestType<Self> {
  readonly type: 'rest'
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

interface TypeDocTemplateLiteralType<Self> {
  readonly type: 'templateLiteral'
  readonly head: string
  readonly tail: ReadonlyArray<readonly [Self, string]>
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
  | TypeDocRestType<TypeDocType>
  | TypeDocTupleType<TypeDocType>
  | TypeDocUnionType<TypeDocType>
  | TypeDocIntersectionType<TypeDocType>
  | TypeDocReflectionType<Option.Option<TypeDocItem>>
  | TypeDocTypeOperatorType<TypeDocType>
  | TypeDocMappedType<TypeDocType>
  | TypeDocConditionalType<TypeDocType>
  | TypeDocIndexedAccessType<TypeDocType>
  | TypeDocQueryType<TypeDocType>
  | TypeDocTemplateLiteralType<TypeDocType>
  | TypeDocInferredType
  | TypeDocPredicateType
  | TypeDocUnknownType

// NOTE: Manual type definitions are required here because TypeScript cannot infer
// types from mutually recursive schemas (TypeDocType ↔ TypeDocItem via Schema.suspend).
type TypeDocTypeEncoded =
  | TypeDocIntrinsicType
  | TypeDocLiteralType
  | TypeDocReferenceType<TypeDocTypeEncoded>
  | TypeDocArrayType<TypeDocTypeEncoded>
  | TypeDocRestType<TypeDocTypeEncoded>
  | TypeDocTupleType<TypeDocTypeEncoded>
  | TypeDocUnionType<TypeDocTypeEncoded>
  | TypeDocIntersectionType<TypeDocTypeEncoded>
  | TypeDocReflectionType<TypeDocItemEncoded>
  | TypeDocTypeOperatorType<TypeDocTypeEncoded>
  | TypeDocMappedType<TypeDocTypeEncoded>
  | TypeDocConditionalType<TypeDocTypeEncoded>
  | TypeDocIndexedAccessType<TypeDocTypeEncoded>
  | TypeDocQueryType<TypeDocTypeEncoded>
  | TypeDocTemplateLiteralType<TypeDocTypeEncoded>
  | TypeDocInferredType
  | TypeDocPredicateType
  | TypeDocUnknownType

/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
export const TypeDocTypeSchema = Schema.suspend(() =>
  Schema.Union([
    Schema.Struct({ type: Schema.Literal('intrinsic'), name: Schema.String }),
    Schema.Struct({ type: Schema.Literal('literal'), value: Schema.Unknown }),
    Schema.Struct({
      type: Schema.Literal('reference'),
      name: Schema.String,
      package: Schema.optional(Schema.String),
      target: Schema.optional(
        Schema.Union([
          Schema.Number,
          Schema.Struct({
            packageName: Schema.optional(Schema.String),
            packagePath: Schema.optional(Schema.String),
            qualifiedName: Schema.optional(Schema.String),
          }),
        ]),
      ),
      typeArguments: Schema.optional(Schema.Array(TypeDocTypeSchema)),
    }),
    Schema.Struct({
      type: Schema.Literal('array'),
      elementType: TypeDocTypeSchema,
    }),
    Schema.Struct({
      type: Schema.Literal('rest'),
      elementType: TypeDocTypeSchema,
    }),
    Schema.Struct({
      type: Schema.Literal('tuple'),
      elements: Schema.Array(TypeDocTypeSchema),
    }),
    Schema.Struct({
      type: Schema.Literal('union'),
      types: Schema.Array(TypeDocTypeSchema),
    }),
    Schema.Struct({
      type: Schema.Literal('intersection'),
      types: Schema.Array(TypeDocTypeSchema),
    }),
    Schema.Struct({
      type: Schema.Literal('reflection'),
      declaration: Schema.OptionFromOptional(TypeDocItem),
    }),
    Schema.Struct({
      type: Schema.Literal('typeOperator'),
      operator: Schema.String,
      target: TypeDocTypeSchema,
    }),
    Schema.Struct({
      type: Schema.Literal('mapped'),
      parameter: Schema.String,
      parameterType: TypeDocTypeSchema,
      templateType: TypeDocTypeSchema,
      readonlyModifier: Schema.optional(Schema.String),
    }),
    Schema.Struct({
      type: Schema.Literal('conditional'),
      checkType: TypeDocTypeSchema,
      extendsType: TypeDocTypeSchema,
      trueType: TypeDocTypeSchema,
      falseType: TypeDocTypeSchema,
    }),
    Schema.Struct({
      type: Schema.Literal('indexedAccess'),
      objectType: TypeDocTypeSchema,
      indexType: TypeDocTypeSchema,
    }),
    Schema.Struct({
      type: Schema.Literal('query'),
      queryType: TypeDocTypeSchema,
    }),
    Schema.Struct({
      type: Schema.Literal('templateLiteral'),
      head: Schema.String,
      tail: Schema.Array(Schema.Tuple([TypeDocTypeSchema, Schema.String])),
    }),
    Schema.Struct({ type: Schema.Literal('inferred'), name: Schema.String }),
    Schema.Struct({ type: Schema.Literal('predicate') }),
    Schema.Struct({ type: Schema.Literal('unknown') }),
  ]),
) as unknown as Schema.Codec<TypeDocType, TypeDocTypeEncoded>

export const TypeDocTypeParam = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  variant: Schema.String,
  kind: Schema.Number,
  type: Schema.OptionFromOptional(TypeDocTypeSchema),
  default: Schema.OptionFromOptional(TypeDocTypeSchema),
})
export type TypeDocTypeParam = typeof TypeDocTypeParam.Type

export const TypeDocParam = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  variant: Schema.String,
  kind: Schema.Number,
  flags: TypeDocFlags.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(defaultFlags)),
  ),
  type: Schema.OptionFromOptional(TypeDocTypeSchema),
  defaultValue: Schema.OptionFromOptional(Schema.String),
  comment: Schema.OptionFromOptional(TypeDocComment),
})
export type TypeDocParam = typeof TypeDocParam.Type

export const TypeDocSignature = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  variant: Schema.String,
  kind: Schema.Number,
  comment: Schema.OptionFromOptional(TypeDocComment),
  parameters: Schema.OptionFromOptional(Schema.Array(TypeDocParam)),
  type: Schema.OptionFromOptional(TypeDocTypeSchema),
  typeParameters: Schema.OptionFromOptional(Schema.Array(TypeDocTypeParam)),
})
export type TypeDocSignature = typeof TypeDocSignature.Type

const typeDocItemFields = {
  id: Schema.Number,
  name: Schema.String,
  variant: Schema.String,
  kind: Schema.Number,
  flags: TypeDocFlags.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(defaultFlags)),
  ),
  comment: Schema.OptionFromOptional(TypeDocComment),
  sources: Schema.OptionFromOptional(Schema.Array(TypeDocSource)),
  signatures: Schema.OptionFromOptional(Schema.Array(TypeDocSignature)),
  typeParameters: Schema.OptionFromOptional(Schema.Array(TypeDocTypeParam)),
}

export interface TypeDocItem extends Schema.Struct.Type<
  typeof typeDocItemFields
> {
  readonly type: Option.Option<TypeDocType>
  readonly children: Option.Option<ReadonlyArray<TypeDocItem>>
}

interface TypeDocItemEncoded extends Schema.Struct.Encoded<
  typeof typeDocItemFields
> {
  readonly type?: TypeDocTypeEncoded
  readonly children?: ReadonlyArray<TypeDocItemEncoded>
}

export const TypeDocItem: Schema.Codec<TypeDocItem, TypeDocItemEncoded> =
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  Schema.Struct({
    ...typeDocItemFields,
    type: Schema.OptionFromOptional(TypeDocTypeSchema),
    children: Schema.OptionFromOptional(
      Schema.Array(
        Schema.suspend(
          () =>
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            TypeDocItem as unknown as Schema.Codec<
              TypeDocItem,
              TypeDocItemEncoded
            >,
        ),
      ),
    ),
  }) as unknown as Schema.Codec<TypeDocItem, TypeDocItemEncoded>

export const TypeDocModule = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  variant: Schema.String,
  kind: Schema.Number,
  children: Schema.Array(TypeDocItem).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed([])),
  ),
})
export type TypeDocModule = typeof TypeDocModule.Type

export const TypeDocJson = Schema.Struct({
  schemaVersion: Schema.String,
  id: Schema.Number,
  name: Schema.String,
  variant: Schema.String,
  kind: Schema.Number,
  children: Schema.Array(TypeDocModule),
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
