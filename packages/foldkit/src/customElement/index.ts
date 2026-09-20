import { Array, Cause, Exit, Option, Schema, String, pipe } from 'effect'

import type {
  Attribute,
  Child,
  ChildAttribute,
  Html,
  HtmlBuilder,
} from '../html/index.js'
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

/** Constraint on a declared event's `detail` Schema. The runtime decodes
 * `detail` synchronously inside the DOM event handler, where there is no
 * Effect context to draw from, so a Schema requiring decoding services
 * cannot describe an event payload. */
export type EventSchema = Schema.Codec<unknown, unknown, never, unknown>

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
type EventFactories<Message, Events extends Record<string, EventSchema>> = {
  readonly [
    K in keyof Events as `On${KebabToPascal<string & K>}`
  ]: EventFactory<Message, Schema.Schema.Type<Events[K]>>
}

/** Typed call site for a defined custom element. The element constructor
 *  itself is callable; each declared property gets a PascalCase factory
 *  method, and each declared event gets an `On{PascalCase}` factory method.
 *  The attribute array accepts {@link ChildAttribute} alongside
 *  `Attribute<Message>`, like every html element builder, so a Submodel's
 *  published attribute groups can be spread into a custom element. */
export type ElementBuilder<
  Message,
  Properties extends Record<string, Schema.Top>,
  Events extends Record<string, EventSchema>,
> = ((
  attributes?: ReadonlyArray<Attribute<Message> | ChildAttribute>,
  children?: ReadonlyArray<Child>,
) => Html) &
  PropertyFactories<Message, Properties> &
  EventFactories<Message, Events>

/** Configuration accepted by `CustomElement.define`. */
export interface CustomElementConfig<
  Tag extends string,
  Properties extends Record<string, Schema.Top>,
  Events extends Record<string, EventSchema>,
> {
  readonly tag: Tag
  readonly properties: Properties
  readonly events: Events
}

/** A defined custom element, untyped on Message at definition time so the
 *  spec can be exported and shared across modules. Call `.withMessage(h)`
 *  with a view's builder to mint a typed `ElementBuilder` bound to that
 *  frame's Message universe. The builder argument is a type witness: it
 *  fixes `Message` to the frame the element renders in, so the spec cannot
 *  be bound to a Message universe its events will not dispatch into. */
export interface CustomElementSpec<
  Tag extends string,
  Properties extends Record<string, Schema.Top>,
  Events extends Record<string, EventSchema>,
> {
  readonly tag: Tag
  readonly properties: Properties
  readonly events: Events
  readonly withMessage: <Message>(
    h: HtmlBuilder<Message>,
  ) => ElementBuilder<Message, Properties, Events>
}

/** The typed builder for a given spec and Message universe. Equivalent to
 *  the value `Spec.withMessage<Message>()` returns, expressed as a type
 *  consumers can name without reaching for `ReturnType<typeof ...>`. */
export type Builder<Spec, Message> =
  Spec extends CustomElementSpec<string, infer Properties, infer Events>
    ? ElementBuilder<Message, Properties, Events>
    : never

/** @internal Shared with the Scene test helpers so their error messages name
 *  the same `On*` factory this module generates. */
export const kebabToPascal = (input: string): string =>
  pipe(input, String.split('-'), Array.map(String.capitalize), Array.join(''))

const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/

// A conservative subset of the custom-element name grammar: lowercase start,
// then only characters that cannot carry markup. The hyphen requirement is
// checked separately so its message stays specific.
const CUSTOM_ELEMENT_NAME_PATTERN = /^[a-z][a-z0-9._-]*$/

