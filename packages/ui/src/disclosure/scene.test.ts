import { Schema } from 'effect'
import { type Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { evo } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

import { view } from './index.js'

const Message = defineMessageUnion({
  Toggled: { isOpen: Schema.Boolean },
})
type Message = typeof Message.Type

type Model = Readonly<{ isOpen: boolean }>

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    Toggled: ({ isOpen }) => ({ model: evo(model, { isOpen: () => isOpen }) }),
  })

const testView =
  ({
    isDisabled = false,
    peek,
  }: { isDisabled?: boolean; peek?: string } = {}) =>
  (model: Model, h: HtmlBuilder<Message>) =>
    view(
      {
        id: 'test',
        isOpen: model.isOpen,
        onToggle: isOpen => Message.Toggled({ isOpen }),
        isDisabled,
        // A section around a paragraph, so the only divs in the scene are
        // the two animatePanel draws and `div div` reaches its inner box.
        toView: ({ button, panel, animatePanel }) =>
          h.section(
            [],
            [
              h.button([...button], ['Details']),
              animatePanel(
                h.p([...panel], ['Panel content']),
                peek === undefined ? {} : { peek },
              ),
            ],
          ),
      },
      h,
    )

const button = Scene.selector('#test-button')
// The box animatePanel draws around the panel: the inner of its two divs.
const panelBox = Scene.selector('div div')

describe('Disclosure controlled view', () => {
  it('reflects the open state from the parent', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given({ isOpen: true }),
      Scene.expect(button).toHaveAttr('aria-expanded', 'true'),
      Scene.expect(button).toHaveAttr('data-open', ''),
    )
  })

  it('dispatches the new open state on click', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given({ isOpen: false }),
      Scene.expect(button).toHaveAttr('aria-expanded', 'false'),
      Scene.click(button),
      Scene.expect(button).toHaveAttr('aria-expanded', 'true'),
    )
  })

  it('toggles on Enter', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given({ isOpen: false }),
      Scene.keydown(button, 'Enter'),
      Scene.expect(button).toHaveAttr('aria-expanded', 'true'),
    )
  })

  it('toggles on Space', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given({ isOpen: false }),
      Scene.keydown(button, ' '),
      Scene.expect(button).toHaveAttr('aria-expanded', 'true'),
    )
  })

  it('is not interactive when disabled', () => {
    Scene.scene(
      { update, view: testView({ isDisabled: true }) },
      Scene.given({ isOpen: false }),
      Scene.expect(button).toBeDisabled(),
      Scene.expect(button).toHaveAttr('data-disabled', ''),
    )
  })

  it('hides the collapsed panel from assistive technology', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given({ isOpen: false }),
      Scene.expect(panelBox).toHaveAttr('aria-hidden', 'true'),
      Scene.expect(panelBox).toHaveStyle('min-height', '0px'),
      Scene.click(button),
      Scene.expect(panelBox).not.toHaveAttr('aria-hidden'),
    )
  })

  it('keeps a peek of the collapsed panel in view and readable', () => {
    Scene.scene(
      { update, view: testView({ peek: '7.5em' }) },
      Scene.given({ isOpen: false }),
      Scene.expect(panelBox).toHaveStyle('min-height', '7.5em'),
      Scene.expect(panelBox).not.toHaveAttr('aria-hidden'),
      Scene.click(button),
      Scene.expect(panelBox).toHaveStyle('min-height', '0px'),
    )
  })

  it('sets type button so the trigger does not submit a form', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given({ isOpen: false }),
      Scene.expect(button).toHaveAttr('type', 'button'),
    )
  })

  it('keeps type button when disabled', () => {
    Scene.scene(
      { update, view: testView({ isDisabled: true }) },
      Scene.given({ isOpen: false }),
      Scene.expect(button).toHaveAttr('type', 'button'),
    )
  })
})
