import { Data, Option, Schema, Stream } from 'effect'
import { describe, expect, it } from 'vitest'

import * as CustomElement from '../customElement/index.js'
import { defineMessageUnion } from '../message/index.js'
import type { MountAction } from '../mount/index.js'
import {
  type Attribute,
  type ClickOptions,
  OnCustomEvent,
  Prop,
  __htmlBuilder,
} from './index.js'

const Message = defineMessageUnion({
  Clicked: {},
})
type Message = typeof Message.Type

const h = __htmlBuilder<Message>()
const AttributeConstructor = Data.taggedEnum<Attribute<Message>>()
const message = Message.Clicked()
const onInput = (_value: string): Message => message
const options: ClickOptions = {
  defaultAction: 'Prevent',
  propagation: 'Stop',
  focusSelector: '#target',
}
const mountAction: MountAction<Message> = {
  name: 'ObserveTarget',
  f: () => Stream.empty,
}

const propertyDescriptors = (value: object) =>
  Reflect.ownKeys(value).map(key => [
    key,
    Object.getOwnPropertyDescriptor(value, key),
  ])

type AttributeCase = Readonly<{
  name: string
  build: () => Attribute<Message>
  expected: () => Attribute<Message>
}>

const attributeCases: ReadonlyArray<AttributeCase> = [
  {
    name: 'no fields',
    build: () => h.AllowDrop(),
    expected: () => AttributeConstructor.AllowDrop(),
  },
  {
    name: 'value field',
    build: () => h.Class('card'),
    expected: () => AttributeConstructor.Class({ value: 'card' }),
  },
  {
    name: 'message field',
    build: () => h.OnSubmit(message),
    expected: () => AttributeConstructor.OnSubmit({ message }),
  },
  {
    name: 'function field',
    build: () => h.OnInput(onInput),
    expected: () => AttributeConstructor.OnInput({ f: onInput }),
  },
  {
    name: 'text field',
    build: () => h.OnCopyText('copied'),
    expected: () => AttributeConstructor.OnCopyText({ text: 'copied' }),
  },
  {
    name: 'action field',
    build: () => h.OnMount(mountAction),
    expected: () => AttributeConstructor.OnMount({ action: mountAction }),
  },
  {
    name: 'key and value fields',
    build: () => h.DataAttribute('state', 'draft'),
    expected: () =>
      AttributeConstructor.DataAttribute({ key: 'state', value: 'draft' }),
  },
  {
    name: 'text and message fields',
    build: () => h.OnCutText('cut', message),
    expected: () => AttributeConstructor.OnCutText({ text: 'cut', message }),
  },
  {
    name: 'message and options fields',
    build: () => h.OnClick(message, options),
    expected: () => AttributeConstructor.OnClick({ message, options }),
  },
  {
    name: 'OnClick without options',
    build: () => h.OnClick(message),
    expected: () => AttributeConstructor.OnClick({ message }),
  },
  {
    name: 'OnCancelPreventDefault Option payload',
    build: () => h.OnCancelPreventDefault(message),
    expected: () =>
      AttributeConstructor.OnCancelPreventDefault({
        maybeCustomEventMessage: Option.some(message),
      }),
  },
  {
    name: 'OnCancelPreventDefault empty Option payload',
    build: () => h.OnCancelPreventDefault(),
    expected: () =>
      AttributeConstructor.OnCancelPreventDefault({
        maybeCustomEventMessage: Option.none(),
      }),
  },
]

