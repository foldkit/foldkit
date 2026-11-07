import { Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import * as Block from '../../block/public.js'
import {
  defineInMessageUnion,
  defineMessageUnion,
} from '../../message/index.js'

const Model = Schema.Struct({ value: Schema.Number })
const Message = defineMessageUnion({ ChangedValue: {} })
const InMessage = defineInMessageUnion({
  RequestedSet: { value: Schema.Number },
})

describe('Definition declaration snapshots', () => {
  it('snapshots family namespace declarations before creating a native source', () => {
    const Namespace = Block.makeNamespace('AccessorFamilyDefinition')
    let reads = 0
    const config = {
      key: Symbol('AccessorFamilyDefinition'),
      get Model() {
        reads += 1
        return Model
      },
      Message,
      InitArgs: Schema.Tuple([]),
    }

    expect(() =>
      Reflect.apply(Block.makeFamilyDefinition, undefined, [Namespace, config]),
    ).toThrow(/accessor/i)
    expect(reads).toBe(0)
  })

  it('rejects accessor-backed top-level contract fields without running the getter', () => {
    let reads = 0
    const config = {
      key: Symbol('AccessorDefinition'),
      Model,
      Message,
      InitArgs: Schema.Tuple([]),
      get InMessage() {
        reads += 1
        return InMessage
      },
    }

    expect(() =>
      Reflect.apply(Block.makeDefinition, undefined, [
        'AccessorDefinition',
        config,
      ]),
    ).toThrow(/accessor/i)
    expect(reads).toBe(0)
  })

  it('rejects accessor-backed nested input output channels without running the getter', () => {
    let reads = 0
    const inMessageOutputs = Object.defineProperty({}, 'RequestedSet', {
      enumerable: true,
      get() {
        reads += 1
        return {}
      },
    })

    expect(() =>
      Reflect.apply(Block.makeDefinition, undefined, [
        'NestedAccessorDefinition',
        {
          key: Symbol('NestedAccessorDefinition'),
          Model,
          Message,
          InMessage,
          InitArgs: Schema.Tuple([]),
          inMessageOutputs,
        },
      ]),
    ).toThrow(/accessor/i)
    expect(reads).toBe(0)
  })

  it('snapshots non-enumerable nested declarations before validation', () => {
    let reads = 0
    const output = Object.defineProperty({}, 'outMessage', {
      get() {
        reads += 1
        return Message
      },
    })
    const inMessageOutputs = Object.defineProperty({}, 'RequestedSet', {
      value: output,
    })

    expect(() =>
      Reflect.apply(Block.makeDefinition, undefined, [
        'NonEnumerableNestedAccessorDefinition',
        {
          key: Symbol('NonEnumerableNestedAccessorDefinition'),
          Model,
          Message,
          InMessage,
          InitArgs: Schema.Tuple([]),
          inMessageOutputs,
        },
      ]),
    ).toThrow(/accessor/i)
    expect(reads).toBe(0)
  })

  it('rejects retired codec declarations from erased callers', () => {
    expect(() =>
      Reflect.apply(Block.makeDefinition, undefined, [
        'RetiredCodecDefinition',
        {
          key: Symbol('RetiredCodecDefinition'),
          Model,
          Message,
          InitArgs: Schema.Tuple([]),
          codec: { decoding: [], encoding: [] },
        },
      ]),
    ).toThrow(/codec declarations are no longer supported/i)
  })
})
