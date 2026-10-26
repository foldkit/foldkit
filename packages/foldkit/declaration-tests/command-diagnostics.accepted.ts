import { Context, Effect, Layer, Schema } from 'effect'
import { Block, Command, Message } from 'foldkit'

const Result = Message.defineMessageUnion({
  CompletedSave: { id: Schema.String },
})
const Definition = Block.makeDefinition('DiagnosticCommandAccepted', {
  Model: Schema.Struct({}),
  Message: Result,
})

export const OwnedSave = Definition.makeCommand('OwnedSave', {
  args: { id: Schema.String },
  messages: [Result.CompletedSave],
  handler: function* () {
    return ({ id }) => Effect.succeed(Result.CompletedSave({ id }))
  },
})
export const Save = Command.define('DiagnosticSave', {
  args: { id: Schema.String },
  messages: [Result.CompletedSave],
  handler: function* () {
    return ({ id }) => Effect.succeed(Result.CompletedSave({ id }))
  },
})

export const ownedSave = OwnedSave({ id: 'owned' })
export const save = Save({ id: 'plain' })

const Args = Schema.Struct({
  id: Schema.String,
  revision: Schema.NumberFromString,
  note: Schema.optionalKey(Schema.String),
})
class Store extends Context.Service<Store, {}>()('DiagnosticCommand/Store') {}

const argsHandler = function* () {
  yield* Store
  return ({ id }: typeof Args.Type) =>
    Effect.succeed(Result.CompletedSave({ id }))
}
const noArgsHandler = function* () {
  yield* Store
  return () => Effect.succeed(Result.CompletedSave({ id: 'none' }))
}

export const OwnedNoArgsHostAbsent = Definition.makeCommand(
  'OwnedNoArgsHostAbsent',
  {
    messages: [Result.CompletedSave],
  },
)
export const invokeOwnedNoArgsHostAbsent = OwnedNoArgsHostAbsent()
// @ts-expect-error Host contracts have no attached handler Layer.
void OwnedNoArgsHostAbsent.layer
// @ts-expect-error Interruption is unavailable when not configured.
void OwnedNoArgsHostAbsent.Interrupt

export const OwnedNoArgsHostName = Definition.makeCommand(
  'OwnedNoArgsHostName',
  {
    messages: [Result.CompletedSave],
    interrupt: true,
  },
)
export const invokeOwnedNoArgsHostName = OwnedNoArgsHostName()
// @ts-expect-error Host contracts have no attached handler Layer.
void OwnedNoArgsHostName.layer
export const cancelOwnedNoArgsHostName = OwnedNoArgsHostName.Interrupt(() =>
  Result.CompletedSave({ id: 'cancelled' }),
)

export const OwnedNoArgsHandlerAbsent = Definition.makeCommand(
  'OwnedNoArgsHandlerAbsent',
  {
    messages: [Result.CompletedSave],
    handler: noArgsHandler,
  },
)
export const invokeOwnedNoArgsHandlerAbsent = OwnedNoArgsHandlerAbsent()
// @ts-expect-error Interruption is unavailable when not configured.
void OwnedNoArgsHandlerAbsent.Interrupt

export const OwnedNoArgsHandlerName = Definition.makeCommand(
  'OwnedNoArgsHandlerName',
  {
    messages: [Result.CompletedSave],
    handler: noArgsHandler,
    interrupt: true,
  },
)
export const invokeOwnedNoArgsHandlerName = OwnedNoArgsHandlerName()
export const cancelOwnedNoArgsHandlerName = OwnedNoArgsHandlerName.Interrupt(
  () => Result.CompletedSave({ id: 'cancelled' }),
)

export const OwnedArgsHostAbsent = Definition.makeCommand(
  'OwnedArgsHostAbsent',
  {
    args: Args.fields,
    messages: [Result.CompletedSave],
  },
)
export const invokeOwnedArgsHostAbsent = OwnedArgsHostAbsent({
  id: 'abc',
  revision: 1,
})
// @ts-expect-error Host contracts have no attached handler Layer.
void OwnedArgsHostAbsent.layer
// @ts-expect-error Interruption is unavailable when not configured.
void OwnedArgsHostAbsent.Interrupt

