import { Match as M, Schema as S } from 'effect'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { evo } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

import { view } from './index.js'

const Toggled = m('Toggled', { isOpen: S.Boolean })
const Message = S.Union([Toggled])
type Message = typeof Message.Type

type Model = Readonly<{ isOpen: boolean }>

type UpdateReturn = readonly [Model, ReadonlyArray<never>]

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      Toggled: ({ isOpen }) => [evo(model, { isOpen: () => isOpen }), []],
    }),
  )

const testView =
  ({ isDisabled = false }: { isDisabled?: boolean } = {}) =>
  (model: Model) => {
    const h = html<Message>()

    return view<Message>({
      id: 'test',
      isOpen: model.isOpen,
      onToggle: isOpen => Toggled({ isOpen }),
      isDisabled,
      toView: ({ button, panel, animatePanel }) =>
        h.div(
          [],
          [
            h.button([...button], ['Details']),
            animatePanel(h.div([...panel], ['Panel content'])),
          ],
        ),
    })
  }

const button = Scene.selector('#test-button')

describe('Disclosure controlled view', () => {
  it('reflects the open state from the parent', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.with({ isOpen: true }),
      Scene.expect(button).toHaveAttr('aria-expanded', 'true'),
      Scene.expect(button).toHaveAttr('data-open', ''),
    )
  })

  it('dispatches the new open state on click', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.with({ isOpen: false }),
      Scene.expect(button).toHaveAttr('aria-expanded', 'false'),
      Scene.click(button),
      Scene.expect(button).toHaveAttr('aria-expanded', 'true'),
    )
  })

  it('toggles on Enter', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.with({ isOpen: false }),
      Scene.keydown(button, 'Enter'),
      Scene.expect(button).toHaveAttr('aria-expanded', 'true'),
    )
  })

  it('toggles on Space', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.with({ isOpen: false }),
      Scene.keydown(button, ' '),
      Scene.expect(button).toHaveAttr('aria-expanded', 'true'),
    )
  })

  it('is not interactive when disabled', () => {
    Scene.scene(
      { update, view: testView({ isDisabled: true }) },
      Scene.with({ isOpen: false }),
      Scene.expect(button).toBeDisabled(),
      Scene.expect(button).toHaveAttr('data-disabled', ''),
    )
  })
})
