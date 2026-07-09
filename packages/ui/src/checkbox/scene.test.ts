import { Match as M, Schema as S } from 'effect'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { evo } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

import { view } from './index.js'

const Toggled = m('Toggled', { isChecked: S.Boolean })
const Message = S.Union([Toggled])
type Message = typeof Message.Type

type Model = Readonly<{ isChecked: boolean }>

type UpdateReturn = readonly [Model, ReadonlyArray<never>]

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      Toggled: ({ isChecked }) => [
        evo(model, { isChecked: () => isChecked }),
        [],
      ],
    }),
  )

const testView =
  ({
    isDisabled = false,
    isIndeterminate = false,
  }: { isDisabled?: boolean; isIndeterminate?: boolean } = {}) =>
  (model: Model) => {
    const h = html<Message>()

    return view<Message>({
      id: 'test',
      isChecked: model.isChecked,
      onToggle: isChecked => Toggled({ isChecked }),
      isDisabled,
      isIndeterminate,
      toView: ({ checkbox, label }) =>
        h.div(
          [],
          [h.div([...checkbox], []), h.span([...label], ['Accept terms'])],
        ),
    })
  }

const checkbox = Scene.role('checkbox')
const label = Scene.selector('#test-label')

describe('Checkbox controlled view', () => {
  it('reflects the checked state from the parent', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.with({ isChecked: true }),
      Scene.expect(checkbox).toHaveAttr('aria-checked', 'true'),
      Scene.expect(checkbox).toHaveAttr('data-checked', ''),
    )
  })

  it('dispatches the new checked state on click', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.with({ isChecked: false }),
      Scene.expect(checkbox).toHaveAttr('aria-checked', 'false'),
      Scene.click(checkbox),
      Scene.expect(checkbox).toHaveAttr('aria-checked', 'true'),
    )
  })

  it('dispatches the new checked state on label click', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.with({ isChecked: false }),
      Scene.expect(checkbox).toHaveAttr('aria-checked', 'false'),
      Scene.click(label),
      Scene.expect(checkbox).toHaveAttr('aria-checked', 'true'),
    )
  })

  it('is not interactive when disabled', () => {
    Scene.scene(
      { update, view: testView({ isDisabled: true }) },
      Scene.with({ isChecked: false }),
      Scene.expect(checkbox).toBeDisabled(),
      Scene.expect(checkbox).toHaveAttr('data-disabled', ''),
    )
  })

  it('renders aria-checked mixed when indeterminate', () => {
    Scene.scene(
      { update, view: testView({ isIndeterminate: true }) },
      Scene.with({ isChecked: false }),
      Scene.expect(checkbox).toHaveAttr('aria-checked', 'mixed'),
      Scene.expect(checkbox).toHaveAttr('data-indeterminate', ''),
    )
  })
})