export const OwnedArgsHostName = Definition.makeCommand('OwnedArgsHostName', {
  args: Args.fields,
  messages: [Result.CompletedSave],
  interrupt: true,
})
export const invokeOwnedArgsHostName = OwnedArgsHostName({
  id: 'abc',
  revision: 1,
})
// @ts-expect-error Host contracts have no attached handler Layer.
void OwnedArgsHostName.layer
export const cancelOwnedArgsHostName = OwnedArgsHostName.Interrupt(() =>
  Result.CompletedSave({ id: 'cancelled' }),
)

export const OwnedArgsHostKey = Definition.makeCommand('OwnedArgsHostKey', {
  args: Args.fields,
  messages: [Result.CompletedSave],
  interrupt: {
    keyFields: ['id'],
    toKey: keyArgs => {
      const { id } = keyArgs
      // @ts-expect-error Only selected key fields are available when interrupting.
      keyArgs.revision
      // @ts-expect-error Key identity remains a decoded string, not any.
      id.doesNotExist()
      return id
    },
  },
})
export const invokeOwnedArgsHostKey = OwnedArgsHostKey({
  id: 'abc',
  revision: 1,
})
// @ts-expect-error Host contracts have no attached handler Layer.
void OwnedArgsHostKey.layer
export const cancelOwnedArgsHostKey = OwnedArgsHostKey.Interrupt(
  { id: 'abc' },
  () => Result.CompletedSave({ id: 'cancelled' }),
)
// @ts-expect-error Keyed interruption requires the declared identity.
OwnedArgsHostKey.Interrupt({}, () => Result.CompletedSave({ id: 'cancelled' }))
// @ts-expect-error Keyed interruption rejects an incompatible identity.
OwnedArgsHostKey.Interrupt({ id: 42 }, () =>
  Result.CompletedSave({ id: 'cancelled' }),
)

export const OwnedArgsHandlerName = Definition.makeCommand(
  'OwnedArgsHandlerName',
  {
    args: Args.fields,
    messages: [Result.CompletedSave],
    handler: argsHandler,
    interrupt: true,
  },
)
export const invokeOwnedArgsHandlerName = OwnedArgsHandlerName({
  id: 'abc',
  revision: 1,
})
export const cancelOwnedArgsHandlerName = OwnedArgsHandlerName.Interrupt(() =>
  Result.CompletedSave({ id: 'cancelled' }),
)

export const OwnedArgsHandlerKey = Definition.makeCommand(
  'OwnedArgsHandlerKey',
  {
    args: Args.fields,
    messages: [Result.CompletedSave],
    handler: argsHandler,
    interrupt: {
      keyFields: ['id'],
      toKey: keyArgs => {
        const { id } = keyArgs
        // @ts-expect-error Only selected key fields are available when interrupting.
        keyArgs.revision
        // @ts-expect-error Key identity remains a decoded string, not any.
        id.doesNotExist()
        return id
      },
    },
  },
)
export const invokeOwnedArgsHandlerKey = OwnedArgsHandlerKey({
  id: 'abc',
  revision: 1,
})
export const cancelOwnedArgsHandlerKey = OwnedArgsHandlerKey.Interrupt(
  { id: 'abc' },
  () => Result.CompletedSave({ id: 'cancelled' }),
)
// @ts-expect-error Keyed interruption requires the declared identity.
OwnedArgsHandlerKey.Interrupt({}, () =>
  Result.CompletedSave({ id: 'cancelled' }),
)
// @ts-expect-error Keyed interruption rejects an incompatible identity.
OwnedArgsHandlerKey.Interrupt({ id: 42 }, () =>
  Result.CompletedSave({ id: 'cancelled' }),
)

export const PrimitiveNoArgsHostAbsent = Command.define(
  'PrimitiveNoArgsHostAbsent',
  {
    messages: [Result.CompletedSave],
  },
)
export const invokePrimitiveNoArgsHostAbsent = PrimitiveNoArgsHostAbsent()
// @ts-expect-error Host contracts have no attached handler Layer.
void PrimitiveNoArgsHostAbsent.layer
// @ts-expect-error Interruption is unavailable when not configured.
void PrimitiveNoArgsHostAbsent.Interrupt

