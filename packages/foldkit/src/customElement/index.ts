import { Array, type Schema, String, pipe } from 'effect'

import type { Attribute, Child, Html } from '../html/index.js'
import {
  OnCustomEvent,
  Prop,
  customElement as customElementVNode,
} from '../html/index.js'

/** Type-level kebab-case to PascalCase, used to convert event names like
 *  `'change-rating'` into the corresponding factory name `'OnChangeRating'`. */
type KebabToPascal<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Capitalize<Head>}${KebabToPascal<Tail>}`
  : Capitalize<S>

type PropertyFactory<Message, ValueType> = (
  value: ValueType,
) => Attribute<Message>

type EventFactory<Message, DetailType> = (
  toMessage: (detail: DetailType) => Message,
) => Attribute<Message>

/** @internal */
type PropertyFactories<
  Message,
  Properties extends Record<string, Schema.Top>,
> = {
  readonly [K in keyof Properties as Capitalize<string & K>]: PropertyFactory<
    Message,
    Schema.Schema.Type<Properties[K]>
  >
}

/** @internal */
type EventFactories<Message, Events extends Record<string, Schema.Top>> = {
  readonly [K in keyof Events as `On${KebabToPascal<string & K>}`]: EventFactory<
    Message,
    Schema.Schema.Type<Events[K]>
  >
}

/** Typed call site for a defined custom element. The element constructor
 *  itself is callable; each declared property gets a PascalCase factory
 *  method, and each declared event gets an `On{PascalCase}` factory method. */
export type ElementBuilder<
  Message,
  Properties extends Record<string, Schema.Top>,
  Events extends Record<string, Schema.Top>,
> = ((
  attributes?: ReadonlyArray<Attribute<Message>>,
  children?: ReadonlyArray<Child>,
) => Html) &
  PropertyFactories<Message, Properties> &
  EventFactories<Message, Events>

/** Configuration accepted by `CustomElement.define`. */
export interface CustomElementConfig<
  Tag extends string,
  Properties extends Record<string, Schema.Top>,
  Events extends Record<string, Schema.Top>,
> {
  readonly tag: Tag
  readonly properties: Properties
  readonly events: Events
}

/** A defined custom element, untyped on Message at definition time so the
 *  spec can be exported and shared across modules. Call `.withMessage<Message>()`
 *  inside a view module to mint a typed `ElementBuilder` bound to the
 *  consumer's Message universe. */
export interface CustomElementSpec<
  Tag extends string,
  Properties extends Record<string, Schema.Top>,
  Events extends Record<string, Schema.Top>,
> {
  readonly tag: Tag
  readonly properties: Properties
  readonly events: Events
  readonly withMessage: <Message>() => ElementBuilder<
    Message,
    Properties,
    Events
  >
}

/** The typed builder for a given spec and Message universe. Equivalent to
 *  the value `Spec.withMessage<Message>()` returns, expressed as a type
 *  consumers can name without reaching for `ReturnType<typeof ...>`. */
export type Builder<Spec, Message> =
  Spec extends CustomElementSpec<string, infer Properties, infer Events>
    ? ElementBuilder<Message, Properties, Events>
    : never

const kebabToPascal = (input: string): string =>
  pipe(input, String.split('-'), Array.map(String.capitalize), Array.join(''))

const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/

const isValidPropertyName = (name: string): boolean =>
  IDENTIFIER_PATTERN.test(name)

const isValidEventName = (name: string): boolean => {
  if (String.isEmpty(name)) {
    return false
  } else {
    return pipe(
      name,
      String.split('-'),
      Array.every(segment => IDENTIFIER_PATTERN.test(segment)),
    )
  }
}

const propertyFactoryName = (propertyName: string): string =>
  String.capitalize(propertyName)

const eventFactoryName = (eventName: string): string =>
  `On${kebabToPascal(eventName)}`

/**
 * Define a typed binding for a custom element. The returned spec describes
 * the element's properties and events with Schema, and exposes a
 * `.withMessage<Message>()` factory that yields a typed `ElementBuilder` for
 * the consumer's Message universe.
 *
 * Property changes diff across renders; declared `CustomEvent`s are
 * converted to Messages by the runtime.
 *
 * @example
 * ```ts
 * // main.ts
 * import 'vanilla-colorful/hex-color-picker.js'
 * import { CustomElement } from 'foldkit'
 *
 * const hexColorPicker = CustomElement.define({
 *   tag: 'hex-color-picker',
 *   properties: {
 *     color: S.String,
 *   },
 *   events: {
 *     'color-changed': S.Struct({ value: S.String }),
 *   },
 * })
 *
 * const picker = hexColorPicker.withMessage<Message>()
 *
 * picker(
 *   [
 *     picker.Color(model.fillColor),
 *     picker.OnColorChanged(detail => ChangedFillColor({ value: detail.value })),
 *   ],
 *   [],
 * )
 * ```
 */
export const define = <
  Tag extends string,
  Properties extends Record<string, Schema.Top>,
  Events extends Record<string, Schema.Top>,
>(
  config: CustomElementConfig<Tag, Properties, Events>,
): CustomElementSpec<Tag, Properties, Events> => {
  const propertyNames = Object.keys(config.properties)
  const eventNames = Object.keys(config.events)

  validateNames({ tag: config.tag, propertyNames, eventNames })

  const buildForMessage = <Message>(): ElementBuilder<
    Message,
    Properties,
    Events
  > => {
    const createVNode = customElementVNode<Message>()(config.tag)

    const elementFn = (
      attributes: ReadonlyArray<Attribute<Message>> = [],
      children: ReadonlyArray<Child> = [],
    ): Html => createVNode(attributes, children)

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const builder = elementFn as Record<string, unknown> & typeof elementFn

    for (const propertyName of propertyNames) {
      builder[propertyFactoryName(propertyName)] = (
        value: unknown,
      ): Attribute<Message> => Prop({ key: propertyName, value })
    }

    for (const eventName of eventNames) {
      builder[eventFactoryName(eventName)] = (
        toMessage: (detail: unknown) => Message,
      ): Attribute<Message> =>
        OnCustomEvent({
          name: eventName,
          f: event => toMessage(event.detail),
        })
    }

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return builder as ElementBuilder<Message, Properties, Events>
  }

  return {
    tag: config.tag,
    properties: config.properties,
    events: config.events,
    withMessage: buildForMessage,
  }
}

const validateNames = (input: {
  readonly tag: string
  readonly propertyNames: ReadonlyArray<string>
  readonly eventNames: ReadonlyArray<string>
}): void => {
  const context = `CustomElement.define('${input.tag}')`

  if (!input.tag.includes('-')) {
    throw new Error(
      `${context}: tag '${input.tag}' is not a valid custom element name. Autonomous custom elements must contain at least one hyphen (e.g. 'fk-emoji-rating').`,
    )
  }

  for (const propertyName of input.propertyNames) {
    if (!isValidPropertyName(propertyName)) {
      throw new Error(
        `${context}: property name '${propertyName}' is not a valid JS identifier.`,
      )
    }
  }

  for (const eventName of input.eventNames) {
    if (!isValidEventName(eventName)) {
      throw new Error(
        `${context}: event name '${eventName}' is not a valid kebab-case identifier. Expected lowercase segments separated by single hyphens.`,
      )
    }
  }

  const factoryAssignments = new Map<string, string>()
  const claim = (factoryName: string, source: string): void => {
    const existing = factoryAssignments.get(factoryName)
    if (existing !== undefined) {
      throw new Error(
        `${context}: factory name '${factoryName}' is claimed by both ${existing} and ${source}.`,
      )
    }
    factoryAssignments.set(factoryName, source)
  }
  for (const propertyName of input.propertyNames) {
    claim(propertyFactoryName(propertyName), `property '${propertyName}'`)
  }
  for (const eventName of input.eventNames) {
    claim(eventFactoryName(eventName), `event '${eventName}'`)
  }
}
