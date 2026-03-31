import { Effect, Match, Option } from 'effect'

import { Dispatch } from '../runtime/dispatch'

// TERMINAL VIEW TYPE

/** A terminal view element represented as an Effect that produces a TerminalNode. */
export type TerminalView = Effect.Effect<TerminalNode | null, never, Dispatch>
type Child = TerminalView | string

// TERMINAL NODE

export type TerminalNode = BoxNode | TextNode

export type BoxNode = Readonly<{
  _tag: 'Box'
  attributes: TerminalAttributes
  children: ReadonlyArray<TerminalNode>
}>

export type TextNode = Readonly<{
  _tag: 'Text'
  attributes: TerminalAttributes
  content: string
}>

// ATTRIBUTES

export type Color =
  | 'Black'
  | 'Red'
  | 'Green'
  | 'Yellow'
  | 'Blue'
  | 'Magenta'
  | 'Cyan'
  | 'White'
  | 'Default'
  | 'BrightBlack'
  | 'BrightRed'
  | 'BrightGreen'
  | 'BrightYellow'
  | 'BrightBlue'
  | 'BrightMagenta'
  | 'BrightCyan'
  | 'BrightWhite'

export type FlexDirection = 'Row' | 'Column'

export type BorderStyle = 'None' | 'Single' | 'Double' | 'Round' | 'Bold'

export type TerminalAttributes = Readonly<{
  foreground: Option.Option<Color>
  background: Option.Option<Color>
  isBold: boolean
  isDim: boolean
  isUnderline: boolean
  isItalic: boolean
  flexDirection: FlexDirection
  width: Option.Option<number>
  height: Option.Option<number>
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number
  border: BorderStyle
}>

export const emptyAttributes: TerminalAttributes = {
  foreground: Option.none(),
  background: Option.none(),
  isBold: false,
  isDim: false,
  isUnderline: false,
  isItalic: false,
  flexDirection: 'Column',
  width: Option.none(),
  height: Option.none(),
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  border: 'None',
}

// ATTRIBUTE CONSTRUCTORS

export type Attribute =
  | Readonly<{ _tag: 'Fg'; color: Color }>
  | Readonly<{ _tag: 'Bg'; color: Color }>
  | Readonly<{ _tag: 'Bold' }>
  | Readonly<{ _tag: 'Dim' }>
  | Readonly<{ _tag: 'Underline' }>
  | Readonly<{ _tag: 'Italic' }>
  | Readonly<{ _tag: 'Direction'; direction: FlexDirection }>
  | Readonly<{ _tag: 'Width'; value: number }>
  | Readonly<{ _tag: 'Height'; value: number }>
  | Readonly<{
      _tag: 'Padding'
      top: number
      right: number
      bottom: number
      left: number
    }>
  | Readonly<{ _tag: 'Border'; style: BorderStyle }>

const resolveAttributes = (
  attributes: ReadonlyArray<Attribute>,
): TerminalAttributes => {
  let result = emptyAttributes

  for (const attribute of attributes) {
    result = Match.value(attribute).pipe(
      Match.tag('Fg', ({ color }) => ({
        ...result,
        foreground: Option.some(color),
      })),
      Match.tag('Bg', ({ color }) => ({
        ...result,
        background: Option.some(color),
      })),
      Match.tag('Bold', () => ({ ...result, isBold: true as const })),
      Match.tag('Dim', () => ({ ...result, isDim: true as const })),
      Match.tag('Underline', () => ({
        ...result,
        isUnderline: true as const,
      })),
      Match.tag('Italic', () => ({ ...result, isItalic: true as const })),
      Match.tag('Direction', ({ direction }) => ({
        ...result,
        flexDirection: direction,
      })),
      Match.tag('Width', ({ value }) => ({
        ...result,
        width: Option.some(value),
      })),
      Match.tag('Height', ({ value }) => ({
        ...result,
        height: Option.some(value),
      })),
      Match.tag('Padding', ({ top, right, bottom, left }) => ({
        ...result,
        paddingTop: top,
        paddingRight: right,
        paddingBottom: bottom,
        paddingLeft: left,
      })),
      Match.tag('Border', ({ style }) => ({ ...result, border: style })),
      Match.exhaustive,
    )
  }

  return result
}

// ELEMENT CONSTRUCTORS

const resolveChild = (child: Child): TerminalView =>
  typeof child === 'string'
    ? Effect.succeed({
        _tag: 'Text' as const,
        attributes: emptyAttributes,
        content: child,
      })
    : child

const createBox = (
  attributes: ReadonlyArray<Attribute>,
  children: ReadonlyArray<Child>,
): TerminalView =>
  Effect.map(
    Effect.all(children.map(resolveChild)),
    (resolvedChildren): TerminalNode => ({
      _tag: 'Box',
      attributes: resolveAttributes(attributes),
      children: resolvedChildren.filter(
        (child): child is TerminalNode => child !== null,
      ),
    }),
  )

const createText = (
  attributes: ReadonlyArray<Attribute>,
  content: string,
): TerminalView =>
  Effect.succeed({
    _tag: 'Text',
    attributes: resolveAttributes(attributes),
    content,
  })

// PUBLIC API

type BoxFunction = (
  attributes: ReadonlyArray<Attribute>,
  children: ReadonlyArray<Child>,
) => TerminalView

type TextFunction = (
  attributes: ReadonlyArray<Attribute>,
  content: string,
) => TerminalView

type TerminalElements = Readonly<{
  box: BoxFunction
  text: TextFunction
  empty: TerminalView
}>

type TerminalAttributeConstructors = Readonly<{
  Fg: (color: Color) => Attribute
  Bg: (color: Color) => Attribute
  Bold: Attribute
  Dim: Attribute
  Underline: Attribute
  Italic: Attribute
  Direction: (direction: FlexDirection) => Attribute
  Width: (value: number) => Attribute
  Height: (value: number) => Attribute
  Padding: (
    top: number,
    right: number,
    bottom: number,
    left: number,
  ) => Attribute
  Border: (style: BorderStyle) => Attribute
}>

/**
 * Factory that returns all terminal element constructors, attribute
 * constructors, and `empty` for rendering nothing.
 */
export const terminal = <_Message = never>(): TerminalElements &
  TerminalAttributeConstructors => ({
  box: createBox,
  text: createText,
  empty: Effect.succeed(null),
  Fg: (color): Attribute => ({ _tag: 'Fg', color }),
  Bg: (color): Attribute => ({ _tag: 'Bg', color }),
  Bold: { _tag: 'Bold' },
  Dim: { _tag: 'Dim' },
  Underline: { _tag: 'Underline' },
  Italic: { _tag: 'Italic' },
  Direction: (direction): Attribute => ({ _tag: 'Direction', direction }),
  Width: (value): Attribute => ({ _tag: 'Width', value }),
  Height: (value): Attribute => ({ _tag: 'Height', value }),
  Padding: (top, right, bottom, left): Attribute => ({
    _tag: 'Padding',
    top,
    right,
    bottom,
    left,
  }),
  Border: (style): Attribute => ({ _tag: 'Border', style }),
})