export const PrimitiveNoArgsHostName = Command.define(
  'PrimitiveNoArgsHostName',
  {
    messages: [Result.CompletedSave],
    interrupt: true,
  },
)
export const invokePrimitiveNoArgsHostName = PrimitiveNoArgsHostName()
// @ts-expect-error Host contracts have no attached handler Layer.
void PrimitiveNoArgsHostName.layer
export const cancelPrimitiveNoArgsHostName = PrimitiveNoArgsHostName.Interrupt(
  () => Result.CompletedSave({ id: 'cancelled' }),
)

export const PrimitiveNoArgsHandlerAbsent = Command.define(
  'PrimitiveNoArgsHandlerAbsent',
  {
    messages: [Result.CompletedSave],
    handler: noArgsHandler,
  },
)
export const invokePrimitiveNoArgsHandlerAbsent = PrimitiveNoArgsHandlerAbsent()
// @ts-expect-error Interruption is unavailable when not configured.
void PrimitiveNoArgsHandlerAbsent.Interrupt

export const PrimitiveNoArgsHandlerName = Command.define(
  'PrimitiveNoArgsHandlerName',
  {
    messages: [Result.CompletedSave],
    handler: noArgsHandler,
    interrupt: true,
  },
)
export const invokePrimitiveNoArgsHandlerName = PrimitiveNoArgsHandlerName()
export const cancelPrimitiveNoArgsHandlerName =
  PrimitiveNoArgsHandlerName.Interrupt(() =>
    Result.CompletedSave({ id: 'cancelled' }),
  )

export const PrimitiveArgsHostAbsent = Command.define(
  'PrimitiveArgsHostAbsent',
  {
    args: Args.fields,
    messages: [Result.CompletedSave],
  },
)
export const invokePrimitiveArgsHostAbsent = PrimitiveArgsHostAbsent({
  id: 'abc',
  revision: 1,
})
// @ts-expect-error Host contracts have no attached handler Layer.
void PrimitiveArgsHostAbsent.layer
// @ts-expect-error Interruption is unavailable when not configured.
void PrimitiveArgsHostAbsent.Interrupt

export const PrimitiveArgsHostName = Command.define('PrimitiveArgsHostName', {
  args: Args.fields,
  messages: [Result.CompletedSave],
  interrupt: true,
})
export const invokePrimitiveArgsHostName = PrimitiveArgsHostName({
  id: 'abc',
  revision: 1,
})
// @ts-expect-error Host contracts have no attached handler Layer.
void PrimitiveArgsHostName.layer
export const cancelPrimitiveArgsHostName = PrimitiveArgsHostName.Interrupt(() =>
  Result.CompletedSave({ id: 'cancelled' }),
)

export const PrimitiveArgsHostKey = Command.define('PrimitiveArgsHostKey', {
  args: Args.fields,
  messages: [Result.CompletedSave],
  interrupt: {
    keyFields: ['id'],
    toKey: keyArgs => {
      const { id } = keyArgs
      // @ts-expect-error Only selected key fields are available when interrupting.
      keyArgs.revision
      // @ts-expect-error Key identity remains a decoded string, not any.
      id.doesNotExist()
      return id
    },
  },
})
export const invokePrimitiveArgsHostKey = PrimitiveArgsHostKey({
  id: 'abc',
  revision: 1,
})
// @ts-expect-error Host contracts have no attached handler Layer.
void PrimitiveArgsHostKey.layer
export const cancelPrimitiveArgsHostKey = PrimitiveArgsHostKey.Interrupt(
  { id: 'abc' },
  () => Result.CompletedSave({ id: 'cancelled' }),
)
// @ts-expect-error Keyed interruption requires the declared identity.
PrimitiveArgsHostKey.Interrupt({}, () =>
  Result.CompletedSave({ id: 'cancelled' }),
)
// @ts-expect-error Keyed interruption rejects an incompatible identity.
PrimitiveArgsHostKey.Interrupt({ id: 42 }, () =>
  Result.CompletedSave({ id: 'cancelled' }),
)

