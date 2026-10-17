import { Option, Predicate, Schema, SchemaAST } from 'effect'

import { isCallableTaggedStruct } from '../schema/index.js'
import { modifyFields } from '../struct/index.js'
import type {
  BindableBlock,
  Binding,
  BindingBaseConfig,
  MessageMapping,
  ValidateStaticPolicy,
} from './binding.js'
import { hasSameDecodedSchemaShape } from './decodedSchemaShape.js'
import type { ValidateConcreteComposition } from './requirements.js'

type ReturnOf<Function> = Function extends (
  ...args: ReadonlyArray<never>
) => infer Output
  ? Output
  : never

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false

/** @internal Exact required Struct fields storing a child Model or its Option. */
export type DirectField<Model, Child> = Extract<
  {
    [Field in keyof Model]-?: {} extends Pick<Model, Field>
      ? never
      : 0 extends 1 & Model[Field]
        ? never
        : Equal<Model[Field], Child> extends true
          ? Field
          : Equal<Model[Field], Option.Option<Child>> extends true
            ? Field
            : never
  }[keyof Model],
  string
>

type DirectConfig<
  BlockValue extends BindableBlock,
  ModelSchema extends Schema.Struct<Schema.Struct.Fields>,
  ToParentMessage,
  Field extends DirectField<ModelSchema['Type'], BlockValue['Model']['Type']>,
  Placement extends string,
> = Omit<
  BindingBaseConfig<
    BlockValue,
    ModelSchema['Type'],
    ReturnOf<ToParentMessage>,
    Placement
  >,
  'read' | 'write' | 'toParentMessage' | 'parentMessage' | 'outMessage'
> &
  Readonly<{
    Model: ModelSchema
    field: Field
    presentWhen?: (model: NoInfer<ModelSchema['Type']>) => boolean
    read?: never
    write?: never
    readAll?: never
    writeAt?: never
    key?: never
  }> &
  MessageMapping<BlockValue, ToParentMessage> &
  ValidateConcreteComposition<BlockValue>

/** @internal Direct-field shorthand for a checked static Binding. */
export type DirectConnection<BlockValue extends BindableBlock> =
  BlockValue extends Readonly<{
    OutMessage: Readonly<{ Type: infer ChildOutMessage }>
  }>
    ? <
        const ModelSchema extends Schema.Struct<Schema.Struct.Fields>,
        const ToParentMessage,
        const Policy,
        const Field extends DirectField<
          ModelSchema['Type'],
          BlockValue['Model']['Type']
        >,
        const Placement extends string = Field,
      >(
        config: DirectConfig<
          BlockValue,
          ModelSchema,
          ToParentMessage,
          Field,
          Placement
        > &
          Readonly<{
            outMessage: Policy
          }> &
          ValidateStaticPolicy<
            Policy,
            NoInfer<ModelSchema['Type']>,
            NoInfer<BlockValue['Message']['Type']>,
            NoInfer<ReturnOf<ToParentMessage>>,
            NoInfer<ChildOutMessage>
          >,
      ) => Binding<
        BlockValue,
        ModelSchema['Type'],
        ReturnOf<ToParentMessage>,
        Placement,
        Policy
      >
    : <
        const ModelSchema extends Schema.Struct<Schema.Struct.Fields>,
        const ToParentMessage,
        const Field extends DirectField<
          ModelSchema['Type'],
          BlockValue['Model']['Type']
        >,
        const Placement extends string = Field,
      >(
        config: DirectConfig<
          BlockValue,
          ModelSchema,
          ToParentMessage,
          Field,
          Placement
        > &
          Readonly<{
            outMessage?: never
          }>,
      ) => Binding<
        BlockValue,
        ModelSchema['Type'],
        ReturnOf<ToParentMessage>,
        Placement,
        never
      >

const isParentMessageMember = (
  parentSchema: Schema.Top,
  constructor: Schema.Top,
): boolean => {
  const visited = new Set<SchemaAST.AST>()
  const visit = (ast: SchemaAST.AST): boolean => {
    if (visited.has(ast)) {
      return false
    }

    visited.add(ast)

    if (SchemaAST.isSuspend(ast)) {
      return visit(SchemaAST.toType(ast.thunk()))
    }

    if (SchemaAST.isUnion(ast)) {
      return ast.types.some(visit)
    }

    return hasSameDecodedSchemaShape(Schema.make<Schema.Top>(ast), constructor)
  }

  return visit(SchemaAST.toType(parentSchema.ast))
}

const normalizeParentMessage = (
  config: Record<string, unknown>,
  childMessage?: unknown,
  parentMessageSchema?: unknown,
): Record<string, unknown> => {
  if (!Object.hasOwn(config, 'parentMessage')) {
    if (!Predicate.isFunction(config['toParentMessage'])) {
      throw new Error(
        '[foldkit] A Binding must supply a parentMessage constructor or a toParentMessage function.',
      )
    }

    return config
  }

  if (Object.hasOwn(config, 'toParentMessage')) {
    throw new Error(
      '[foldkit] A Binding must supply exactly one parent Message mapping.',
    )
  }

  const { parentMessage, ...policy } = config

  if (!Predicate.isFunction(parentMessage)) {
    throw new Error(
      '[foldkit] parentMessage must be a callable Message Schema constructor.',
    )
  }

  const constructParentMessage = parentMessage
  const fields = Reflect.get(parentMessage, 'fields')

  if (
    !Schema.isSchema(parentMessage) ||
    !isCallableTaggedStruct(parentMessage) ||
    !Predicate.isObject(fields) ||
    !Object.hasOwn(fields, '_tag') ||
    !Object.hasOwn(fields, 'message') ||
    Reflect.ownKeys(fields).some(
      field => field !== '_tag' && field !== 'message',
    )
  ) {
    throw new Error(
      '[foldkit] parentMessage must be a callable Message Schema with only the message payload field. Use toParentMessage for a custom mapping.',
    )
  }

  if (
    Schema.isSchema(childMessage) &&
    !hasSameDecodedSchemaShape(Reflect.get(fields, 'message'), childMessage)
  ) {
    throw new Error(
      '[foldkit] parentMessage must declare the bound child Message Schema in its message field. Use toParentMessage for a custom mapping.',
    )
  }

  if (
    Schema.isSchema(parentMessageSchema) &&
    !isParentMessageMember(parentMessageSchema, parentMessage)
  ) {
    throw new Error(
      '[foldkit] parentMessage must construct a variant declared by the parent Message Schema.',
    )
  }

  return {
    ...policy,
    toParentMessage: (message: unknown) => constructParentMessage({ message }),
  }
}

