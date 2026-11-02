import { Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Scene from 'foldkit/scene'
import { describe, expect, test } from 'vitest'

import { ChildBlock } from '../src/child/block.js'
import {
  NativeBlock,
  NativeDefinition,
  NativeMessage,
  NativeModel,
  PreboundDefinition,
} from '../src/native.js'
import { Message, ParentBlock } from '../src/parent.js'
import {
  FamilyBlock,
  FamilyLayer,
  SharedFamilyDefinition,
  FamilyCompletedTrackView,
} from '../src/sharedFamily.js'
import {
  SharedBlock,
  SharedDefinition,
  SharedNativeDefinition,
  SharedNamespace,
  TrackView,
} from '../src/sharedNamespace.js'

const erasedDefinition = (id: string, config: object): unknown =>
  Reflect.apply(Block.makeDefinition, undefined, [id, config])

describe('canonical Block authoring', () => {
  test('constructs a shared-owner family through the standalone helper', async () => {
    expect(SharedFamilyDefinition.owner).toBe(SharedNativeDefinition.owner)
    await Effect.runPromise(
      Scene.scene(
        FamilyBlock,
        Scene.init(),
        Scene.Mount.resolve(TrackView, FamilyCompletedTrackView()),
      ).pipe(Effect.provide(FamilyLayer)),
    )
  })

  test('rejects an erased forged namespace rather than creating a second owner', () => {
    expect(() =>
      Reflect.apply(Block.makeFamilyDefinition, undefined, [
        {},
        {
          key: Symbol('ForgedFamilyNamespace'),
          Model: NativeModel,
          Message: NativeMessage,
          Init: Schema.Tuple([]),
        },
      ]),
    ).toThrow('original Block namespace')
  })

  test('retains the original namespace owner for shared effect declarations', async () => {
    expect(SharedDefinition.owner).toBe(SharedNativeDefinition.owner)
    await Effect.runPromise(
      Effect.scoped(
        Effect.map(SharedBlock.get, block => {
          expect(block.init().model).toEqual({ label: 'Shared' })
        }).pipe(Effect.provide(SharedBlock.layer)),
      ),
    )
  })

  test('retains native completion and selects the immutable prebound contract', () => {
    expect('contract' in NativeDefinition).toBe(false)
    expect('makeBlock' in NativeDefinition).toBe(false)
    expect('contract' in PreboundDefinition).toBe(true)
    expect('makeBlock' in PreboundDefinition).toBe(true)
    expect(NativeBlock.init().model).toEqual({ count: 0 })
  })

  test('constructs the private child graph and executes imported parent operations', async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const parent = yield* ParentBlock.get
          const parentInit = parent.init()
          expect(parentInit.model).toEqual({
            child: { count: 1 },
            lastCount: 1,
          })

          const resetCount = parent.update(
            parentInit.model,
            Message.ClickedResetCount(),
          )
          expect(resetCount.model).toEqual({
            child: { count: 0 },
            lastCount: 0,
          })
        }).pipe(Effect.provide(ParentBlock.layer)),
      ),
    )
    expect(ChildBlock.Model).toBeDefined()
  })

  test('never treats incomplete or forged contract fields as native configuration', () => {
    const key = Symbol('ErasedCanonical')
    expect(() =>
      erasedDefinition('MissingKey', {
        Model: NativeModel,
        Message: NativeMessage,
        Init: Schema.Tuple([]),
      }),
    ).toThrow('requires both')
    expect(() =>
      erasedDefinition('MissingInit', {
        key,
        Model: NativeModel,
        Message: NativeMessage,
      }),
    ).toThrow('requires both')
    expect(() =>
      erasedDefinition('ForgedKey', {
        key: 'forged',
        Model: NativeModel,
        Message: NativeMessage,
        Init: Schema.Tuple([]),
      }),
    ).toThrow('unique symbol key')
    expect(() =>
      erasedDefinition('UnsupportedNative', {
        Model: NativeModel,
        Message: NativeMessage,
        unsupported: true,
      }),
    ).toThrow('not supported')
    expect(() =>
      Reflect.apply(SharedNamespace.makeDefinition, undefined, [
        {
          Model: NativeModel,
          Message: NativeMessage,
          Init: Schema.Tuple([]),
        },
      ]),
    ).toThrow('requires both')
    expect(() =>
      Reflect.apply(SharedNamespace.makeDefinition, undefined, [
        {
          key,
          Model: NativeModel,
          Message: NativeMessage,
        },
      ]),
    ).toThrow('requires both')
  })
})
