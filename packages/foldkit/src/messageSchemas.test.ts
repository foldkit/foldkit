import { Context, Effect, Schema, Stream } from 'effect'
import { describe, expectTypeOf, it } from 'vitest'

import * as Command from './command/public.js'
import { defineMessageUnion } from './message/index.js'
import * as Mount from './mount/public.js'

const Message = defineMessageUnion({
  CompletedReadValue: { value: Schema.Number },
  CompletedWait: {},
})

class ValueStore extends Context.Service<
  ValueStore,
  { readonly value: number }
>()('ValueStore') {}

const readValue = Effect.flatMap(ValueStore, ({ value }) => {
  if (value < 0) {
    return Effect.fail(new Error('The stored value is negative'))
  } else {
    return Effect.succeed(Message.CompletedReadValue({ value }))
  }
})

type ReadValueEffect = Effect.Effect<
  typeof Message.CompletedReadValue.Type,
  Error,
  ValueStore
>

const commandConfig = <const Messages extends ReadonlyArray<Schema.Top>>(
  messages: Messages,
) => ({ messages, execute: Effect.never })

const argsConfig = <const Messages extends ReadonlyArray<Schema.Top>>(
  messages: Messages,
) => ({
  args: { value: Schema.Number },
  messages,
  execute: () => Effect.never,
})

const streamConfig = <const Messages extends ReadonlyArray<Schema.Top>>(
  messages: Messages,
) => ({ messages, execute: () => Stream.empty })

const argsStreamConfig = <const Messages extends ReadonlyArray<Schema.Top>>(
  messages: Messages,
) => ({
  args: { value: Schema.Number },
  messages,
  execute: () => Stream.empty,
})

const nameInterrupt = <Config extends object>(
  config: Config,
): Config & Readonly<{ interrupt: true }> => ({ ...config, interrupt: true })

const keyedInterrupt = <Config extends object>(
  config: Config,
): Config &
  Readonly<{
    interrupt: Readonly<{
      keyFields: readonly ['value']
      toKey: (args: Readonly<{ value: number }>) => string
    }>
  }> => ({
  ...config,
  interrupt: { keyFields: ['value'], toKey: ({ value }) => value.toString() },
})

