import { Schema as S } from 'effect'
import { type Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { evo } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

import { view } from './index.js'

const Message = defineMessageUnion({
  Changed: { value: S.String },
})
type Message = typeof Message.Type

type Model = Readonly<{ value: string }>

type UpdateReturn = Update.Return<Model, Message>

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    Changed: ({ value }) => ({ model: evo(model, { value: () => value }) }),
  })

const testView =
  ({
    isDisabled = false,
    isReadOnly = false,
  }: { isDisabled?: boolean; isReadOnly?: boolean } = {}) =>
  (model: Model, h: HtmlBuilder<Message>) =>
    view(
      {
        id: 'test',
        value: model.value,
        onInput: value => Message.Changed({ value }),
        isDisabled,
        isReadOnly,
        toView: ({ input, label }) =>
          h.div([], [h.input([...input]), h.label([...label], ['Email'])]),
      },
      h,
    )

const field = Scene.role('textbox')

describe('Input controlled view', () => {
  it('dispatches the typed value', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given({ value: '' }),
      Scene.type(field, 'hello'),
      Scene.expect(field).toHaveValue('hello'),
    )
  })

  it('is not interactive when disabled', () => {
    Scene.scene(
      { update, view: testView({ isDisabled: true }) },
      Scene.given({ value: '' }),
      Scene.expect(field).toBeDisabled(),
      Scene.expect(field).toHaveAttr('data-disabled', ''),
      Scene.expect(field).not.toHaveHandler('input'),
    )
  })

  it('carries the disabled state natively, without aria-disabled', () => {
    Scene.scene(
      { update, view: testView({ isDisabled: true }) },
      Scene.given({ value: '' }),
      Scene.expect(field).toBeDisabled(),
      Scene.expect(field).not.toHaveAttr('aria-disabled'),
    )
  })

  it('emits read-only attributes without disabled attributes', () => {
    Scene.scene(
      { update, view: testView({ isReadOnly: true }) },
      Scene.given({ value: '' }),
      Scene.expect(field).toHaveAttr('readOnly', 'true'),
      Scene.expect(field).toHaveAttr('data-readonly', ''),
      Scene.expect(field).not.toBeDisabled(),
      Scene.expect(field).not.toHaveAttr('data-disabled'),
    )
  })

  it('drops the input handler when read-only', () => {
    Scene.scene(
      { update, view: testView({ isReadOnly: true }) },
      Scene.given({ value: '' }),
      Scene.expect(field).not.toHaveHandler('input'),
    )
  })

  it('emits both attribute sets when disabled and read-only are combined', () => {
    Scene.scene(
      { update, view: testView({ isDisabled: true, isReadOnly: true }) },
      Scene.given({ value: '' }),
      Scene.expect(field).toBeDisabled(),
      Scene.expect(field).toHaveAttr('data-disabled', ''),
      Scene.expect(field).toHaveAttr('readOnly', 'true'),
      Scene.expect(field).toHaveAttr('data-readonly', ''),
    )
  })
})
