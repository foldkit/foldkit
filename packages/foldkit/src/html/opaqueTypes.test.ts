import { Array, Option, Predicate, Schema } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Scene from '../scene/public.js'
import { type View, defineView } from '../submodel/public.js'
import type { MisclassifiedHtmlAttributeName } from './index.js'
import {
  type Attribute,
  type ChildAttribute,
  type ElementAttribute,
  type Html,
  type HtmlBuilder,
  type HtmlNode,
  type InnerHtmlAttribute,
  childAttributes,
  createKeyedLazy,
  createLazy,
  inertHtml,
} from './public.js'

// MESSAGE

const Message = defineMessageUnion({
  ClickedButton: {},
  UpdatedName: { value: Schema.String },
})
type Message = typeof Message.Type

const OtherMessage = defineMessageUnion({
  ClickedElsewhere: {},
})
type OtherMessage = typeof OtherMessage.Type

// TYPE CHECKS

const checkHtmlIsOpaque = () => {
  const greeting = (name: string): Html => inertHtml.p([], [`Hello, ${name}`])
  const page: Html = inertHtml.main([], [greeting('Ada'), null])
  const isNothing: boolean = page === null

  if (page !== null) {
    const node: HtmlNode = page
    // @ts-expect-error Html exposes no selector
    void node.sel
    // @ts-expect-error Html exposes no renderer data
    void node.data
    // @ts-expect-error Html exposes no children array
    void node.children
    // @ts-expect-error Html exposes no live DOM element
    void node.elm
    // @ts-expect-error Html exposes no key
    void node.key
    // @ts-expect-error Html exposes no text
    void node.text
  }

  const nodeShaped = {
    sel: 'div',
    data: {},
    children: [],
    elm: undefined,
    text: undefined,
    key: undefined,
  }
  // @ts-expect-error Html cannot be forged from a node-shaped object
  const forged: Html = nodeShaped

  const lazyResult = createLazy()(greeting, ['Ada'])
  const lazyAsHtml: Html = lazyResult
  if (lazyResult !== null) {
    // @ts-expect-error a createLazy result exposes no children array
    void lazyResult.children
  }

  const keyedResult = createKeyedLazy()('ada', greeting, ['Ada'])
  if (keyedResult !== null) {
    // @ts-expect-error a createKeyedLazy result exposes no renderer data
    void keyedResult.data
  }

  const counterView: View<number, never> = defineView<number>((count, h) =>
    h.span([], [String(count)]),
  )
  const counterResult = counterView(1, inertHtml)
  const counterAsHtml: Html = counterResult
  if (counterResult !== null) {
    // @ts-expect-error a Submodel view result exposes no selector
    void counterResult.sel
  }

  return [isNothing, forged, lazyAsHtml, keyedResult, counterAsHtml]
}

const checkSceneElementIsOpaque = () =>
  Scene.scene(
    {
      update: (model: number, _message: Message) => ({ model: model + 1 }),
      view: (model: number, h: HtmlBuilder<Message>) =>
        h.button([h.OnClick(Message.ClickedButton())], [String(model)]),
    },
    Scene.given(0),
    Scene.tap(simulation => {
      const tree: Scene.Element = simulation.html
      // @ts-expect-error the rendered Scene tree exposes no children array
      void tree.children
      // @ts-expect-error the rendered Scene tree exposes no selector
      void tree.sel

      const maybeButton = Scene.find(tree, 'button')
      if (Option.isSome(maybeButton)) {
        // @ts-expect-error a found Scene element exposes no renderer data
        void maybeButton.value.data
      }

      const maybeByRole = Scene.role('button')(tree)
      if (Option.isSome(maybeByRole)) {
        // @ts-expect-error a Locator result exposes no renderer data
        void maybeByRole.value.data
      }

      const text: string = Scene.textContent(tree)
      const maybeType: Option.Option<string> = Option.flatMap(
        maybeButton,
        element => Scene.attr(element, 'type'),
      )
      void text
      void maybeType
    }),
  )

const checkAttributeIsOpaque = (
  h: HtmlBuilder<Message>,
  other: HtmlBuilder<OtherMessage>,
) => {
  const buttonAttributes: ReadonlyArray<Attribute<Message>> = [
    h.Class('button'),
    h.OnClick(Message.ClickedButton()),
    h.OnInput(value => Message.UpdatedName({ value })),
  ]
  const markup: InnerHtmlAttribute = h.InnerHTML('<b>trusted</b>')
  const button = h.button([...buttonAttributes, h.Type('button')], ['Go'])
  const article = h.article([markup])

  const click: ElementAttribute<Message> = h.OnClick(Message.ClickedButton())
  // @ts-expect-error an Attribute exposes no tag
  void click._tag
  // @ts-expect-error an Attribute exposes no Message payload
  void click.message
  const input = h.OnInput(value => Message.UpdatedName({ value }))
  // @ts-expect-error an Attribute exposes no handler function
  void input.f
  const className: ElementAttribute<never> = h.Class('button')
  // @ts-expect-error an Attribute exposes no value
  void className.value

  // @ts-expect-error an Attribute cannot be forged from its representation
  const forged: Attribute<Message> = { _tag: 'Class', value: 'forged' }

  // @ts-expect-error a textarea rejects InnerHTML content
  const textarea = h.textarea([h.InnerHTML('<b>no</b>')])
  // @ts-expect-error a keyed textarea rejects InnerHTML content
  const keyedTextarea = h.keyed('textarea')('notes', [h.InnerHTML('<b>no</b>')])

  const elsewhere = other.OnClick(OtherMessage.ClickedElsewhere())
  // @ts-expect-error an Attribute of another Message universe is rejected
  const mismatched: Attribute<Message> = elsewhere
  const inert: Attribute<Message> = inertHtml.Class('inert')
  const handlerFree: Attribute<OtherMessage> = h.Class('shared')

  const group: ReadonlyArray<ChildAttribute> = childAttributes([
    h.Class('child'),
  ])
  const maybeFirstChild = Array.head(group)
  if (Option.isSome(maybeFirstChild)) {
    // @ts-expect-error a ChildAttribute exposes no wrapped attribute
    void maybeFirstChild.value.attribute
    // @ts-expect-error a ChildAttribute exposes no dispatcher
    void maybeFirstChild.value.dispatch
  }
  const withGroup = h.div([...group])

  return [
    button,
    article,
    forged,
    textarea,
    keyedTextarea,
    mismatched,
    inert,
    handlerFree,
    withGroup,
  ]
}

// TEST

describe('opaque view types', () => {
  it('declares the type checks for Html, Scene elements, and attributes', () => {
    expect(
      Array.every(
        [checkHtmlIsOpaque, checkSceneElementIsOpaque, checkAttributeIsOpaque],
        Predicate.isFunction,
      ),
    ).toBe(true)
  })

  it('types each attribute constructor by whether its payload carries a Message', () => {
    expectTypeOf<MisclassifiedHtmlAttributeName>().toBeNever()
  })
})