describe('result Message Schema declarations', () => {
  it('preserves Command result, failure, service, and args inference', () => {
    const messages: readonly [
      typeof Message.CompletedReadValue,
      typeof Message.CompletedWait,
    ] = [Message.CompletedReadValue, Message.CompletedWait]

    const ReadValue = Command.define('ReadValue', {
      messages,
      execute: readValue,
    })

    const ReadAdjustedValue = Command.define('ReadAdjustedValue', {
      args: { offset: Schema.Number },
      messages,
      execute: ({ offset }) => {
        expectTypeOf(offset).toEqualTypeOf<number>()
        return Effect.map(readValue, ({ value }) =>
          Message.CompletedReadValue({ value: value + offset }),
        )
      },
    })

    const ReadInterruptibleValue = Command.define('ReadInterruptibleValue', {
      messages,
      interrupt: true,
      execute: readValue,
    })

    const ReadInterruptibleAdjustedValue = Command.define(
      'ReadInterruptibleAdjustedValue',
      {
        args: { offset: Schema.Number },
        messages,
        interrupt: true,
        execute: ({ offset }) => {
          expectTypeOf(offset).toEqualTypeOf<number>()
          return Effect.map(readValue, ({ value }) =>
            Message.CompletedReadValue({ value: value + offset }),
          )
        },
      },
    )

    const ReadKeyedValue = Command.define('ReadKeyedValue', {
      args: { value: Schema.Number, label: Schema.String },
      messages,
      interrupt: {
        keyFields: ['value'],
        toKey: ({ value }) => {
          expectTypeOf(value).toEqualTypeOf<number>()
          return value.toString()
        },
      },
      execute: ({ value, label }) => {
        expectTypeOf(value).toEqualTypeOf<number>()
        expectTypeOf(label).toEqualTypeOf<string>()
        return Effect.map(readValue, () =>
          Message.CompletedReadValue({ value }),
        )
      },
    })

    expectTypeOf(ReadValue().effect).toEqualTypeOf<ReadValueEffect>()
    expectTypeOf(
      ReadAdjustedValue({ offset: 1 }).effect,
    ).toEqualTypeOf<ReadValueEffect>()
    expectTypeOf(
      ReadInterruptibleValue().effect,
    ).toEqualTypeOf<ReadValueEffect>()
    expectTypeOf(
      ReadInterruptibleAdjustedValue({ offset: 1 }).effect,
    ).toEqualTypeOf<ReadValueEffect>()
    expectTypeOf(
      ReadKeyedValue({ value: 1, label: 'one' }).effect,
    ).toEqualTypeOf<ReadValueEffect>()
    expectTypeOf(ReadKeyedValue.Interrupt)
      .parameter(0)
      .toEqualTypeOf<Readonly<{ value: number }>>()

    const defineWithFields = <Fields extends Schema.Struct.Fields>(
      fields: Fields,
    ) =>
      Command.define('ReadWithFields', {
        args: fields,
        messages: [Message.CompletedReadValue],
        execute: () => readValue,
      })

    const ReadWithFields = defineWithFields({ offset: Schema.Number })
    expectTypeOf(ReadWithFields)
      .parameter(0)
      .toEqualTypeOf<Readonly<{ offset: number }>>()
    expectTypeOf(
      ReadWithFields({ offset: 1 }).effect,
    ).toEqualTypeOf<ReadValueEffect>()
  })

  it('preserves Mount runtime inputs, args, result unions, and Scope handling', () => {
    const messages: readonly [
      typeof Message.CompletedReadValue,
      typeof Message.CompletedWait,
    ] = [Message.CompletedReadValue, Message.CompletedWait]

    const MeasureElement = Mount.define('MeasureElement', {
      messages,
      execute: ({ element, viewStateChanges }) => {
        expectTypeOf(element).toEqualTypeOf<Element>()
        expectTypeOf(viewStateChanges).toEqualTypeOf<
          Stream.Stream<Mount.ViewState>
        >()
        return Effect.succeed(
          Message.CompletedReadValue({ value: element.children.length }),
        )
      },
    })

    const MeasureAdjustedElement = Mount.define('MeasureAdjustedElement', {
      args: { offset: Schema.Number },
      messages,
      execute: ({ element, viewStateChanges, offset }) => {
        expectTypeOf(element).toEqualTypeOf<Element>()
        expectTypeOf(viewStateChanges).toEqualTypeOf<
          Stream.Stream<Mount.ViewState>
        >()
        expectTypeOf(offset).toEqualTypeOf<number>()
        return Effect.as(
          Effect.acquireRelease(Effect.void, () => Effect.void),
          Message.CompletedReadValue({
            value: element.children.length + offset,
          }),
        )
      },
    })

    const ObserveElement = Mount.defineStream('ObserveElement', {
      messages,
      execute: ({ element, viewStateChanges }) => {
        expectTypeOf(element).toEqualTypeOf<Element>()
        expectTypeOf(viewStateChanges).toEqualTypeOf<
          Stream.Stream<Mount.ViewState>
        >()
        return Stream.succeed(
          Message.CompletedReadValue({ value: element.children.length }),
        )
      },
    })

    const ObserveAdjustedElement = Mount.defineStream(
      'ObserveAdjustedElement',
      {
        args: { offset: Schema.Number },
        messages,
        execute: ({ element, viewStateChanges, offset }) => {
          expectTypeOf(element).toEqualTypeOf<Element>()
          expectTypeOf(viewStateChanges).toEqualTypeOf<
            Stream.Stream<Mount.ViewState>
          >()
          expectTypeOf(offset).toEqualTypeOf<number>()
          return Stream.succeed(
            Message.CompletedReadValue({
              value: element.children.length + offset,
            }),
          )
        },
      },
    )

    type ResultStream = Stream.Stream<typeof Message.Type>
    expectTypeOf(MeasureElement().f).returns.toEqualTypeOf<ResultStream>()
    expectTypeOf(
      MeasureAdjustedElement({ offset: 1 }).f,
    ).returns.toEqualTypeOf<ResultStream>()
    expectTypeOf(ObserveElement().f).returns.toEqualTypeOf<ResultStream>()
    expectTypeOf(
      ObserveAdjustedElement({ offset: 1 }).f,
    ).returns.toEqualTypeOf<ResultStream>()
  })

  it('allows Effects that never complete and empty Streams with declared Messages', () => {
    Command.define('Wait', commandConfig([Message.CompletedWait]))
    Command.define('WaitWithArgs', argsConfig([Message.CompletedWait]))
    Command.define(
      'WaitInterruptibly',
      nameInterrupt(commandConfig([Message.CompletedWait])),
    )
    Command.define(
      'WaitInterruptiblyWithArgs',
      nameInterrupt(argsConfig([Message.CompletedWait])),
    )
    Command.define(
      'WaitByValue',
      keyedInterrupt(argsConfig([Message.CompletedWait])),
    )
    Mount.define('WaitForElement', argsConfig([Message.CompletedWait]))
    Mount.define('WaitForElementWithoutArgs', {
      messages: [Message.CompletedWait],
      execute: () => Effect.never,
    })
    Mount.defineStream('ObserveElement', streamConfig([Message.CompletedWait]))
    Mount.defineStream(
      'ObserveElementWithArgs',
      argsStreamConfig([Message.CompletedWait]),
    )
  })
  it('accepts valid Schema alternatives and decoded results with never encodings', () => {
    const selectSchema = (isValue: boolean) => {
      if (isValue) {
        return Message.CompletedReadValue
      } else {
        return Message.CompletedWait
      }
    }
    const messages: readonly [
      typeof Message.CompletedWait,
      ...ReadonlyArray<typeof Message.CompletedReadValue>,
    ] = [Message.CompletedWait, Message.CompletedReadValue]
    const InhabitedUnion = Schema.Union([Message.CompletedWait, Schema.Never])
    const NeverEncodedMessage = Message.CompletedWait.pipe(
      Schema.encodeTo(Schema.Never),
    )

    Command.define('ReadAlternative', {
      messages: [selectSchema(true)],
      execute: Effect.succeed(Message.CompletedWait()),
    })
    Mount.define('MeasureAlternative', {
      messages: [selectSchema(true)],
      execute: () => Effect.succeed(Message.CompletedWait()),
    })
    Mount.defineStream('ObserveAlternative', {
      messages: [selectSchema(true)],
      execute: () => Stream.succeed(Message.CompletedWait()),
    })
    Command.define('ReadVariadicMessages', {
      messages,
      execute: Effect.succeed(Message.CompletedWait()),
    })
    Command.define('ReadUnion', {
      messages: [InhabitedUnion],
      execute: Effect.succeed(Message.CompletedWait()),
    })
    Mount.define('MeasureUnion', {
      messages: [InhabitedUnion],
      execute: () => Effect.succeed(Message.CompletedWait()),
    })
    Mount.defineStream('ObserveUnion', {
      messages: [InhabitedUnion],
      execute: () => Stream.succeed(Message.CompletedWait()),
    })
    Command.define('ReadNeverEncodedMessage', {
      messages: [NeverEncodedMessage],
      execute: Effect.succeed(Message.CompletedWait()),
    })
    Mount.define('MeasureNeverEncodedMessage', {
      messages: [NeverEncodedMessage],
      execute: () => Effect.succeed(Message.CompletedWait()),
    })
    Mount.defineStream('ObserveNeverEncodedMessage', {
      messages: [NeverEncodedMessage],
      execute: () => Stream.succeed(Message.CompletedWait()),
    })
  })

  it('forwards validated Message tuples through generic factories', () => {
    const defineCommand = <
      const Messages extends readonly [
        Schema.Top,
        ...ReadonlyArray<Schema.Top>,
      ],
      Failure,
      Requirements,
    >(
      messages: Command.ResultMessageSchemas<Messages>,
      execute: Effect.Effect<
        Schema.Schema.Type<Messages[number]>,
        Failure,
        Requirements
      >,
    ) =>
      Command.define<'ReadGenericValue', Messages, typeof execute>(
        'ReadGenericValue',
        { messages, execute },
      )

    const ReadGenericValue = defineCommand(
      [Message.CompletedReadValue],
      readValue,
    )
    expectTypeOf(ReadGenericValue().effect).toEqualTypeOf<ReadValueEffect>()

    const defineMount = <
      const Messages extends readonly [
        Schema.Top,
        ...ReadonlyArray<Schema.Top>,
      ],
    >(
      messages: Mount.ResultMessageSchemas<Messages>,
      result: Schema.Schema.Type<Messages[number]>,
    ) =>
      Mount.define<'MeasureGenericElement', Messages>('MeasureGenericElement', {
        messages,
        execute: () => Effect.succeed(result),
      })

    const defineStreamMount = <
      const Messages extends readonly [
        Schema.Top,
        ...ReadonlyArray<Schema.Top>,
      ],
    >(
      messages: Mount.ResultMessageSchemas<Messages>,
      result: Schema.Schema.Type<Messages[number]>,
    ) =>
      Mount.defineStream<'ObserveGenericElement', Messages>(
        'ObserveGenericElement',
        {
          messages,
          execute: () => Stream.succeed(result),
        },
      )

    const MeasureGenericElement = defineMount(
      [Message.CompletedReadValue],
      Message.CompletedReadValue({ value: 1 }),
    )
    const ObserveGenericElement = defineStreamMount(
      [Message.CompletedReadValue],
      Message.CompletedReadValue({ value: 1 }),
    )
    type ResultStream = Stream.Stream<typeof Message.CompletedReadValue.Type>
    expectTypeOf(
      MeasureGenericElement().f,
    ).returns.toEqualTypeOf<ResultStream>()
    expectTypeOf(
      ObserveGenericElement().f,
    ).returns.toEqualTypeOf<ResultStream>()

    if (false) {
      // @ts-expect-error generic factories must reject never result Schemas
      defineCommand([Schema.Never], Effect.never)
      defineMount(
        // @ts-expect-error generic factories must reject mixed valid and never result Schemas
        [Message.CompletedWait, Schema.Never],
        Message.CompletedWait(),
      )
      defineStreamMount(
        // @ts-expect-error generic factories must reject mixed valid and never result Schemas
        [Message.CompletedWait, Schema.Never],
        Message.CompletedWait(),
      )
    }
  })
})

