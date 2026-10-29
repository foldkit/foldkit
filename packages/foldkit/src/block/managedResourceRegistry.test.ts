import { Context, Data, Effect, Layer, Option, Schema } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import * as ManagedResource from '../managedResource/index.js'
import { makeDefinition } from './define.js'

const Model = Schema.Struct({ active: Schema.Boolean })
type Model = typeof Model.Type
const Message = Schema.Struct({ value: Schema.String })
type Message = typeof Message.Type
const message = (value: string): Message => Message.make({ value })

class FirstDependency extends Context.Service<
  FirstDependency,
  Readonly<{ prefix: string }>
>()('ManagedResourceRegistryFirstDependency') {}

class SecondDependency extends Context.Service<
  SecondDependency,
  Readonly<{ suffix: string }>
>()('ManagedResourceRegistrySecondDependency') {}

class ConstructorFailure extends Data.TaggedError('ConstructorFailure')<{}> {}

const StringResource = ManagedResource.tag<string>()(
  'ManagedResourceRegistryString',
)
const NumberResource = ManagedResource.tag<number>()(
  'ManagedResourceRegistryNumber',
)

const RegistryDefinition = makeDefinition('ManagedResourceRegistry', {
  Model,
  Message,
})

const attached = RegistryDefinition.makeManagedResources(entry => ({
  connection: entry('ManageConnection', Schema.Option(Schema.Null), {
    resource: StringResource,
    modelToMaybeRequirements: model =>
      model.active ? Option.some(null) : Option.none(),
    onAcquired: message,
    onReleased: () => message('released'),
    onAcquireError: () => message('failed'),
    handler: function* () {
      const { prefix } = yield* FirstDependency
      return {
        acquire: () =>
          Effect.map(SecondDependency, ({ suffix }) => `${prefix}${suffix}`),
        release: () => Effect.void,
      }
    },
  }),
  counter: entry('ManageCounter', Schema.Option(Schema.Null), {
    resource: NumberResource,
    modelToMaybeRequirements: () => Option.none(),
    onAcquired: value => message(globalThis.String(value)),
    onReleased: () => message('released'),
    onAcquireError: () => message('failed'),
    handler: function* () {
      return yield* Effect.fail(new ConstructorFailure())
    },
  }),
}))

const hosted = RegistryDefinition.makeManagedResources(entry => ({
  connection: entry('HostConnection', Schema.Option(Schema.Null), {
    resource: StringResource,
    modelToMaybeRequirements: () => Option.none(),
    onAcquired: message,
    onReleased: () => message('released'),
    onAcquireError: () => message('failed'),
  }),
}))