// Hyphenated names the custom-element spec reserves for SVG and MathML, which
// `customElements.define` rejects with a SyntaxError. They pass the character
// grammar, so they are excluded by name.
const RESERVED_CUSTOM_ELEMENT_NAMES: ReadonlySet<string> = new Set([
  'annotation-xml',
  'color-profile',
  'font-face',
  'font-face-src',
  'font-face-uri',
  'font-face-format',
  'font-face-name',
  'missing-glyph',
])

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
 * Property changes diff across renders; declared `CustomEvent` details are
 * decoded against their Schema before the runtime converts them to Messages.
 * A detail the Schema rejects is reported to the console and dispatches no
 * Message.
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
 *     color: Schema.String,
 *   },
 *   events: {
 *     'color-changed': Schema.Struct({ value: Schema.String }),
 *   },
 * })
 *
 * // Inside a view, with its `h` in scope:
 * const picker = hexColorPicker.withMessage(h)
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
  Events extends Record<string, EventSchema>,
>(
  config: CustomElementConfig<Tag, Properties, Events>,
): CustomElementSpec<Tag, Properties, Events> => {
  const propertyNames = Object.keys(config.properties)
  const eventNames = Object.keys(config.events)

  validateNames({ tag: config.tag, propertyNames, eventNames })

  const buildElementBuilder = (): ElementBuilder<
    unknown,
    Properties,
    Events
  > => {
    const createVNode = customElementVNode<unknown>()(config.tag)

    const elementFn = (
      attributes: ReadonlyArray<Attribute<unknown> | ChildAttribute> = [],
      children: ReadonlyArray<Child> = [],
    ): Html => createVNode(attributes, children)

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const builder = elementFn as Record<string, unknown> & typeof elementFn

    for (const propertyName of propertyNames) {
      builder[propertyFactoryName(propertyName)] = (
        value: unknown,
      ): Attribute<unknown> => Prop({ key: propertyName, value })
    }

    for (const [eventName, detailSchema] of Object.entries(config.events)) {
      const decodeDetail = Schema.decodeUnknownExit(detailSchema)
      const decodeEventDetail = (detail: unknown) => {
        const decodedDetail = decodeDetail(detail)

        // NOTE: `new CustomEvent(name)` leaves `detail` as `null`, while
        // `Schema.Struct({})` is the natural declaration for an event with no
        // payload. Decode the raw detail first so Schemas that accept nullish
        // values keep their declared meaning, then fall back to an empty object.
        if (
          (detail === null || detail === undefined) &&
          Exit.isFailure(decodedDetail)
        ) {
          return decodeDetail({})
        } else {
          return decodedDetail
        }
      }

      builder[eventFactoryName(eventName)] = (
        toMessage: (detail: unknown) => unknown,
      ): Attribute<unknown> =>
        OnCustomEvent({
          name: eventName,
          f: event =>
            Exit.match(decodeEventDetail(event.detail), {
              onFailure: cause => {
                console.error(
                  `[foldkit] CustomElement '${config.tag}' rejected the detail of a "${eventName}" event:`,
                  Cause.squash(cause),
                )
                return Option.none()
              },
              onSuccess: detail => Option.some(toMessage(detail)),
            }),
        })
    }

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return builder as ElementBuilder<unknown, Properties, Events>
  }

  // NOTE: `withMessage` is called once per render, so the ElementBuilder is
  // constructed once and retyped per call. Message is erased at runtime: the
  // factories close over nothing Message-specific, exactly like the html
  // builder singleton.
  let cachedElementBuilder:
    | ElementBuilder<unknown, Properties, Events>
    | undefined

  const withMessage = <Message>(
    _h: HtmlBuilder<Message>,
  ): ElementBuilder<Message, Properties, Events> => {
    cachedElementBuilder ??= buildElementBuilder()
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return cachedElementBuilder as ElementBuilder<Message, Properties, Events>
  }

  return {
    tag: config.tag,
    properties: config.properties,
    events: config.events,
    withMessage,
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

  if (!CUSTOM_ELEMENT_NAME_PATTERN.test(input.tag)) {
    throw new Error(
      `${context}: tag '${input.tag}' is not a valid custom element name. Names must be lowercase, start with a letter, and use only letters, numbers, hyphens, dots, and underscores.`,
    )
  }

  if (RESERVED_CUSTOM_ELEMENT_NAMES.has(input.tag)) {
    throw new Error(
      `${context}: tag '${input.tag}' is a reserved custom element name that the browser rejects.`,
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
