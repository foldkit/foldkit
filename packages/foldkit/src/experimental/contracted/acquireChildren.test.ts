import { Effect, Exit, Layer, Schema } from 'effect'
import { vi } from 'vitest'

import { describe, expect, it } from '@effect/vitest'

import * as Block from '../../block/public.js'
import { symbolicConnectionOf } from '../constructed/symbolic.js'

describe('Composition.acquireChildren', () => {
  it('rejects the removed Init key for an erased Block declaration', () => {
    expect(() =>
      Reflect.apply(Block.make, undefined, [
        'BulkAcquisitionRemovedInit',
        {
          key: Symbol('BulkAcquisitionRemovedInit'),
          Model: Schema.Null,
          Message: Schema.Never,
          Init: Schema.Tuple([]),
        },
      ]),
    ).toThrow('InitArgs')
  })

  it.effect(
    'acquires the registered tuple passively and preserves its construction scope',
    () =>
      Effect.gen(function* () {
        const firstConstructorAcquire = vi.fn()
        const firstConstructorRelease = vi.fn()
        const secondConstructorAcquire = vi.fn()
        const secondConstructorRelease = vi.fn()
        const parentConstructorRelease = vi.fn()
        const firstInitRun = vi.fn()
        const secondInitRun = vi.fn()
        const firstEffectsAcquire = vi.fn()
        const firstEffectsRelease = vi.fn()

        const FirstKey = Symbol('BulkAcquisitionFirst')
        const First = Block.make('BulkAcquisitionFirst', {
          key: FirstKey,
          Model: Schema.Struct({ first: Schema.String }),
          Message: Schema.Never,
          isMessageFree: true,
          InitArgs: Schema.Tuple([]),
        })
        const FirstComposition = First.makeComposition()
        const firstInit = FirstComposition.makeInit(() => {
          firstInitRun()
          return { model: { first: 'first' } }
        })
        const firstEffectsLayer = Layer.effectDiscard(
          Effect.acquireRelease(Effect.sync(firstEffectsAcquire), () =>
            Effect.sync(firstEffectsRelease),
          ),
        )
        const firstLayer = First.makeLayer(
          Effect.acquireRelease(
            Effect.sync(() => {
              firstConstructorAcquire()
              return {
                children: [],
                init: firstInit,
                update: FirstComposition.makeUpdate({}),
                EffectsLayer: firstEffectsLayer,
              }
            }),
            () => Effect.sync(firstConstructorRelease),
          ),
        )

        const SecondKey = Symbol('BulkAcquisitionSecond')
        const Second = Block.make('BulkAcquisitionSecond', {
          key: SecondKey,
          Model: Schema.Struct({ second: Schema.Number }),
          Message: Schema.Never,
          isMessageFree: true,
          InitArgs: Schema.Tuple([]),
        })
        const SecondComposition = Second.makeComposition()
        const secondInit = SecondComposition.makeInit(() => {
          secondInitRun()
          return { model: { second: 2 } }
        })
        const secondLayer = Second.makeLayer(
          Effect.acquireRelease(
            Effect.sync(() => {
              secondConstructorAcquire()
              return {
                children: [],
                init: secondInit,
                update: SecondComposition.makeUpdate({}),
              }
            }),
            () => Effect.sync(secondConstructorRelease),
          ),
        )

        const ParentKey = Symbol('BulkAcquisitionParent')
        const Parent = Block.make('BulkAcquisitionParent', {
          key: ParentKey,
          Model: Schema.Struct({
            first: First.Model,
            second: Second.Model,
          }),
          Message: Schema.Never,
          isMessageFree: true,
          InitArgs: Schema.Tuple([]),
        })
        const FirstBinding = Parent.makeRequiredFieldBinding(First, {
          field: 'first',
        })
        const SecondBinding = Parent.makeRequiredFieldBinding(Second, {
          field: 'second',
        })
        const ParentComposition = Parent.makeComposition({
          bindings: [FirstBinding, SecondBinding],
        })
        const acquisition = ParentComposition.acquireChildren()

        expect(firstConstructorAcquire).not.toHaveBeenCalled()
        expect(secondConstructorAcquire).not.toHaveBeenCalled()
        expect(firstInitRun).not.toHaveBeenCalled()
        expect(secondInitRun).not.toHaveBeenCalled()

        const parentLayer = Parent.makeLayer(
          Effect.gen(function* () {
            const children = yield* acquisition
            const [firstChild, secondChild] = children

            expect(symbolicConnectionOf(firstChild).binding).toBe(FirstBinding)
            expect(symbolicConnectionOf(secondChild).binding).toBe(
              SecondBinding,
            )
            expect(Object.isFrozen(children)).toBe(true)

            yield* Effect.acquireRelease(Effect.void, () =>
              Effect.sync(parentConstructorRelease),
            )

            return {
              children,
              init: ParentComposition.makeInit(() => ({ model: {} })),
              update: ParentComposition.makeUpdate({}),
            }
          }),
        )

        yield* Effect.scoped(
          Effect.asVoid(
            Layer.build(
              Layer.provide(parentLayer, Layer.merge(firstLayer, secondLayer)),
            ),
          ),
        )

        expect(firstConstructorAcquire).toHaveBeenCalledOnce()
        expect(secondConstructorAcquire).toHaveBeenCalledOnce()
        expect(firstConstructorRelease).toHaveBeenCalledOnce()
        expect(secondConstructorRelease).toHaveBeenCalledOnce()
        expect(parentConstructorRelease).toHaveBeenCalledOnce()
        expect(firstInitRun).not.toHaveBeenCalled()
        expect(secondInitRun).not.toHaveBeenCalled()
        expect(firstEffectsAcquire).not.toHaveBeenCalled()
        expect(firstEffectsRelease).not.toHaveBeenCalled()
      }),
  )

  it.effect('returns one frozen empty tuple for a childless Composition', () =>
    Effect.gen(function* () {
      const ChildlessKey = Symbol('BulkAcquisitionChildless')
      const Childless = Block.make('BulkAcquisitionChildless', {
        key: ChildlessKey,
        Model: Schema.Null,
        Message: Schema.Never,
        isMessageFree: true,
        InitArgs: Schema.Tuple([]),
      })

      const children = yield* Childless.makeComposition().acquireChildren()

      expect(children).toEqual([])
      expect(Object.isFrozen(children)).toBe(true)
    }),
  )

  it.effect(
    'releases an acquired child when a later child construction fails',
    () =>
      Effect.gen(function* () {
        const releaseFirst = vi.fn()
        const initializeFirst = vi.fn()
        const FirstKey = Symbol('BulkAcquisitionBeforeFailure')
        const First = Block.make('BulkAcquisitionBeforeFailure', {
          key: FirstKey,
          Model: Schema.Null,
          Message: Schema.Never,
          isMessageFree: true,
          InitArgs: Schema.Tuple([]),
        })
        const FirstComposition = First.makeComposition()
        const firstLayer = First.makeLayer(
          Effect.acquireRelease(
            Effect.sync(() => ({
              children: [],
              init: FirstComposition.makeInit(() => {
                initializeFirst()
                return { model: null }
              }),
              update: FirstComposition.makeUpdate({}),
            })),
            () => Effect.sync(releaseFirst),
          ),
        )
        const SecondKey = Symbol('BulkAcquisitionFailedChild')
        const Second = Block.make('BulkAcquisitionFailedChild', {
          key: SecondKey,
          Model: Schema.Null,
          Message: Schema.Never,
          isMessageFree: true,
          InitArgs: Schema.Tuple([]),
        })
        const SecondComposition = Second.makeComposition()
        const secondLayer = Second.makeLayer(
          Effect.fail('Child construction failed').pipe(
            Effect.as({
              children: [],
              init: SecondComposition.makeInit(() => ({ model: null })),
              update: SecondComposition.makeUpdate({}),
            }),
          ),
        )
        const ParentKey = Symbol('BulkAcquisitionWithFailure')
        const Parent = Block.make('BulkAcquisitionWithFailure', {
          key: ParentKey,
          Model: Schema.Struct({ first: Schema.Null, second: Schema.Null }),
          Message: Schema.Never,
          isMessageFree: true,
          InitArgs: Schema.Tuple([]),
        })
        const FirstBinding = Parent.makeRequiredFieldBinding(First, {
          field: 'first',
        })
        const SecondBinding = Parent.makeRequiredFieldBinding(Second, {
          field: 'second',
        })
        const ParentComposition = Parent.makeComposition({
          bindings: [FirstBinding, SecondBinding],
        })
        const construction = yield* ParentComposition.acquireChildren().pipe(
          Effect.provide(Layer.merge(firstLayer, secondLayer)),
          Effect.scoped,
          Effect.exit,
        )

        expect(Exit.isFailure(construction)).toBe(true)
        expect(releaseFirst).toHaveBeenCalledOnce()
        expect(initializeFirst).not.toHaveBeenCalled()
      }),
  )
})
