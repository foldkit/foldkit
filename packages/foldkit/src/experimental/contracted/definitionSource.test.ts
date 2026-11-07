import { Effect, Schema } from 'effect'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import * as Block from '../../block/public.js'
import { defineMessageUnion } from '../../message/index.js'
import { withBlock } from '../layered/testing/withBlock.js'

const acquireErased = (block: object) =>
  Reflect.apply(Effect.runPromise, undefined, [
    Reflect.apply(withBlock, undefined, [block, () => undefined]),
  ])

describe('Definition-owned construction plans', () => {
  it('rejects another Definition with the same Namespace and Model but different local Messages', async () => {
    const Namespace = Block.makeNamespace('DifferentMessageConstructionSource')
    const Model = Schema.Struct({ count: Schema.Number })
    const FirstMessage = defineMessageUnion({ UpdatedFirst: {} })
    const SecondMessage = defineMessageUnion({ UpdatedSecond: {} })
    const FirstKey = Symbol('FirstConstructionSource')
    const SecondKey = Symbol('SecondConstructionSource')
    const FirstDefinition = Namespace.makeDefinition({
      key: FirstKey,
      Model,
      Message: FirstMessage,
      InitArgs: Schema.Tuple([]),
    })
    const SecondDefinition = Namespace.makeDefinition({
      key: SecondKey,
      Model,
      Message: SecondMessage,
      InitArgs: Schema.Tuple([]),
    })
    const SecondComposition = SecondDefinition.makeComposition()
    const foreign = Reflect.apply(FirstDefinition.makeBlock, undefined, [
      Effect.succeed({
        children: [],
        init: SecondComposition.makeInit(() => ({ model: { count: 0 } })),
        update: SecondComposition.makeUpdate({
          UpdatedSecond: model => ({ model }),
        }),
      }),
    ])

    await expect(acquireErased(foreign)).rejects.toThrow(
      'Constructor plans belong to another Definition',
    )
  })

  it('rejects another Definition even when all Model and Message Schemas match and closes its constructor Scope', async () => {
    const Namespace = Block.makeNamespace('SameSchemaConstructionSource')
    const Model = Schema.Struct({ count: Schema.Number })
    const Message = defineMessageUnion({ UpdatedCount: {} })
    const FirstKey = Symbol('FirstSameSchemaSource')
    const SecondKey = Symbol('SecondSameSchemaSource')
    const FirstDefinition = Namespace.makeDefinition({
      key: FirstKey,
      Model,
      Message,
      InitArgs: Schema.Tuple([]),
    })
    const SecondDefinition = Namespace.makeDefinition({
      key: SecondKey,
      Model,
      Message,
      InitArgs: Schema.Tuple([Schema.String]),
    })
    const SecondComposition = SecondDefinition.makeComposition()
    const events: Array<string> = []
    const foreign = Reflect.apply(FirstDefinition.makeBlock, undefined, [
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            events.push('Acquired')
          }),
          () =>
            Effect.sync(() => {
              events.push('Released')
            }),
        )

        return {
          children: [],
          init: SecondComposition.makeInit(label => ({
            model: { count: label.length },
          })),
          update: SecondComposition.makeUpdate({
            UpdatedCount: model => ({ model }),
          }),
        }
      }),
    ])

    await expect(acquireErased(foreign)).rejects.toThrow(
      'Constructor plans belong to another Definition',
    )
    expect(events).toEqual(['Acquired', 'Released'])
  })

  it('authenticates and compiles one init snapshot when an erased constructor exposes a changing accessor', async () => {
    const Namespace = Block.makeNamespace('ChangingInitConstructionSource')
    const Model = Schema.Struct({ count: Schema.Number })
    const FirstMessage = defineMessageUnion({ UpdatedFirst: {} })
    const SecondMessage = defineMessageUnion({ UpdatedSecond: {} })
    const FirstKey = Symbol('FirstChangingInitSource')
    const SecondKey = Symbol('SecondChangingInitSource')
    const FirstDefinition = Namespace.makeDefinition({
      key: FirstKey,
      Model,
      Message: FirstMessage,
      InitArgs: Schema.Tuple([]),
    })
    const SecondDefinition = Namespace.makeDefinition({
      key: SecondKey,
      Model,
      Message: SecondMessage,
      InitArgs: Schema.Tuple([]),
    })
    const FirstComposition = FirstDefinition.makeComposition()
    const SecondComposition = SecondDefinition.makeComposition()
    const initializations = { count: 0 }
    const initialize = () => {
      initializations.count += 1

      return { model: { count: 0 } }
    }
    const firstInit = FirstComposition.makeInit(initialize)
    const secondInit = SecondComposition.makeInit(initialize)
    const initReads = { count: 0 }
    const foreign = Reflect.apply(FirstDefinition.makeBlock, undefined, [
      Effect.succeed({
        children: [],
        get init() {
          initReads.count += 1

          return initReads.count === 1 ? firstInit : secondInit
        },
        update: SecondComposition.makeUpdate({
          UpdatedSecond: model => ({ model }),
        }),
      }),
    ])

    await expect(acquireErased(foreign)).rejects.toThrow(
      'A hybrid plan belongs to another static Composition',
    )
    expect(initReads.count).toBe(1)
    expect(initializations.count).toBe(0)
  })

  it('rejects non-enumerable owned operations in a constructor body', async () => {
    const Key = Symbol('NonEnumerableOperationsSource')
    const Definition = Block.makeDefinition('NonEnumerableOperationsSource', {
      key: Key,
      Model: Schema.Number,
      Message: Schema.Never,
      isMessageFree: true,
      InitArgs: Schema.Tuple([]),
    })
    const Composition = Definition.makeComposition()
    const body = Object.defineProperty(
      {
        children: [],
        init: Composition.makeInit(() => ({ model: 0 })),
        update: Composition.makeUpdate({}),
      },
      'operations',
      { value: {} },
    )
    const block = Reflect.apply(Definition.makeBlock, undefined, [
      Effect.succeed(body),
    ])

    await expect(acquireErased(block)).rejects.toThrow(
      'Contract operations are declared once on the Definition',
    )
  })

  it.effect(
    'accepts multiple original Compositions from one Definition and keeps init deferred',
    () =>
      Effect.gen(function* () {
        const Model = Schema.Struct({ count: Schema.Number })
        const Message = defineMessageUnion({ UpdatedCount: {} })
        const Key = Symbol('OwnCompositionConstructionSource')
        const Definition = Block.makeDefinition(
          'OwnCompositionConstructionSource',
          {
            key: Key,
            Model,
            Message,
            InitArgs: Schema.Tuple([Schema.String]),
          },
        )
        const FirstComposition = Definition.makeComposition()
        const SecondComposition = Definition.makeComposition()
        const initializations = { count: 0 }
        const initialize = (label: string) => {
          initializations.count += 1

          return { model: { count: label.length } }
        }
        const FirstBlock = Definition.makeBlock(
          Effect.succeed({
            children: [],
            init: FirstComposition.makeInit(initialize),
            update: FirstComposition.makeUpdate({
              UpdatedCount: model => ({ model }),
            }),
          }),
        )
        const SecondBlock = Definition.makeBlock(
          Effect.succeed({
            children: [],
            init: SecondComposition.makeInit(initialize),
            update: SecondComposition.makeUpdate({
              UpdatedCount: model => ({ model }),
            }),
          }),
        )

        expect(initializations.count).toBe(0)
        yield* withBlock(FirstBlock, block => {
          expect(initializations.count).toBe(0)
          expect(block.init('First').model.count).toBe(5)
        })
        yield* withBlock(SecondBlock, block => {
          expect(initializations.count).toBe(1)
          expect(block.init('Second').model.count).toBe(6)
        })
        expect(initializations.count).toBe(2)
      }),
  )
})