describe('Definition ManagedResource registry', () => {
  it('exposes an exact nonenumerable aggregate Layer only for complete attached registries', () => {
    type ExpectedHandlers =
      | ManagedResource.HandlerOf<typeof attached.connection>
      | ManagedResource.HandlerOf<typeof attached.counter>

    expectTypeOf<
      Layer.Success<typeof attached.layer>
    >().toEqualTypeOf<ExpectedHandlers>()
    expectTypeOf<
      Layer.Error<typeof attached.layer>
    >().toEqualTypeOf<ConstructorFailure>()
    expectTypeOf<Layer.Services<typeof attached.layer>>().toEqualTypeOf<
      FirstDependency | SecondDependency
    >()
    expectTypeOf(hosted).not.toHaveProperty('layer')

    expect(Object.keys(attached)).toEqual(['connection', 'counter'])
    expect(Object.getOwnPropertyDescriptor(attached, 'layer')).toMatchObject({
      enumerable: false,
    })
    expect(
      Object.getOwnPropertyDescriptor(
        attached,
        ManagedResource.RegistryEntriesTypeId,
      ),
    ).toMatchObject({ enumerable: false })
    expect('layer' in hosted).toBe(false)
  })

  it('adds Layer.empty to an empty registry', () => {
    const empty = RegistryDefinition.makeManagedResources(() => ({}))

    expectTypeOf(empty.layer).toEqualTypeOf<Layer.Layer<never>>()
    expect(empty.layer).toBe(Layer.empty)
    expect(Object.keys(empty)).toEqual([])
  })

  it('reserves the registry key without reserving an entry local name', () => {
    const resources = RegistryDefinition.makeManagedResources(entry => ({
      legallyKeyed: entry('layer', Schema.Option(Schema.Null), {
        resource: StringResource,
        modelToMaybeRequirements: () => Option.none(),
        onAcquired: message,
        onReleased: () => message('released'),
        onAcquireError: () => message('failed'),
        handler: function* () {
          return {
            acquire: () => Effect.succeed('value'),
            release: () => Effect.void,
          }
        },
      }),
    }))

    expect(Object.hasOwn(resources, 'legallyKeyed')).toBe(true)
    expect(Layer.isLayer(resources.layer)).toBe(true)
  })

  it('preserves constructor failures and remains passive until the Layer is built', async () => {
    expect(() => attached).not.toThrow()

    await expect(
      Effect.runPromise(
        Effect.scoped(
          Layer.build(attached.layer).pipe(
            Effect.provideService(FirstDependency, { prefix: 'prefix:' }),
            Effect.provideService(SecondDependency, { suffix: ':suffix' }),
          ),
        ),
      ),
    ).rejects.toMatchObject({ _tag: 'ConstructorFailure' })
  })

  it('builds once, preserves entry identity, and performs acquire and release through the registry Layer', async () => {
    let builds = 0
    let acquisitions = 0
    let releases = 0
    const resources = RegistryDefinition.makeManagedResources(entry => ({
      connection: entry(
        'ManageLifecycleConnection',
        Schema.Option(Schema.Null),
        {
          resource: StringResource,
          modelToMaybeRequirements: () => Option.none(),
          onAcquired: message,
          onReleased: () => message('released'),
          onAcquireError: () => message('failed'),
          handler: function* () {
            yield* Effect.sync(() => {
              builds += 1
            })
            return {
              acquire: () =>
                Effect.sync(() => {
                  acquisitions += 1
                  return 'value'
                }),
              release: () =>
                Effect.sync(() => {
                  releases += 1
                }),
            }
          },
        },
      ),
    }))
    const aggregated = ManagedResource.aggregate(resources)
    const originalEntry = resources.connection

    expect(builds).toBe(0)
    expect(acquisitions).toBe(0)
    expect(aggregated.connection).toBe(originalEntry)
    expect(Object.keys(aggregated)).toEqual(['connection'])

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context
          const value = yield* resources.connection.acquire(null)
          // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context
          yield* resources.connection.release(value)
        }).pipe(Effect.provide(resources.layer)),
      ),
    )

    expect(builds).toBe(1)
    expect(acquisitions).toBe(1)
    expect(releases).toBe(1)
  })

  it('removes registry metadata from aggregate and lift', () => {
    const complete = RegistryDefinition.makeManagedResources(entry => ({
      connection: entry('ManageLiftedConnection', Schema.Option(Schema.Null), {
        resource: StringResource,
        modelToMaybeRequirements: () => Option.none(),
        onAcquired: message,
        onReleased: () => message('released'),
        onAcquireError: () => message('failed'),
        handler: function* () {
          return {
            acquire: () => Effect.succeed('value'),
            release: () => Effect.void,
          }
        },
      }),
    }))
    const aggregated = ManagedResource.aggregate(complete)
    const lifted = ManagedResource.lift(complete)<
      Readonly<{ child: Model }>,
      Message
    >({
      read: model => Option.some(model.child),
      toParentMessage: parentMessage => parentMessage,
    })

    expect(Object.keys(aggregated)).toEqual(['connection'])
    expect(Object.keys(lifted)).toEqual(['connection'])
  })

  it('keeps layer as an ordinary key in low-level entry records', () => {
    const aggregated = ManagedResource.aggregate({
      layer: attached.connection,
    })

    expect(Object.keys(aggregated)).toEqual(['layer'])
    expect(aggregated.layer).toBe(attached.connection)
  })

  it('normalizes nonenumerable inputs into enumerable runtime entries', () => {
    const complete = RegistryDefinition.makeManagedResources(entry => {
      const hidden = entry(
        'ManageHiddenConnection',
        Schema.Option(Schema.Null),
        {
          resource: StringResource,
          modelToMaybeRequirements: () => Option.none(),
          onAcquired: message,
          onReleased: () => message('released'),
          onAcquireError: () => message('failed'),
          handler: function* () {
            return {
              acquire: () => Effect.succeed('value'),
              release: () => Effect.void,
            }
          },
        },
      )
      const entries = { hidden }
      Object.defineProperty(entries, 'hidden', {
        enumerable: false,
        value: hidden,
      })
      return entries
    })
    const aggregated = ManagedResource.aggregate(complete)
    const lifted = ManagedResource.lift(complete)<
      Readonly<{ child: Model }>,
      Message
    >({
      read: model => Option.some(model.child),
      toParentMessage: parentMessage => parentMessage,
    })

    expect(Object.keys(complete)).toEqual(['hidden'])
    expect(Object.isFrozen(complete)).toBe(true)
    expect(Reflect.set(complete, 'hidden', complete.hidden)).toBe(false)
    expect(Reflect.deleteProperty(complete, 'hidden')).toBe(false)
    expect(
      Object.isFrozen(
        Reflect.get(complete, ManagedResource.RegistryEntriesTypeId),
      ),
    ).toBe(true)
    expect(Reflect.ownKeys(complete)).toEqual([
      'hidden',
      'layer',
      ManagedResource.RegistryEntriesTypeId,
    ])
    expect(Object.hasOwn(aggregated, 'hidden')).toBe(true)
    expect(Object.hasOwn(lifted, 'hidden')).toBe(true)
    expect(Object.keys(aggregated)).toEqual(['hidden'])
    expect(Object.keys(lifted)).toEqual(['hidden'])
    expect(Layer.isLayer(complete.layer)).toBe(true)
  })

  it('rejects layer as an entry key at runtime', () => {
    expect(() =>
      Reflect.apply(RegistryDefinition.makeManagedResources, undefined, [
        (entry: ManagedResource.EntryBuilder<Model, Message>) => ({
          layer: entry('ReservedLayer', Schema.Option(Schema.Null), {
            resource: StringResource,
            modelToMaybeRequirements: () => Option.none(),
            onAcquired: message,
            onReleased: () => message('released'),
            onAcquireError: () => message('failed'),
          }),
        }),
      ]),
    ).toThrow(/reserves "layer"/u)
  })

  it('rejects symbol registration keys and inherited registry shapes', () => {
    const SymbolEntry = Symbol('SymbolEntry')

    expect(() =>
      Reflect.apply(RegistryDefinition.makeManagedResources, undefined, [
        (entry: ManagedResource.EntryBuilder<Model, Message>) => ({
          [SymbolEntry]: entry('SymbolResource', Schema.Option(Schema.Null), {
            resource: StringResource,
            modelToMaybeRequirements: () => Option.none(),
            onAcquired: message,
            onReleased: () => message('released'),
            onAcquireError: () => message('failed'),
          }),
        }),
      ]),
    ).toThrow(/registration keys must be own string properties/u)

    expect(() =>
      Reflect.apply(RegistryDefinition.makeManagedResources, undefined, [
        (entry: ManagedResource.EntryBuilder<Model, Message>) =>
          Object.create({
            inherited: entry('InheritedResource', Schema.Option(Schema.Null), {
              resource: StringResource,
              modelToMaybeRequirements: () => Option.none(),
              onAcquired: message,
              onReleased: () => message('released'),
              onAcquireError: () => message('failed'),
            }),
          }),
      ]),
    ).toThrow(/own resource entries, not inherited entries/u)

    const inherited = Object.create({ connection: attached.connection })
    expect(() =>
      Reflect.apply(ManagedResource.aggregate, undefined, [inherited]),
    ).toThrow(/own resource entries, not inherited entries/u)

    const symbolEntries = { connection: attached.connection }
    Object.defineProperty(symbolEntries, SymbolEntry, {
      value: attached.connection,
    })
    expect(() =>
      Reflect.apply(ManagedResource.aggregate, undefined, [symbolEntries]),
    ).toThrow(/registration keys must be own string properties/u)
  })

  it('rejects an attached entry whose Layer was erased to an invalid value', () => {
    expect(() =>
      Reflect.apply(RegistryDefinition.makeManagedResources, undefined, [
        (entry: ManagedResource.EntryBuilder<Model, Message>) => {
          const corrupted = entry(
            'CorruptedLayer',
            Schema.Option(Schema.Null),
            {
              resource: StringResource,
              modelToMaybeRequirements: () => Option.none(),
              onAcquired: message,
              onReleased: () => message('released'),
              onAcquireError: () => message('failed'),
              handler: function* () {
                return {
                  acquire: () => Effect.succeed('value'),
                  release: () => Effect.void,
                }
              },
            },
          )
          Object.defineProperty(corrupted, 'layer', { value: 'invalid' })
          return { corrupted }
        },
      ]),
    ).toThrow(/not an Effect Layer/u)
  })
})