if (false) {
  const effectConfig = <const Messages extends ReadonlyArray<Schema.Top>>(
    messages: Messages,
  ) => ({ messages, execute: () => Effect.never })

  Command.define('InvalidCompletedMessages', {
    // @ts-expect-error a result Message must not widen an invalid Message declaration
    messages: [Message.CompletedWait, Schema.Never],
    execute: Effect.succeed(Message.CompletedWait()),
  })
  Mount.define('InvalidCompletedMessages', {
    // @ts-expect-error a result Message must not widen an invalid Message declaration
    messages: [Message.CompletedWait, Schema.Never],
    execute: () => Effect.succeed(Message.CompletedWait()),
  })
  Mount.defineStream('InvalidCompletedMessages', {
    // @ts-expect-error an emitted Message must not widen an invalid Message declaration
    messages: [Message.CompletedWait, Schema.Never],
    execute: () => Stream.succeed(Message.CompletedWait()),
  })

  Command.define(
    'InvalidMessages',
    // @ts-expect-error result Message declarations must be non-empty
    commandConfig([]),
  )
  Command.define(
    'InvalidMessages',
    // @ts-expect-error result Message declarations must be non-empty
    nameInterrupt(commandConfig([])),
  )
  Command.define(
    'InvalidMessages',
    // @ts-expect-error result Message declarations must be non-empty
    argsConfig([]),
  )
  Command.define(
    'InvalidMessages',
    // @ts-expect-error result Message declarations must be non-empty
    nameInterrupt(argsConfig([])),
  )
  Command.define(
    'InvalidMessages',
    // @ts-expect-error result Message declarations must be non-empty
    keyedInterrupt(argsConfig([])),
  )
  Mount.define(
    'InvalidMessages',
    // @ts-expect-error result Message declarations must be non-empty
    argsConfig([]),
  )
  Mount.define(
    'InvalidMessages',
    // @ts-expect-error result Message declarations must be non-empty
    effectConfig([]),
  )
  Mount.defineStream(
    'InvalidMessages',
    // @ts-expect-error result Message declarations must be non-empty
    streamConfig([]),
  )
  Mount.defineStream(
    'InvalidMessages',
    // @ts-expect-error result Message declarations must be non-empty
    argsStreamConfig([]),
  )

  Command.define(
    'InvalidMessages',
    // @ts-expect-error each result Message Schema must have a non-never decoded type
    commandConfig([Schema.Never]),
  )
  Command.define(
    'InvalidMessages',
    // @ts-expect-error each result Message Schema must have a non-never decoded type
    nameInterrupt(commandConfig([Schema.Never])),
  )
  Command.define(
    'InvalidMessages',
    // @ts-expect-error each result Message Schema must have a non-never decoded type
    argsConfig([Schema.Never]),
  )
  Command.define(
    'InvalidMessages',
    // @ts-expect-error each result Message Schema must have a non-never decoded type
    nameInterrupt(argsConfig([Schema.Never])),
  )
  Command.define(
    'InvalidMessages',
    // @ts-expect-error each result Message Schema must have a non-never decoded type
    keyedInterrupt(argsConfig([Schema.Never])),
  )
  Mount.define(
    'InvalidMessages',
    // @ts-expect-error each result Message Schema must have a non-never decoded type
    argsConfig([Schema.Never]),
  )
  Mount.define(
    'InvalidMessages',
    // @ts-expect-error each result Message Schema must have a non-never decoded type
    effectConfig([Schema.Never]),
  )
  Mount.defineStream(
    'InvalidMessages',
    // @ts-expect-error each result Message Schema must have a non-never decoded type
    streamConfig([Schema.Never]),
  )
  Mount.defineStream(
    'InvalidMessages',
    // @ts-expect-error each result Message Schema must have a non-never decoded type
    argsStreamConfig([Schema.Never]),
  )

  Command.define(
    'InvalidMessages',
    // @ts-expect-error a valid result Message does not permit a never result Message
    commandConfig([Message.CompletedWait, Schema.Never]),
  )
  Command.define(
    'InvalidMessages',
    // @ts-expect-error a valid result Message does not permit a never result Message
    nameInterrupt(commandConfig([Message.CompletedWait, Schema.Never])),
  )
  Command.define(
    'InvalidMessages',
    // @ts-expect-error a valid result Message does not permit a never result Message
    argsConfig([Message.CompletedWait, Schema.Never]),
  )
  Command.define(
    'InvalidMessages',
    // @ts-expect-error a valid result Message does not permit a never result Message
    nameInterrupt(argsConfig([Message.CompletedWait, Schema.Never])),
  )
  Command.define(
    'InvalidMessages',
    // @ts-expect-error a valid result Message does not permit a never result Message
    keyedInterrupt(argsConfig([Message.CompletedWait, Schema.Never])),
  )
  Mount.define(
    'InvalidMessages',
    // @ts-expect-error a valid result Message does not permit a never result Message
    argsConfig([Message.CompletedWait, Schema.Never]),
  )
  Mount.define(
    'InvalidMessages',
    // @ts-expect-error a valid result Message does not permit a never result Message
    effectConfig([Message.CompletedWait, Schema.Never]),
  )
  Mount.defineStream(
    'InvalidMessages',
    // @ts-expect-error a valid result Message does not permit a never result Message
    streamConfig([Message.CompletedWait, Schema.Never]),
  )
  Mount.defineStream(
    'InvalidMessages',
    // @ts-expect-error a valid result Message does not permit a never result Message
    argsStreamConfig([Message.CompletedWait, Schema.Never]),
  )

  const NeverAlias = Schema.Never
  const TypedNever: Schema.Schema<never> = Schema.Never
  const TransformedNever = Schema.String.pipe(Schema.decodeTo(Schema.Never))
  const broadMessages: ReadonlyArray<Schema.Top> = [Message.CompletedWait]

  Command.define(
    'InvalidMessages',
    // @ts-expect-error aliased never Schemas are invalid even before a valid result Message
    commandConfig([NeverAlias, Message.CompletedWait]),
  )
  Mount.define(
    'InvalidMessages',
    // @ts-expect-error aliased never Schemas are invalid even before a valid result Message
    effectConfig([NeverAlias, Message.CompletedWait]),
  )
  Mount.defineStream(
    'InvalidMessages',
    // @ts-expect-error aliased never Schemas are invalid even before a valid result Message
    streamConfig([NeverAlias, Message.CompletedWait]),
  )

  Command.define(
    'InvalidMessages',
    // @ts-expect-error Schema.Schema<never> cannot declare a result Message
    commandConfig([TypedNever]),
  )
  Mount.define(
    'InvalidMessages',
    // @ts-expect-error Schema.Schema<never> cannot declare a result Message
    effectConfig([TypedNever]),
  )
  Mount.defineStream(
    'InvalidMessages',
    // @ts-expect-error Schema.Schema<never> cannot declare a result Message
    streamConfig([TypedNever]),
  )

  Command.define(
    'InvalidMessages',
    // @ts-expect-error the decoded type controls the result Message contract
    commandConfig([TransformedNever]),
  )
  Mount.define(
    'InvalidMessages',
    // @ts-expect-error the decoded type controls the result Message contract
    effectConfig([TransformedNever]),
  )
  Mount.defineStream(
    'InvalidMessages',
    // @ts-expect-error the decoded type controls the result Message contract
    streamConfig([TransformedNever]),
  )

  Command.define(
    'InvalidMessages',
    // @ts-expect-error broad arrays do not establish a non-empty Message tuple
    commandConfig(broadMessages),
  )
  Mount.define(
    'InvalidMessages',
    // @ts-expect-error broad arrays do not establish a non-empty Message tuple
    effectConfig(broadMessages),
  )
  Mount.defineStream(
    'InvalidMessages',
    // @ts-expect-error broad arrays do not establish a non-empty Message tuple
    streamConfig(broadMessages),
  )
  const checkSchemaAlternatives = (
    conditionalSchema: typeof Message.CompletedWait | typeof Schema.Never,
    typedConditionalSchema:
      | Schema.Schema<typeof Message.CompletedWait.Type>
      | Schema.Schema<never>,
    neverTail: readonly [
      typeof Message.CompletedWait,
      ...ReadonlyArray<typeof Schema.Never>,
    ],
    conditionalTail: readonly [
      typeof Message.CompletedWait,
      ...ReadonlyArray<typeof Message.CompletedReadValue | typeof Schema.Never>,
    ],
  ) => {
    Command.define(
      'InvalidAlternatives',
      // @ts-expect-error schema alternatives must not include a never result
      commandConfig([conditionalSchema]),
    )
    Mount.define(
      'InvalidAlternatives',
      // @ts-expect-error schema alternatives must not include a never result
      effectConfig([conditionalSchema]),
    )
    Mount.defineStream(
      'InvalidAlternatives',
      // @ts-expect-error schema alternatives must not include a never result
      streamConfig([conditionalSchema]),
    )
    Command.define(
      'InvalidAlternatives',
      // @ts-expect-error typed Schema alternatives must not include a never result
      commandConfig([typedConditionalSchema]),
    )
    Mount.define(
      'InvalidAlternatives',
      // @ts-expect-error typed Schema alternatives must not include a never result
      effectConfig([typedConditionalSchema]),
    )
    Mount.defineStream(
      'InvalidAlternatives',
      // @ts-expect-error typed Schema alternatives must not include a never result
      streamConfig([typedConditionalSchema]),
    )
    Command.define(
      'InvalidAlternatives',
      // @ts-expect-error rest entries must have a non-never decoded type
      commandConfig(neverTail),
    )
    Mount.define(
      'InvalidAlternatives',
      // @ts-expect-error rest entries must have a non-never decoded type
      effectConfig(neverTail),
    )
    Mount.defineStream(
      'InvalidAlternatives',
      // @ts-expect-error rest entries must have a non-never decoded type
      streamConfig(neverTail),
    )
    Command.define(
      'InvalidAlternatives',
      // @ts-expect-error rest entry alternatives must not include a never result
      commandConfig(conditionalTail),
    )
    Mount.define(
      'InvalidAlternatives',
      // @ts-expect-error rest entry alternatives must not include a never result
      effectConfig(conditionalTail),
    )
    Mount.defineStream(
      'InvalidAlternatives',
      // @ts-expect-error rest entry alternatives must not include a never result
      streamConfig(conditionalTail),
    )
  }
  void checkSchemaAlternatives
}
