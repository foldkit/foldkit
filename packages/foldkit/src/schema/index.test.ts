import { Effect, Option, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { taggedStruct } from './index.js'

const ClickedReset = taggedStruct('ClickedReset')
const ClickedItem = taggedStruct('ClickedItem', { id: Schema.String })
const ExplicitTagField = taggedStruct('ExplicitTagField', {
  _tag: Schema.Literal('ExplicitTagField'),
})

const expectSameObjectStructure = (actual: object, expected: object): void => {
  expect(Object.getPrototypeOf(actual)).toBe(Object.getPrototypeOf(expected))
  expect(Reflect.ownKeys(actual)).toStrictEqual(Reflect.ownKeys(expected))
  expect(Object.getOwnPropertySymbols(actual)).toStrictEqual([])
  expect(Object.getOwnPropertyDescriptors(actual)).toStrictEqual(
    Object.getOwnPropertyDescriptors(expected),
  )
}

const getError = (construct: () => unknown, cleanup?: () => void): Error => {
  try {
    construct()
  } catch (error) {
    if (error instanceof Error) {
      return error
    }
    throw error
  } finally {
    cleanup?.()
  }
  throw new Error('Expected construction to fail')
}

describe('makeCallable', () => {
  it('keeps the wrapped Schema properties and prototype transparent', () => {
    const schema = Schema.TaggedStruct('ClickedItem', { id: Schema.String })

    expect('make' in ClickedItem).toBe(true)
    expect(ClickedItem.ast).toBeDefined()
    expect(Object.getPrototypeOf(ClickedItem)).toBe(
      Object.getPrototypeOf(schema),
    )
  })

  it('matches make when the fields explicitly define _tag', () => {
    const input = { _tag: 'ExplicitTagField' }
    const made = Reflect.apply(ExplicitTagField.make, undefined, [input])
    const constructed = Reflect.apply(ExplicitTagField, undefined, [input])

    expect(constructed).toStrictEqual(made)
    expectSameObjectStructure(constructed, made)
    expect(() => Reflect.apply(ExplicitTagField.make, undefined, [{}])).toThrow(
      'Schema validation failed',
    )
    expect(() => Reflect.apply(ExplicitTagField, undefined, [{}])).toThrow(
      'Schema validation failed',
    )
  })

  it('matches make and a literal for correct input', () => {
    const literal = { _tag: 'ClickedItem', id: 'item-1' }
    const made = ClickedItem.make({ id: 'item-1' })
    const constructed = ClickedItem({ id: 'item-1' })

    expect(constructed).toStrictEqual(made)
    expectSameObjectStructure(made, literal)
    expectSameObjectStructure(constructed, literal)
  })

  it('matches make for a declared __proto__ field', () => {
    const ChangedPrototypeLabel = taggedStruct('ChangedPrototypeLabel', {
      ['__proto__']: Schema.String,
    })
    const input = { ['__proto__']: 'label' }
    const literal = { _tag: 'ChangedPrototypeLabel', ['__proto__']: 'label' }
    const made = ChangedPrototypeLabel.make(input)
    const constructed = ChangedPrototypeLabel(input)

    expect(constructed).toStrictEqual(made)
    expectSameObjectStructure(constructed, literal)
  })

  it('builds a fresh no-payload object on every call', () => {
    expect(ClickedReset()).not.toBe(ClickedReset())
  })

  it('accepts a wrong field type that make rejects', () => {
    const input = { id: 1 }

    expect(() => Reflect.apply(ClickedItem.make, undefined, [input])).toThrow(
      'Schema validation failed',
    )
    expect(Reflect.apply(ClickedItem, undefined, [input])).toStrictEqual({
      _tag: 'ClickedItem',
      id: 1,
    })
  })

  it('falls back to make for primitive inputs', () => {
    const inputs: ReadonlyArray<unknown> = ['item-1', 1, true]
    for (const input of inputs) {
      const makeError = getError(() =>
        Reflect.apply(ClickedItem.make, undefined, [input]),
      )
      const callableError = getError(() =>
        Reflect.apply(ClickedItem, undefined, [input]),
      )

      expect(callableError.constructor).toBe(makeError.constructor)
      expect(callableError.message).toBe(makeError.message)
      expect(callableError.cause).toStrictEqual(makeError.cause)
    }
  })

  it('copies an undefined field when make rejects a missing required field', () => {
    expect(() => Reflect.apply(ClickedItem.make, undefined, [{}])).toThrow(
      'Schema validation failed',
    )
    expect(Reflect.apply(ClickedItem, undefined, [{}])).toStrictEqual({
      _tag: 'ClickedItem',
      id: undefined,
    })
  })

  it('guards a null payload before constructing a no-payload value', () => {
    const payload: unknown = null
    const previousCallableResult = Reflect.apply(ClickedReset.make, undefined, [
      payload ?? {},
    ])

    expect(Reflect.apply(ClickedReset, undefined, [payload])).toStrictEqual(
      previousCallableResult,
    )
  })

  it('guards a null payload before reading declared fields', () => {
    expect(() => Reflect.apply(ClickedItem.make, undefined, [null])).toThrow(
      'Schema validation failed',
    )
    expect(Reflect.apply(ClickedItem, undefined, [null])).toStrictEqual({
      _tag: 'ClickedItem',
      id: undefined,
    })
  })

  it('strips extra string and symbol keys exactly like make', () => {
    const extraSymbol = Symbol('extra')
    const input = { id: 'item-1', extra: true, [extraSymbol]: true }
    const made = Reflect.apply(ClickedItem.make, undefined, [input])
    const constructed = Reflect.apply(ClickedItem, undefined, [input])

    expect(constructed).toStrictEqual(made)
    expect(constructed).toStrictEqual({ _tag: 'ClickedItem', id: 'item-1' })
    expectSameObjectStructure(constructed, made)
  })

  it('falls back for an explicit accessor tag', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      Object.prototype,
      '_tag',
    )
    const restoreDescriptor = () => {
      if (originalDescriptor === undefined) {
        Reflect.deleteProperty(Object.prototype, '_tag')
      } else {
        Object.defineProperty(Object.prototype, '_tag', originalDescriptor)
      }
    }
    const makeInput = () => {
      const input = { id: 'item-1' }
      Object.defineProperty(input, '_tag', {
        configurable: true,
        enumerable: true,
        get: () => {
          Object.defineProperty(Object.prototype, '_tag', {
            configurable: true,
            set: () => undefined,
          })
          return 'ClickedItem'
        },
      })
      return input
    }

    try {
      const made = ClickedItem.make(makeInput())
      restoreDescriptor()
      const constructed = ClickedItem(makeInput())

      expect(constructed).toStrictEqual(made)
      expect(Object.hasOwn(constructed, '_tag')).toBe(false)
    } finally {
      restoreDescriptor()
    }
  })

  it('matches make write ordering for an explicit undefined tag', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      Object.prototype,
      '_tag',
    )
    const restoreDescriptor = () => {
      if (originalDescriptor === undefined) {
        Reflect.deleteProperty(Object.prototype, '_tag')
      } else {
        Object.defineProperty(Object.prototype, '_tag', originalDescriptor)
      }
    }
    const installDeletingSetter = () => {
      Object.defineProperty(Object.prototype, '_tag', {
        configurable: true,
        set: () => {
          Reflect.deleteProperty(Object.prototype, '_tag')
        },
      })
    }

    try {
      installDeletingSetter()
      const made = Reflect.apply(ClickedItem.make, undefined, [
        { _tag: undefined, id: 'item-1' },
      ])
      restoreDescriptor()
      installDeletingSetter()
      const constructed = Reflect.apply(ClickedItem, undefined, [
        { _tag: undefined, id: 'item-1' },
      ])

      expect(constructed).toStrictEqual(made)
      expect(constructed).toStrictEqual({ id: 'item-1' })
    } finally {
      restoreDescriptor()
    }
  })

  it('observes direct properties in the same order as make', () => {
    const ChangedIndex = taggedStruct('ChangedIndex', { 0: Schema.Number })
    const makeInput = () => {
      const input = { 0: 1, _tag: 'ChangedIndex' }
      return new Proxy(input, {
        get: (target, name, receiver) => {
          if (name === '_tag') {
            target[0] = 2
          }
          return Reflect.get(target, name, receiver)
        },
      })
    }
    const made = Reflect.apply(ChangedIndex.make, undefined, [makeInput()])
    const constructed = Reflect.apply(ChangedIndex, undefined, [makeInput()])

    expect(constructed).toStrictEqual(made)
    expect(constructed).toStrictEqual({ 0: 1, _tag: 'ChangedIndex' })
  })

  it('falls back for accessor fields before reading them', () => {
    const getterError = new Error('id getter')
    const makeInput = () => ({
      get id(): string {
        throw getterError
      },
    })
    const makeError = getError(() => ClickedItem.make(makeInput()))
    const callableError = getError(() => ClickedItem(makeInput()))

    expect(callableError.message).toBe(makeError.message)
    expect(callableError.cause).toStrictEqual(makeError.cause)
  })

  it('falls back for fields inherited from the input prototype', () => {
    class Row {
      get id(): string {
        return 'item-1'
      }
    }

    const inheritedDataInput: { readonly id: string } = Object.create({
      id: 'item-1',
    })

    expect(() => ClickedItem.make(new Row())).toThrow(
      'Schema validation failed',
    )
    expect(() => ClickedItem(new Row())).toThrow('Schema validation failed')
    expect(() => ClickedItem.make(inheritedDataInput)).toThrow(
      'Schema validation failed',
    )
    expect(() => ClickedItem(inheritedDataInput)).toThrow(
      'Schema validation failed',
    )
  })

  it('falls back for an explicitly wrong top-level tag', () => {
    const input = { _tag: 'Bogus', id: 'item-1' }

    expect(() => Reflect.apply(ClickedItem.make, undefined, [input])).toThrow(
      'Schema validation failed',
    )
    expect(() => Reflect.apply(ClickedItem, undefined, [input])).toThrow(
      'Schema validation failed',
    )
  })

  it('matches make for data-property Proxies without duplicate reads', () => {
    const makeInput = () => {
      const log: Array<string> = []
      let idDescriptorCount = 0
      const input = new Proxy(
        { id: 'item-1' },
        {
          get: (target, name, receiver) => {
            log.push(`get:${String(name)}`)
            if (name === 'id' && idDescriptorCount > 1) {
              return 'item-2'
            }
            return Reflect.get(target, name, receiver)
          },
          getOwnPropertyDescriptor: (target, name) => {
            log.push(`descriptor:${String(name)}`)
            if (name === 'id') {
              idDescriptorCount += 1
            }
            return Reflect.getOwnPropertyDescriptor(target, name)
          },
        },
      )
      return { input, log }
    }
    const madeInput = makeInput()
    const callableInput = makeInput()
    const made = ClickedItem.make(madeInput.input)
    const constructed = ClickedItem(callableInput.input)

    expect(constructed).toStrictEqual(made)
    expect(constructed.id).toBe('item-1')
    expect(callableInput.log).toStrictEqual(madeInput.log)
  })

  it('checks the value read from an explicit Proxy tag', () => {
    const makeInput = () =>
      new Proxy(
        { _tag: 'ClickedItem', id: 'item-1' },
        {
          get: (target, name, receiver) =>
            name === '_tag' ? 'Bogus' : Reflect.get(target, name, receiver),
        },
      )

    expect(() =>
      Reflect.apply(ClickedItem.make, undefined, [makeInput()]),
    ).toThrow('Schema validation failed')
    expect(() => Reflect.apply(ClickedItem, undefined, [makeInput()])).toThrow(
      'Schema validation failed',
    )
  })

  it('falls back to make for a checked field', () => {
    const ChangedName = taggedStruct('ChangedName', {
      name: Schema.NonEmptyString,
    })
    const input = { name: '' }

    expect(() => Reflect.apply(ChangedName.make, undefined, [input])).toThrow(
      'Schema validation failed',
    )
    expect(() => Reflect.apply(ChangedName, undefined, [input])).toThrow(
      'Schema validation failed',
    )
  })

  it('finds a check nested inside a Struct field', () => {
    const ChangedProfile = taggedStruct('ChangedProfile', {
      profile: Schema.Struct({ name: Schema.NonEmptyString }),
    })
    const input = { profile: { name: '' } }

    expect(() =>
      Reflect.apply(ChangedProfile.make, undefined, [input]),
    ).toThrow('Schema validation failed')
    expect(() => Reflect.apply(ChangedProfile, undefined, [input])).toThrow(
      'Schema validation failed',
    )
  })

  it('finds checks nested inside union members, tuple elements, and array rest', () => {
    const ChangedUnion = taggedStruct('ChangedUnion', {
      value: Schema.Union([Schema.NonEmptyString, Schema.Number]),
    })
    const ChangedTuple = taggedStruct('ChangedTuple', {
      value: Schema.Tuple([Schema.NonEmptyString]),
    })
    const ChangedArray = taggedStruct('ChangedArray', {
      value: Schema.Array(Schema.NonEmptyString),
    })

    expect(() =>
      Reflect.apply(ChangedUnion, undefined, [{ value: '' }]),
    ).toThrow('Schema validation failed')
    expect(() =>
      Reflect.apply(ChangedTuple, undefined, [{ value: [''] }]),
    ).toThrow('Schema validation failed')
    expect(() =>
      Reflect.apply(ChangedArray, undefined, [{ value: [''] }]),
    ).toThrow('Schema validation failed')
  })

  it('keeps an unchecked primitive union on the fast path', () => {
    const ChangedValue = taggedStruct('ChangedValue', {
      value: Schema.Union([Schema.String, Schema.Number]),
    })
    const input = { value: true }

    expect(() => Reflect.apply(ChangedValue.make, undefined, [input])).toThrow(
      'Schema validation failed',
    )
    expect(Reflect.apply(ChangedValue, undefined, [input])).toStrictEqual({
      _tag: 'ChangedValue',
      value: true,
    })
  })

  it('keeps every identity leaf category on the fast path', () => {
    const uniqueSymbol = Symbol('unique')
    const otherSymbol = Symbol('other')
    const ChangedSymbol = taggedStruct('ChangedSymbol', {
      value: Schema.Symbol,
    })
    const ChangedUniqueSymbol = taggedStruct('ChangedUniqueSymbol', {
      value: Schema.UniqueSymbol(uniqueSymbol),
    })
    const ChangedObject = taggedStruct('ChangedObject', {
      value: Schema.ObjectKeyword,
    })
    const ChangedEnum = taggedStruct('ChangedEnum', {
      value: Schema.Enum({ Selected: 'Selected' }),
    })
    const ChangedTemplate = taggedStruct('ChangedTemplate', {
      value: Schema.TemplateLiteral(['item-', Schema.String]),
    })

    expect(
      Reflect.apply(ChangedSymbol, undefined, [{ value: 'not a symbol' }]),
    ).toHaveProperty('value', 'not a symbol')
    expect(
      Reflect.apply(ChangedUniqueSymbol, undefined, [{ value: otherSymbol }]),
    ).toHaveProperty('value', otherSymbol)
    expect(
      Reflect.apply(ChangedObject, undefined, [{ value: 'not an object' }]),
    ).toHaveProperty('value', 'not an object')
    expect(
      Reflect.apply(ChangedEnum, undefined, [{ value: 'Other' }]),
    ).toHaveProperty('value', 'Other')
    expect(
      Reflect.apply(ChangedTemplate, undefined, [{ value: 1 }]),
    ).toHaveProperty('value', 1)
  })

  it('falls back for suspended fields', () => {
    const ChangedValue = taggedStruct('ChangedValue', {
      value: Schema.suspend(() => Schema.String),
    })
    const input = { value: 1 }

    expect(() => Reflect.apply(ChangedValue.make, undefined, [input])).toThrow(
      'Schema validation failed',
    )
    expect(() => Reflect.apply(ChangedValue, undefined, [input])).toThrow(
      'Schema validation failed',
    )
  })

  it('rebuilds plain Struct and Array fields like make', () => {
    const ChangedProfiles = taggedStruct('ChangedProfiles', {
      profile: Schema.Struct({ name: Schema.String }),
      profiles: Schema.Array(Schema.Struct({ name: Schema.String })),
    })
    const profile = { name: 'Ada', extra: true }
    const nestedProfile = { name: 'Grace', extra: true }
    const profiles = [nestedProfile]
    const input = { profile, profiles }
    const made = ChangedProfiles.make(input)
    const constructed = ChangedProfiles(input)

    expect(constructed).toStrictEqual(made)
    expect(constructed.profile).not.toBe(profile)
    expect(constructed.profiles).not.toBe(profiles)
    expect(constructed.profiles.at(0)).not.toBe(nestedProfile)
  })

  it('preserves empty Struct identity like make', () => {
    const ChangedValue = taggedStruct('ChangedValue', {
      value: Schema.Struct({}),
    })
    const value = { extra: true }
    const made = ChangedValue.make({ value })
    const constructed = ChangedValue({ value })

    expect(constructed).toStrictEqual(made)
    expect(constructed.value).toBe(value)
  })

  it('rebuilds Array subclasses as plain Arrays like make', () => {
    class ProfileList extends globalThis.Array<{ name: string }> {}

    const ChangedProfiles = taggedStruct('ChangedProfiles', {
      profiles: Schema.Array(Schema.Struct({ name: Schema.String })),
    })
    const profiles = new ProfileList()
    profiles.push({ name: 'Ada' })
    const made = ChangedProfiles.make({ profiles })
    const constructed = ChangedProfiles({ profiles })

    expect(constructed).toStrictEqual(made)
    expect(Object.getPrototypeOf(constructed.profiles)).toBe(Array.prototype)
  })

  it('rebuilds Arrays from numeric indexes without using a custom iterator', () => {
    const ChangedValues = taggedStruct('ChangedValues', {
      values: Schema.Array(Schema.String),
    })
    const values = ['first', 'second']
    values[Symbol.iterator] = function* () {
      yield 'iterator value'
      return undefined
    }
    values.at = () => 'overridden at value'
    const made = ChangedValues.make({ values })
    const constructed = ChangedValues({ values })

    expect(constructed).toStrictEqual(made)
    expect(constructed.values).toStrictEqual(['first', 'second'])
  })

  it('snapshots Array length before reading its items', () => {
    const ChangedValues = taggedStruct('ChangedValues', {
      values: Schema.Array(Schema.Unknown),
    })
    const makeValues = () => {
      const values = new globalThis.Array<unknown>(3)
      Object.defineProperty(values, 0, {
        configurable: true,
        enumerable: true,
        get: () => {
          values.length = 1
          return 'first'
        },
      })
      return values
    }
    const made = ChangedValues.make({ values: makeValues() })
    const constructed = ChangedValues({ values: makeValues() })

    expect(constructed).toStrictEqual(made)
    expect(constructed.values).toStrictEqual(['first', undefined, undefined])
  })

  it('writes Array items without reading Array.prototype.push', () => {
    const ChangedValues = taggedStruct('ChangedValues', {
      values: Schema.Array(Schema.Unknown),
    })
    const originalPush = globalThis.Array.prototype.push
    const makeValues = () => {
      const values = ['first', 'second']
      Object.defineProperty(values, 0, {
        configurable: true,
        enumerable: true,
        get: () => {
          globalThis.Array.prototype.push = () => 0
          return 'first'
        },
      })
      return values
    }

    try {
      const made = ChangedValues.make({ values: makeValues() })
      globalThis.Array.prototype.push = originalPush
      const constructed = ChangedValues({ values: makeValues() })

      expect(constructed).toStrictEqual(made)
      expect(constructed.values).toStrictEqual(['first', 'second'])
    } finally {
      globalThis.Array.prototype.push = originalPush
    }
  })

  it('throws when an Array item cannot be assigned', () => {
    const ChangedValues = taggedStruct('ChangedValues', {
      values: Schema.Array(Schema.Unknown),
    })
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      globalThis.Array.prototype,
      0,
    )
    const restoreDescriptor = () => {
      if (originalDescriptor === undefined) {
        Reflect.deleteProperty(globalThis.Array.prototype, 0)
      } else {
        Object.defineProperty(globalThis.Array.prototype, 0, originalDescriptor)
      }
    }
    const makeValues = () => {
      const values = new globalThis.Array<unknown>(1)
      Object.defineProperty(values, 0, {
        configurable: true,
        enumerable: true,
        get: () => {
          Object.defineProperty(globalThis.Array.prototype, 0, {
            configurable: true,
            value: 'blocked',
            writable: false,
          })
          return 'first'
        },
      })
      return values
    }
    const makeError = getError(
      () => ChangedValues.make({ values: makeValues() }),
      restoreDescriptor,
    )
    const callableError = getError(
      () => ChangedValues({ values: makeValues() }),
      restoreDescriptor,
    )

    expect(makeError).toBeInstanceOf(Error)
    expect(callableError).toBeInstanceOf(Error)
  })

  it('assigns raw object fields before constructing nested values', () => {
    const ChangedChild = taggedStruct('ChangedChild', {
      child: Schema.Struct({ name: Schema.String }),
    })
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      Object.prototype,
      'child',
    )
    const restoreDescriptor = () => {
      if (originalDescriptor === undefined) {
        Reflect.deleteProperty(Object.prototype, 'child')
      } else {
        Object.defineProperty(Object.prototype, 'child', originalDescriptor)
      }
    }
    const makeInput = () => ({
      child: {
        get name() {
          Object.defineProperty(Object.prototype, 'child', {
            configurable: true,
            set: () => undefined,
          })
          return 'Ada'
        },
      },
    })

    try {
      const made = ChangedChild.make(makeInput())
      restoreDescriptor()
      const constructed = ChangedChild(makeInput())

      expect(constructed).toStrictEqual(made)
    } finally {
      restoreDescriptor()
    }
  })

  it('falls back for structural unions', () => {
    const ChangedValue = taggedStruct('ChangedValue', {
      value: Schema.Union([
        Schema.Struct({ name: Schema.String }),
        Schema.Struct({ count: Schema.Number }),
      ]),
    })
    const value = { name: 'Ada', extra: true }
    const input = { value }
    const made = ChangedValue.make(input)
    const constructed = ChangedValue(input)

    expect(constructed).toStrictEqual(made)
    expect(constructed.value).not.toBe(value)
  })

  it('falls back for oneOf unions', () => {
    const ChangedValue = taggedStruct('ChangedValue', {
      value: Schema.Union([Schema.String, Schema.String], { mode: 'oneOf' }),
    })
    const input = { value: 'value' }

    expect(() => ChangedValue.make(input)).toThrow('Schema validation failed')
    expect(() => ChangedValue(input)).toThrow('Schema validation failed')
  })

  it('falls back for index signatures', () => {
    const ChangedValues = taggedStruct('ChangedValues', {
      values: Schema.Record(Schema.String, Schema.String),
    })
    const values = { first: 'one' }
    const input = { values }
    const made = ChangedValues.make(input)
    const constructed = ChangedValues(input)

    expect(constructed).toStrictEqual(made)
    expect(constructed.values).not.toBe(values)
  })

  it('falls back for Declaration fields', () => {
    const DeclaredString = Schema.declare(
      (input): input is string => typeof input === 'string',
      { expected: 'string declaration' },
    )
    const ChangedDeclaredValue = taggedStruct('ChangedDeclaredValue', {
      value: DeclaredString,
    })
    const SelectedValue = taggedStruct('SelectedValue', {
      value: Schema.Option(Schema.String),
    })
    const invalidInput = { value: 1 }
    const option = Option.some('selected')
    const made = SelectedValue.make({ value: option })
    const constructed = SelectedValue({ value: option })

    expect(() =>
      Reflect.apply(ChangedDeclaredValue, undefined, [invalidInput]),
    ).toThrow('Schema validation failed')
    expect(constructed).toStrictEqual(made)
    expect(constructed.value).not.toBe(option)
  })

  it('falls back to make for field context', () => {
    const ChangedLabel = taggedStruct('ChangedLabel', {
      label: Schema.optionalKey(Schema.String),
    })

    expect(Reflect.apply(ChangedLabel, undefined, [{}])).toStrictEqual({
      _tag: 'ChangedLabel',
    })
  })

  it('falls back for value-shaping parse options', () => {
    const profile = Schema.Struct({ name: Schema.String }).annotate({
      parseOptions: { onExcessProperty: 'preserve' },
    })
    const ChangedProfile = taggedStruct('ChangedProfile', { profile })
    const input = { profile: { name: 'Ada', extra: true } }

    expect(ChangedProfile(input)).toStrictEqual(ChangedProfile.make(input))
    expect(ChangedProfile(input).profile).toHaveProperty('extra', true)
  })

  it('falls back for child Message fields', () => {
    const ChildMessage = taggedStruct('ChildMessage')
    const GotChildMessage = taggedStruct('GotChildMessage', {
      message: ChildMessage,
    })
    const input = { message: { _tag: 'Bogus' } }

    expect(() =>
      Reflect.apply(GotChildMessage.make, undefined, [input]),
    ).toThrow('Schema validation failed')
    expect(() => Reflect.apply(GotChildMessage, undefined, [input])).toThrow(
      'Schema validation failed',
    )
  })

  it('applies a missing child Message tag like make', () => {
    const ChildMessage = taggedStruct('ChildMessage')
    const GotChildMessage = taggedStruct('GotChildMessage', {
      message: ChildMessage,
    })
    const input = { message: {} }

    expect(GotChildMessage(input)).toStrictEqual(GotChildMessage.make(input))
  })

  it('falls back for custom child tag constructor defaults', () => {
    let defaultCount = 0
    const CustomChild = Schema.Struct({
      _tag: Schema.Literal('CustomChild').pipe(
        Schema.withConstructorDefault(
          Effect.sync((): 'CustomChild' => {
            defaultCount += 1
            return 'CustomChild'
          }),
        ),
      ),
    })
    const WrappedChild = taggedStruct('WrappedChild', { child: CustomChild })
    const missingTagInput = { child: {} }
    const undefinedTagInput = { child: { _tag: undefined } }
    const bogusTagInput = { child: { _tag: 'Bogus' } }

    expect(WrappedChild(missingTagInput)).toStrictEqual(
      WrappedChild.make(missingTagInput),
    )
    expect(
      Reflect.apply(WrappedChild, undefined, [undefinedTagInput]),
    ).toStrictEqual(
      Reflect.apply(WrappedChild.make, undefined, [undefinedTagInput]),
    )
    expect(() =>
      Reflect.apply(WrappedChild, undefined, [bogusTagInput]),
    ).toThrow('Schema validation failed')
    expect(defaultCount).toBe(4)
  })

  it('falls back for child Message unions', () => {
    const SelectedChild = taggedStruct('SelectedChild', { id: Schema.String })
    const ResetChild = taggedStruct('ResetChild')
    const ChildMessage = Schema.Union([SelectedChild, ResetChild])
    const GotChildMessage = taggedStruct('GotChildMessage', {
      message: ChildMessage,
    })
    const missingTagInput = { message: { id: 'child-1', extra: true } }
    const undefinedTagInput = { message: { _tag: undefined } }
    const bogusTagInput = { message: { _tag: 'Bogus' } }

    expect(GotChildMessage(missingTagInput)).toStrictEqual(
      GotChildMessage.make(missingTagInput),
    )
    expect(
      Reflect.apply(GotChildMessage, undefined, [undefinedTagInput]),
    ).toStrictEqual(
      Reflect.apply(GotChildMessage.make, undefined, [undefinedTagInput]),
    )
    expect(() =>
      Reflect.apply(GotChildMessage.make, undefined, [bogusTagInput]),
    ).toThrow('Schema validation failed')
    expect(() =>
      Reflect.apply(GotChildMessage, undefined, [bogusTagInput]),
    ).toThrow('Schema validation failed')
  })

  it('uses child Message union parsing when omitted tags are ambiguous', () => {
    const SelectedText = taggedStruct('SelectedText', { value: Schema.String })
    const SelectedCount = taggedStruct('SelectedCount', {
      value: Schema.Number,
    })
    const ChildMessage = Schema.Union([SelectedText, SelectedCount])
    const GotChildMessage = taggedStruct('GotChildMessage', {
      message: ChildMessage,
    })
    const input = { message: { value: 1 } }

    expect(GotChildMessage(input)).toStrictEqual(GotChildMessage.make(input))
    expect(GotChildMessage(input).message._tag).toBe('SelectedCount')
  })

  it('falls back for encoded child Message schemas', () => {
    const SelectedCount = taggedStruct('SelectedCount', {
      count: Schema.NumberFromString,
    })
    const ResetCount = taggedStruct('ResetCount')
    const ChildMessage = Schema.Union([SelectedCount, ResetCount])
    const GotSelectedCountMessage = taggedStruct('GotSelectedCountMessage', {
      message: SelectedCount,
    })
    const GotChildMessage = taggedStruct('GotChildMessage', {
      message: ChildMessage,
    })
    const input = { message: { _tag: 'Bogus', count: 1 } }

    expect(() =>
      Reflect.apply(GotSelectedCountMessage.make, undefined, [input]),
    ).toThrow('Schema validation failed')
    expect(() =>
      Reflect.apply(GotChildMessage.make, undefined, [input]),
    ).toThrow('Schema validation failed')
    expect(() =>
      Reflect.apply(GotSelectedCountMessage, undefined, [input]),
    ).toThrow('Schema validation failed')
    expect(() => Reflect.apply(GotChildMessage, undefined, [input])).toThrow(
      'Schema validation failed',
    )
  })
})