export const PrimitiveArgsHandlerName = Command.define(
  'PrimitiveArgsHandlerName',
  {
    args: Args.fields,
    messages: [Result.CompletedSave],
    handler: argsHandler,
    interrupt: true,
  },
)
export const invokePrimitiveArgsHandlerName = PrimitiveArgsHandlerName({
  id: 'abc',
  revision: 1,
})
export const cancelPrimitiveArgsHandlerName =
  PrimitiveArgsHandlerName.Interrupt(() =>
    Result.CompletedSave({ id: 'cancelled' }),
  )

export const PrimitiveArgsHandlerKey = Command.define(
  'PrimitiveArgsHandlerKey',
  {
    args: Args.fields,
    messages: [Result.CompletedSave],
    handler: argsHandler,
    interrupt: {
      keyFields: ['id'],
      toKey: keyArgs => {
        const { id } = keyArgs
        // @ts-expect-error Only selected key fields are available when interrupting.
        keyArgs.revision
        // @ts-expect-error Key identity remains a decoded string, not any.
        id.doesNotExist()
        return id
      },
    },
  },
)
export const invokePrimitiveArgsHandlerKey = PrimitiveArgsHandlerKey({
  id: 'abc',
  revision: 1,
})
export const cancelPrimitiveArgsHandlerKey = PrimitiveArgsHandlerKey.Interrupt(
  { id: 'abc' },
  () => Result.CompletedSave({ id: 'cancelled' }),
)
// @ts-expect-error Keyed interruption requires the declared identity.
PrimitiveArgsHandlerKey.Interrupt({}, () =>
  Result.CompletedSave({ id: 'cancelled' }),
)
// @ts-expect-error Keyed interruption rejects an incompatible identity.
PrimitiveArgsHandlerKey.Interrupt({ id: 42 }, () =>
  Result.CompletedSave({ id: 'cancelled' }),
)

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false

type Assert<Value extends true> = Value

export type AttachedRequirements = Assert<
  Equal<
    Layer.Services<
      | typeof OwnedNoArgsHandlerAbsent.layer
      | typeof OwnedNoArgsHandlerName.layer
      | typeof OwnedArgsHandlerName.layer
      | typeof OwnedArgsHandlerKey.layer
      | typeof PrimitiveNoArgsHandlerAbsent.layer
      | typeof PrimitiveNoArgsHandlerName.layer
      | typeof PrimitiveArgsHandlerName.layer
      | typeof PrimitiveArgsHandlerKey.layer
    >,
    Store
  >
>

export const SelectedId = Definition.makeCommand('SelectedId', {
  args: Args.fields,
  messages: [Result.CompletedSave],
  interrupt: { keyFields: ['id'], toKey: ({ id }) => id },
})
export const cancelSelectedId = SelectedId.Interrupt(
  { id: 'draft' },
  outcome => outcome,
)
// @ts-expect-error Cancellation exposes only the selected key field.
SelectedId.Interrupt({ id: 'draft', revision: 7 }, outcome => outcome)

export const SelectedIdentity = Definition.makeCommand('SelectedIdentity', {
  args: Args.fields,
  messages: [Result.CompletedSave],
  interrupt: {
    keyFields: ['id', 'revision'],
    toKey: ({ id, revision }) => `${id}:${revision.toFixed(0)}`,
  },
})
export const cancelSelectedIdentity = SelectedIdentity.Interrupt(
  { id: 'draft', revision: 7 },
  outcome => outcome,
)
// @ts-expect-error Every required selected field is part of cancellation.
SelectedIdentity.Interrupt({ id: 'draft' }, outcome => outcome)

export const SelectedOptional = Definition.makeCommand('SelectedOptional', {
  args: Args.fields,
  messages: [Result.CompletedSave],
  interrupt: { keyFields: ['note'], toKey: ({ note }) => note ?? 'Empty' },
})
export const cancelSelectedOptional = SelectedOptional.Interrupt(
  {},
  outcome => outcome,
)

export const makeSelectedPolicy = (
  interrupt: Exclude<Command.InterruptOption<typeof Args.Type, 'id'>, true>,
) =>
  Definition.makeCommand('SelectedPolicy', {
    args: Args.fields,
    messages: [Result.CompletedSave],
    interrupt,
  })