describe('direct HtmlBuilder attributes', () => {
  it.each(attributeCases)(
    '$name matches Effect constructor output',
    testCase => {
      const actual = testCase.build()
      const expected = testCase.expected()

      expect(Reflect.ownKeys(actual)).toEqual(Reflect.ownKeys(expected))
      expect(Object.getPrototypeOf(actual)).toBe(
        Object.getPrototypeOf(expected),
      )
      expect(propertyDescriptors(actual)).toEqual(propertyDescriptors(expected))
      expect(actual).toEqual(expected)
      expect(actual).not.toBe(testCase.build())
    },
  )

  it('keeps payload value identities', () => {
    const toMessage = (_value: string): Message => message
    const attribute = h.OnInput(toMessage)

    expect(attribute.f).toBe(toMessage)
    expect(h.OnSubmit(message).message).toBe(message)
    expect(h.OnMount(mountAction).action).toBe(mountAction)
  })

  it('defines an own tag without invoking an inherited setter', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      Object.prototype,
      '_tag',
    )
    let setterCalls = 0

    Object.defineProperty(Object.prototype, '_tag', {
      configurable: true,
      set: () => {
        setterCalls += 1
      },
    })

    try {
      const attribute = h.Class('card')

      expect(setterCalls).toBe(0)
      expect(Object.getOwnPropertyDescriptor(attribute, '_tag')).toEqual({
        value: 'Class',
        writable: true,
        enumerable: true,
        configurable: true,
      })
    } finally {
      if (originalDescriptor === undefined) {
        Reflect.deleteProperty(Object.prototype, '_tag')
      } else {
        Object.defineProperty(Object.prototype, '_tag', originalDescriptor)
      }
    }
  })
})

const makeProxyPayload = <Payload extends object>(payload: Payload) => {
  const access = { ownKeys: 0, getter: 0 }
  const extra = Symbol('extra')
  const record = Object.assign(payload, { [extra]: 'symbol' })
  Object.defineProperty(record, 'extra', {
    enumerable: true,
    configurable: true,
    get: () => {
      access.getter += 1
      return 'extra'
    },
  })

  return {
    access,
    extra,
    payload: new Proxy(record, {
      ownKeys: target => {
        access.ownKeys += 1
        return Reflect.ownKeys(target)
      },
    }),
  }
}

describe('raw Attribute constructors', () => {
  it('copies Prop payloads without mutating their getters, symbols, or proxy behavior', () => {
    const { access, extra, payload } = makeProxyPayload({
      key: 'value',
      value: 'draft',
    })
    const attribute = Prop(payload)
    const accessAfterConstruction = { ...access }

    expect(attribute).not.toBe(payload)
    expect(Reflect.ownKeys(payload)).toEqual(['key', 'value', 'extra', extra])
    expect(Reflect.ownKeys(attribute)).toEqual([
      'key',
      'value',
      'extra',
      '_tag',
      extra,
    ])
    expect(accessAfterConstruction).toEqual({ ownKeys: 1, getter: 1 })
    expect(Object.getOwnPropertyDescriptor(payload, '_tag')).toBeUndefined()
  })

  it('copies OnCustomEvent payloads without mutating their getters, symbols, or proxy behavior', () => {
    const { access, extra, payload } = makeProxyPayload({
      name: 'changed',
      f: () => Option.some(message),
    })
    const attribute = OnCustomEvent(payload)
    const accessAfterConstruction = { ...access }

    expect(attribute).not.toBe(payload)
    expect(Reflect.ownKeys(payload)).toEqual(['name', 'f', 'extra', extra])
    expect(Reflect.ownKeys(attribute)).toEqual([
      'name',
      'f',
      'extra',
      '_tag',
      extra,
    ])
    expect(accessAfterConstruction).toEqual({ ownKeys: 1, getter: 1 })
    expect(Object.getOwnPropertyDescriptor(payload, '_tag')).toBeUndefined()
  })

  it('keeps custom-element property and event factories on raw constructors', () => {
    const element = CustomElement.define({
      tag: 'direct-attribute-test',
      properties: { value: Schema.String },
      events: { changed: Schema.String },
    }).withMessage(h)
    const toMessage = (_value: string): Message => message

    const property = element.Value('draft')
    const event = element.OnChanged(toMessage)

    expect(property).toEqual(
      AttributeConstructor.Prop({ key: 'value', value: 'draft' }),
    )
    expect(event._tag).toBe('OnCustomEvent')
    if (event._tag === 'OnCustomEvent') {
      expect(event.name).toBe('changed')
      expect(event.f).toBeTypeOf('function')
    }
  })
})
