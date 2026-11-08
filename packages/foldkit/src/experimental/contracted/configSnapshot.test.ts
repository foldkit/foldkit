import { Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import * as Block from '../../block/public.js'
import {
  defineInMessageUnion,
  defineMessageUnion,
} from '../../message/index.js'
import { snapshotDefinitionConfiguration } from './runtime.js'

const Model = Schema.Struct({ value: Schema.Number })
const Message = defineMessageUnion({ ChangedValue: {} })
const InMessage = defineInMessageUnion({
  RequestedSet: { value: Schema.Number },
})

describe('Definition declaration snapshots', () => {
  it('snapshots explicit viewless and default-Element declarations without evaluating implementation work', () => {
    const inputs = Schema.Struct({ label: Schema.String })
    const mounts: Array<never> = []
    const view = { Inputs: inputs, mounts }
    const defaultSnapshot = snapshotDefinitionConfiguration({
      key: Symbol('OmittedDefaultElementSnapshot'),
      Model,
      Message,
      InitArgs: Schema.Tuple([]),
    })
    const elementSnapshot = snapshotDefinitionConfiguration({
      key: Symbol('DefaultElementSnapshot'),
      Model,
      Message,
      InitArgs: Schema.Tuple([]),
      view,
    })
    const viewlessSnapshot = snapshotDefinitionConfiguration({
      key: Symbol('ViewlessSnapshot'),
      Model,
      Message,
      InitArgs: Schema.Tuple([]),
      view: false,
    })

    Reflect.set(view, 'Inputs', Schema.Number)

    expect(elementSnapshot.view).not.toBe(view)
    expect(elementSnapshot.view.Inputs).toBe(inputs)
    expect(elementSnapshot.view.mounts).not.toBe(mounts)
    expect(Object.isFrozen(elementSnapshot.view.mounts)).toBe(true)
    expect(Object.isFrozen(elementSnapshot.view)).toBe(true)
    expect(Object.isFrozen(elementSnapshot)).toBe(true)
    expect(Object.hasOwn(defaultSnapshot, 'view')).toBe(false)
    expect(Object.isFrozen(defaultSnapshot)).toBe(true)
    expect(viewlessSnapshot.view).toBe(false)
    expect(Object.isFrozen(viewlessSnapshot)).toBe(true)
  })

  it('rejects erased invalid view kinds and Document inputs', () => {
    const base = {
      Model,
      Message,
      InitArgs: Schema.Tuple([]),
    }

    expect(() =>
      Reflect.apply(Block.make, undefined, [
        'InvalidViewKind',
        { ...base, key: Symbol('InvalidViewKind'), view: { kind: 'Canvas' } },
      ]),
    ).toThrow(/view kind must be "Element" or "Document"/i)
    expect(() =>
      Reflect.apply(Block.make, undefined, [
        'InvalidDocumentInputs',
        {
          ...base,
          key: Symbol('InvalidDocumentInputs'),
          view: { kind: 'Document', Inputs: Schema.String },
        },
      ]),
    ).toThrow(/Document Block view cannot declare Inputs/i)
  })

  it('rejects an accessor-backed view declaration without running the getter', () => {
    let reads = 0
    const config = {
      key: Symbol('AccessorViewDefinition'),
      Model,
      Message,
      InitArgs: Schema.Tuple([]),
      get view() {
        reads += 1
        return { kind: 'Document' }
      },
    }

    expect(() =>
      Reflect.apply(Block.make, undefined, ['AccessorViewDefinition', config]),
    ).toThrow(/accessor/i)
    expect(reads).toBe(0)
  })

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