export const makeOptionalSelectedPolicy = (
  interrupt: Command.InterruptOption<typeof Args.Type, 'id'> | undefined,
) => {
  if (interrupt === true || interrupt === undefined) {
    return Definition.makeCommand('OptionalSelectedPolicy', {
      args: Args.fields,
      messages: [Result.CompletedSave],
      interrupt,
    })
  } else {
    return Definition.makeCommand('OptionalSelectedPolicy', {
      args: Args.fields,
      messages: [Result.CompletedSave],
      interrupt,
    })
  }
}

export const makeSelectedAttachedPolicy = (
  interrupt: Exclude<Command.InterruptOption<typeof Args.Type, 'id'>, true>,
) =>
  Definition.makeCommand('SelectedAttachedPolicy', {
    args: Args.fields,
    messages: [Result.CompletedSave],
    handler: argsHandler,
    interrupt,
  })

const KeySelection = Schema.Literals(['Id', 'Revision'])

export const makeSelectedKeyPolicy = (selection: typeof KeySelection.Type) => {
  if (selection === 'Id') {
    return Definition.makeCommand('SelectedKeyPolicy', {
      args: Args.fields,
      messages: [Result.CompletedSave],
      interrupt: { keyFields: ['id'], toKey: ({ id }) => id },
    })
  } else {
    return Definition.makeCommand('SelectedKeyPolicy', {
      args: Args.fields,
      messages: [Result.CompletedSave],
      interrupt: {
        keyFields: ['revision'],
        toKey: ({ revision }) => revision.toFixed(),
      },
    })
  }
}

const precisePolicy: Command.InterruptOption<typeof Args.Type, 'id'> = {
  keyFields: ['id'],
  toKey: ({ id }) => id,
}

export const PrecisePolicy = Definition.makeCommand('PrecisePolicy', {
  args: Args.fields,
  messages: [Result.CompletedSave],
  interrupt: precisePolicy,
})
export const PrimitivePrecisePolicy = Command.define('PrimitivePrecisePolicy', {
  args: Args.fields,
  messages: [Result.CompletedSave],
  interrupt: precisePolicy,
})

const broadSafePolicy: Command.InterruptOption<typeof Args.Type> = {
  keyFields: ['id'],
  toKey: keyArgs =>
    `${keyArgs.id ?? 'Missing'}:${keyArgs.revision ?? 'Missing'}`,
}

export const BroadSafePolicy = Definition.makeCommand('BroadSafePolicy', {
  args: Args.fields,
  messages: [Result.CompletedSave],
  interrupt: broadSafePolicy,
})
export const PrimitiveBroadSafePolicy = Command.define(
  'PrimitiveBroadSafePolicy',
  {
    args: Args.fields,
    messages: [Result.CompletedSave],
    interrupt: broadSafePolicy,
  },
)

const OptionalKeyArgs = Schema.Struct({
  id: Schema.optionalKey(Schema.String),
  revision: Schema.optionalKey(Schema.Number),
})

export const makeOptionalKeyArgs = (
  keyFields: readonly ['id' | 'revision', ...ReadonlyArray<'id' | 'revision'>],
) => {
  const interrupt = {
    keyFields,
    toKey: (keyArgs: typeof OptionalKeyArgs.Type) => JSON.stringify(keyArgs),
  }

  return {
    Owned: Definition.makeCommand('OptionalKeyArgs', {
      args: Args.fields,
      messages: [Result.CompletedSave],
      interrupt,
    }),
    Unowned: Command.define('PrimitiveOptionalKeyArgs', {
      args: Args.fields,
      messages: [Result.CompletedSave],
      interrupt,
    }),
  }
}

export const makeConstantKey = (
  keyFields: readonly ['id' | 'revision', ...ReadonlyArray<'id' | 'revision'>],
) => {
  const interrupt = { keyFields, toKey: () => 'All' }

  return {
    Owned: Definition.makeCommand('ConstantKey', {
      args: Args.fields,
      messages: [Result.CompletedSave],
      interrupt,
    }),
    Unowned: Command.define('PrimitiveConstantKey', {
      args: Args.fields,
      messages: [Result.CompletedSave],
      interrupt,
    }),
  }
}

