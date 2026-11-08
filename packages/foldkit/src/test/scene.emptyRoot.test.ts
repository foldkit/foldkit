import { Effect, Schema } from 'effect'
import { expect, test } from 'vitest'

import type { Document, Html, HtmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Mount from '../mount/index.js'
import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import * as Scene from './scene.js'

const Model = Schema.Struct({ isVisible: Schema.Boolean })
type Model = typeof Model.Type
const Message = defineMessageUnion({
  ChangedUrl: {},
  ClickedHide: {},
  CompletedObserve: {},
})
type Message = typeof Message.Type

const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> =>
  Message.match(message, {
    ChangedUrl: () => ({
      model: modifyFields(model, { isVisible: () => true }),
    }),
    ClickedHide: () => ({
      model: modifyFields(model, { isVisible: () => false }),
    }),
    CompletedObserve: () => ({ model }),
  })

const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  model.isVisible
    ? h.button([h.OnClick(Message.ClickedHide())], ['Hide'])
    : h.empty

const routing = { onUrlChange: () => Message.ChangedUrl() }

test('empty roots have no locator matches and can render an interactive element later', () => {
  Scene.scene(
    { update, view, routing },
    Scene.given(Model.make({ isVisible: false })),
    Scene.expect(Scene.selector('div')).toBeAbsent(),
    Scene.expectAll(Scene.all.role('button')).toBeEmpty(),
    Scene.expectAll(Scene.all.selector('div')).toHaveCount(0),
    Scene.expectAll(Scene.all.text('')).toBeEmpty(),
    Scene.inside(
      Scene.role('region'),
      Scene.expectAll(Scene.all.role('button')).toBeEmpty(),
    ),
    Scene.Navigation.changedUrl('/visible'),
    Scene.expect(Scene.role('button', { name: 'Hide' })).toExist(),
    Scene.click(Scene.role('button', { name: 'Hide' })),
    Scene.expectAll(Scene.all.role('button')).toBeEmpty(),
  )
})

test('an interaction against an empty root retains the scoped missing-target failure', () => {
  expect(() =>
    Scene.scene(
      { update, view },
      Scene.given(Model.make({ isVisible: false })),
      Scene.inside(
        Scene.role('region'),
        Scene.click(Scene.role('button', { name: 'Hide' })),
      ),
    ),
  ).toThrow('I could not find an element matching button "Hide" within region')
})

test('a Document may render an empty body', () => {
  const documentView = (_model: Model, h: HtmlBuilder<Message>): Document => ({
    title: 'Empty Scene',
    body: h.empty,
  })

  Scene.scene(
    { update, view: documentView },
    Scene.given(Model.make({ isVisible: false })),
    Scene.expectAll(Scene.all.selector('[data-testid]')).toBeEmpty(),
  )
})

test('a direct undefined view result remains invalid', () => {
  expect(() =>
    Reflect.apply(Scene.scene, undefined, [
      { update, view: () => undefined },
      Scene.given(Model.make({ isVisible: false })),
    ]),
  ).toThrow()
})

test('an undefined Document body remains invalid', () => {
  expect(() =>
    Reflect.apply(Scene.scene, undefined, [
      { update, view: () => ({ title: 'Invalid Scene', body: undefined }) },
      Scene.given(Model.make({ isVisible: false })),
    ]),
  ).toThrow()
})

const ObserveRoot = Mount.define('ObserveEmptyRoot', {
  messages: [Message.CompletedObserve],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedObserve())
  },
})

test('replacing a mounted root with empty ends it and remounting creates a new occurrence', () => {
  const mountedView = (
    model: Model,
    h: HtmlBuilder<Message, Mount.RequirementsOf<typeof ObserveRoot>>,
  ): Html =>
    model.isVisible
      ? h.button(
          [h.OnClick(Message.ClickedHide()), h.OnMount(ObserveRoot())],
          ['Hide'],
        )
      : h.empty

  Scene.scene(
    { update, view: mountedView, routing },
    Scene.given(Model.make({ isVisible: true })),
    Scene.Mount.expectExact(ObserveRoot),
    Scene.Mount.resolve(ObserveRoot, Message.CompletedObserve()),
    Scene.click(Scene.role('button', { name: 'Hide' })),
    Scene.Mount.expectEnded(ObserveRoot),
    Scene.Mount.expectNone(),
    Scene.Navigation.changedUrl('/visible-again'),
    Scene.Mount.expectExact(ObserveRoot),
    Scene.Mount.resolve(ObserveRoot, Message.CompletedObserve()),
    Scene.Mount.expectNone(),
  )
})