/** @internal Lowers direct-field storage and presence into the shared reader/writer adapter. */
export const normalizeConnectionConfig = (
  config: unknown,
  childModel?: unknown,
  childMessage?: unknown,
  parentMessageSchema?: unknown,
): unknown => {
  if (!Predicate.isObject(config)) {
    throw new Error('[foldkit] A Binding requires a configuration object.')
  }

  const allowedFields = new Set([
    'Model',
    'field',
    'placement',
    'presentWhen',
    'read',
    'write',
    'parentMessage',
    'fromParentMessage',
    'toParentMessage',
    'subscriptions',
    'outMessage',
    'init',
    'readAll',
    'writeAt',
    'key',
  ])

  for (const field of Reflect.ownKeys(config)) {
    if (!Predicate.isString(field) || !allowedFields.has(field)) {
      throw new Error(
        `[foldkit] Unknown Binding configuration field "${globalThis.String(field)}".`,
      )
    }
  }

  const mapped = normalizeParentMessage(
    config,
    childMessage,
    parentMessageSchema,
  )

  if (!Object.hasOwn(mapped, 'field')) {
    for (const field of ['Model', 'key', 'writeAt', 'readAll']) {
      if (Object.hasOwn(mapped, field)) {
        throw new Error(
          `[foldkit] An accessor Binding cannot supply the ${field} configuration field. Use the direct or general keyed form for that relationship.`,
        )
      }
    }

    if (Object.hasOwn(mapped, 'presentWhen')) {
      throw new Error(
        '[foldkit] presentWhen belongs to a direct field Binding. Use read to determine presence for a custom relationship.',
      )
    }

    if (
      !Predicate.isFunction(mapped['read']) ||
      !Predicate.isFunction(mapped['write'])
    ) {
      throw new Error(
        '[foldkit] An accessor Binding requires read and write functions, or use field for direct storage.',
      )
    }

    const { init: _, ...policy } = mapped
    return policy
  }

  const { Model, field, presentWhen, init: _, ...policy } = mapped
  const fields = Schema.isSchema(Model)
    ? Reflect.get(Model, 'fields')
    : undefined

  if (
    !Predicate.isString(field) ||
    !Predicate.isObject(fields) ||
    !Object.hasOwn(fields, field)
  ) {
    throw new Error(
      `[foldkit] Direct Binding field "${globalThis.String(field)}" must name a declared Struct Model field.`,
    )
  }

  if (
    ['read', 'write', 'readAll', 'writeAt', 'key'].some(name =>
      Object.hasOwn(policy, name),
    )
  ) {
    throw new Error(
      '[foldkit] A direct Binding cannot also supply custom readers, writers, or keyed adapters.',
    )
  }

  if (presentWhen !== undefined && !Predicate.isFunction(presentWhen)) {
    throw new Error('[foldkit] presentWhen must be a parent Model predicate.')
  }

  const fieldSchema = Reflect.get(fields, field)

  if (!Schema.isSchema(fieldSchema) || SchemaAST.isOptional(fieldSchema.ast)) {
    throw new Error(
      `[foldkit] Direct Binding field "${field}" must be required. Use Schema.Option for an absent child.`,
    )
  }

  const isRequiredField = hasSameDecodedSchemaShape(fieldSchema, childModel)
  const isOptionField =
    !isRequiredField &&
    Schema.isSchema(childModel) &&
    hasSameDecodedSchemaShape(fieldSchema, Schema.Option(childModel))

  if (!isRequiredField && !isOptionField) {
    throw new Error(
      `[foldkit] Direct Binding field "${field}" must store the declared child Model or its Option. Use read and write for a custom relationship.`,
    )
  }
  const isPresent = (model: object): boolean => {
    if (presentWhen === undefined) {
      return true
    }

    const result = presentWhen(model)

    if (!Predicate.isBoolean(result)) {
      throw new Error(
        `[foldkit] presentWhen for Binding field "${field}" must return a boolean.`,
      )
    }

    return result
  }
  const read = (model: object): Option.Option<unknown> => {
    if (!isPresent(model)) {
      return Option.none()
    }

    const value = Reflect.get(model, field)

    if (isOptionField) {
      if (!Option.isOption(value)) {
        throw new Error(
          `[foldkit] Direct Binding field "${field}" must contain an Option child Model.`,
        )
      }

      return value
    }

    return Option.some(value)
  }

  return {
    ...policy,
    placement: policy['placement'] ?? field,
    read,
    write: (model: object, nextChild: unknown) => {
      if (Option.isNone(read(model))) {
        return model
      }

      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      return modifyFields(model as Record<string, unknown>, {
        [field]: () => (isOptionField ? Option.some(nextChild) : nextChild),
      })
    },
  }
}
