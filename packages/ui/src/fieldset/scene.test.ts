import { type Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { view } from './index.js'

const Message = defineMessageUnion({
  Ignored: {},
})
type Message = typeof Message.Type

type Model = Readonly<Record<string, never>>

const update = (model: Model): Update.Return<Model, Message> => ({ model })

const testView =
  (hasDescription = false) =>
  (_model: Model, h: HtmlBuilder<Message>) =>
    view(
      {
        id: 'test',
        hasDescription,
        toView: ({ fieldset, legend, description }) =>
          h.fieldset(
            [...fieldset],
            [
              h.legend([...legend], ['Details']),
              ...(hasDescription ? [h.p([...description], ['Hint'])] : []),
            ],
          ),
      },
      h,
    )

const fieldset = Scene.selector('#test')

describe('Fieldset view', () => {
  it('omits aria-describedby by default', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given({}),
      Scene.expect(fieldset).not.toHaveAttr('aria-describedby'),
    )
  })

  it('references the description when opted in', () => {
    Scene.scene(
      { update, view: testView(true) },
      Scene.given({}),
      Scene.expect(fieldset).toHaveAttr('aria-describedby', 'test-description'),
    )
  })
})
