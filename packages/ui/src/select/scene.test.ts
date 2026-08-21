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
  ({ isDisabled = false }: { isDisabled?: boolean } = {}) =>
  (model: Model, h: HtmlBuilder<Message>) =>
    view(
      {
        id: 'test',
        value: model.value,
        onChange: value => Message.Changed({ value }),
        isDisabled,
        toView: ({ select, label }) =>
          h.div(
            [],
            [
              h.select([...select], [h.option([h.Value('a')], ['A'])]),
              h.label([...label], ['Choice']),
            ],
          ),
      },
      h,
    )

const field = Scene.role('combobox')

describe('Select controlled view', () => {
  it('is not interactive when disabled', () => {
    Scene.scene(
      { update, view: testView({ isDisabled: true }) },
      Scene.given({ value: 'a' }),
      Scene.expect(field).toBeDisabled(),
      Scene.expect(field).toHaveAttr('data-disabled', ''),
      Scene.expect(field).not.toHaveHandler('change'),
    )
  })

  it('carries the disabled state natively, without aria-disabled', () => {
    Scene.scene(
      { update, view: testView({ isDisabled: true }) },
      Scene.given({ value: 'a' }),
      Scene.expect(field).toBeDisabled(),
      Scene.expect(field).not.toHaveAttr('aria-disabled'),
    )
  })
})