export const makeBothKeyOrders = (
  keyFields: readonly ['id', 'revision'] | readonly ['revision', 'id'],
) => {
  const interrupt = {
    keyFields,
    toKey: ({ id, revision }: Pick<typeof Args.Type, 'id' | 'revision'>) =>
      `${id}:${revision}`,
  }

  return {
    Owned: Definition.makeCommand('BothKeyOrders', {
      args: Args.fields,
      messages: [Result.CompletedSave],
      interrupt,
    }),
    Unowned: Command.define('PrimitiveBothKeyOrders', {
      args: Args.fields,
      messages: [Result.CompletedSave],
      interrupt,
    }),
  }
}

export const cancelBroadSafePolicy = BroadSafePolicy.Interrupt(
  { id: 'draft', revision: 7 },
  outcome => outcome,
)
export type BroadSafeCapturedArgs = Assert<
  Equal<typeof cancelBroadSafePolicy.args, typeof Args.Type>
>
// @ts-expect-error An unresolved selected set requires all possible required keys.
BroadSafePolicy.Interrupt({ id: 'draft' }, outcome => outcome)

export const makeGenericSafePolicy = <
  const Interrupt extends Exclude<
    Command.InterruptOption<typeof Args.Type>,
    true
  >,
>(
  interrupt: Interrupt,
) => ({
  Owned: Definition.makeCommand('GenericSafePolicy', {
    args: Args.fields,
    messages: [Result.CompletedSave],
    interrupt,
  }),
  Unowned: Command.define('PrimitiveGenericSafePolicy', {
    args: Args.fields,
    messages: [Result.CompletedSave],
    interrupt,
  }),
})

export const makeGenericPayload = <Payload, Encoded>(
  Payload: Schema.Codec<Payload, Encoded>,
) => ({
  Owned: Definition.makeCommand('GenericPayload', {
    args: { id: Schema.String, payload: Payload },
    messages: [Result.CompletedSave],
    interrupt: {
      keyFields: ['id'],
      toKey: keyArgs => {
        // @ts-expect-error Payload fields do not enter the selected key.
        void keyArgs.payload
        return keyArgs.id.toUpperCase()
      },
    },
    handler: function* () {
      yield* Store
      return args => {
        const payload: Payload = args.payload
        void payload
        return Effect.succeed(Result.CompletedSave({ id: args.id }))
      }
    },
  }),
  Unowned: Command.define('PrimitiveGenericPayload', {
    args: { id: Schema.String, payload: Payload },
    messages: [Result.CompletedSave],
    interrupt: {
      keyFields: ['id'],
      toKey: keyArgs => {
        // @ts-expect-error Payload fields do not enter the selected key.
        void keyArgs.payload
        return keyArgs.id.toUpperCase()
      },
    },
    handler: function* () {
      yield* Store
      return args => {
        const payload: Payload = args.payload
        void payload
        return Effect.succeed(Result.CompletedSave({ id: args.id }))
      }
    },
  }),
})

export const GenericPayload = makeGenericPayload(Schema.NumberFromString)
export const invokeGenericPayload = GenericPayload.Owned({
  id: 'draft',
  payload: 7,
})
export const invokePrimitiveGenericPayload = GenericPayload.Unowned({
  id: 'draft',
  payload: 7,
})
export const cancelGenericPayload = GenericPayload.Owned.Interrupt(
  { id: 'draft' },
  outcome => outcome,
)
export const cancelPrimitiveGenericPayload = GenericPayload.Unowned.Interrupt(
  { id: 'draft' },
  outcome => outcome,
)
// @ts-expect-error The decoded generic payload is a number.
GenericPayload.Owned({ id: 'draft', payload: '7' })
// @ts-expect-error The decoded generic payload is a number.
GenericPayload.Unowned({ id: 'draft', payload: '7' })
export type GenericPayloadRequirements = Assert<
  Equal<
    Layer.Services<
      typeof GenericPayload.Owned.layer | typeof GenericPayload.Unowned.layer
    >,
    Store
  >
>
