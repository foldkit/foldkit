import { Schema as S } from 'effect'
import { type Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { evo } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

import { view } from './index.js'

const Message = defineMessageUnion({
  Toggled: { isChecked: S.Boolean },
})
type Message = typeof Message.Type

type Model = Readonly<{ isChecked: boolean }>

type UpdateReturn = Update.Return<Model, Message>

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    Toggled: ({ isChecked }) => ({
      model: evo(model, { isChecked: () => isChecked }),
    }),
  })

const testView =
  ({
    isDisabled = false,
    isReadOnly = false,
    isIndeterminate = false,
  }: {
    isDisabled?: boolean
    isReadOnly?: boolean
    isIndeterminate?: boolean
  } = {}) =>
  (model: Model, h: HtmlBuilder<Message>) =>
    view(
      {
        id: 'test',
        isChecked: model.isChecked,
        onToggle: isChecked => Message.Toggled({ isChecked }),
        isDisabled,
        isReadOnly,
        isIndeterminate,
        toView: ({ checkbox, label }) =>
          h.div(
            [],
            [h.button([...checkbox]), h.span([...label], ['Accept terms'])],
          ),
      },
      h,
    )

const checkbox = Scene.role('checkbox')
const label = Scene.selector('#test-label')

describe('Checkbox controlled view', () => {
  it('reflects the checked state from the parent', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given({ isChecked: true }),
      Scene.expect(checkbox).toHaveAttr('aria-checked', 'true'),
      Scene.expect(checkbox).toHaveAttr('data-checked', ''),
    )
  })

  it('dispatches the new checked state on click', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given({ isChecked: false }),
      Scene.expect(checkbox).toHaveAttr('aria-checked', 'false'),
      Scene.click(checkbox),
      Scene.expect(checkbox).toHaveAttr('aria-checked', 'true'),
    )
  })

  it('dispatches the new checked state on label click', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given({ isChecked: false }),
      Scene.expect(checkbox).toHaveAttr('aria-checked', 'false'),
      Scene.click(label),
      Scene.expect(checkbox).toHaveAttr('aria-checked', 'true'),
    )
  })

  it('is not interactive when disabled', () => {
    Scene.scene(
      { update, view: testView({ isDisabled: true }) },
      Scene.given({ isChecked: false }),
      Scene.expect(checkbox).toBeDisabled(),
      Scene.expect(checkbox).toHaveAttr('data-disabled', ''),
    )
  })

  it('emits read-only attributes without disabled attributes', () => {
    Scene.scene(
      { update, view: testView({ isReadOnly: true }) },
      Scene.given({ isChecked: false }),
      Scene.expect(checkbox).toHaveAttr('aria-readonly', 'true'),
      Scene.expect(checkbox).toHaveAttr('data-readonly', ''),
      Scene.expect(checkbox).not.toBeDisabled(),
      Scene.expect(checkbox).not.toHaveAttr('data-disabled'),
    )
  })

  it('stays focusable but drops every handler when read-only', () => {
    Scene.scene(
      { update, view: testView({ isReadOnly: true }) },
      Scene.given({ isChecked: false }),
      Scene.expect(checkbox).toHaveAttr('tabIndex', '0'),
      Scene.expect(checkbox).not.toHaveHandler('click'),
      Scene.expect(checkbox).not.toHaveHandler('keyup'),
      Scene.expect(label).not.toHaveHandler('click'),
    )
  })

  it('emits both attribute sets when disabled and read-only are combined', () => {
    Scene.scene(
      { update, view: testView({ isDisabled: true, isReadOnly: true }) },
      Scene.given({ isChecked: false }),
      Scene.expect(checkbox).toBeDisabled(),
      Scene.expect(checkbox).toHaveAttr('data-disabled', ''),
      Scene.expect(checkbox).toHaveAttr('aria-readonly', 'true'),
      Scene.expect(checkbox).toHaveAttr('data-readonly', ''),
    )
  })

  it('sets type button so a button control does not submit a form', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given({ isChecked: false }),
      Scene.expect(checkbox).toHaveAttr('type', 'button'),
    )
  })

  it('keeps type button when disabled and read-only', () => {
    Scene.scene(
      { update, view: testView({ isDisabled: true, isReadOnly: true }) },
      Scene.given({ isChecked: false }),
      Scene.expect(checkbox).toHaveAttr('type', 'button'),
    )
  })

  it('renders aria-checked mixed when indeterminate', () => {
    Scene.scene(
      { update, view: testView({ isIndeterminate: true }) },
      Scene.given({ isChecked: false }),
      Scene.expect(checkbox).toHaveAttr('aria-checked', 'mixed'),
      Scene.expect(checkbox).toHaveAttr('data-indeterminate', ''),
    )
  })
})
