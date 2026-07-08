import { Match as M, Option, Schema as S } from 'effect'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { evo } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

import { view } from './index.js'

const RADIO_ID = 'test'
const options: ReadonlyArray<string> = ['Brush', 'Fill', 'Eraser']

const SelectedOption = m('SelectedOption', { value: S.String })

const Message = S.Union([SelectedOption])
type Message = typeof Message.Type

type Model = Readonly<{ selectedValue: Option.Option<string> }>

const init: Model = { selectedValue: Option.none() }

type UpdateReturn = readonly [Model, ReadonlyArray<never>]

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      SelectedOption: ({ value }) => [
        evo(model, { selectedValue: () => Option.some(value) }),
        [],
      ],
    }),
  )

const testView = (disabledValue?: string) => (model: Model) => {
  const h = html<Message>()

  return view<string, Message>({
    id: RADIO_ID,
    selectedValue: model.selectedValue,
    options,
    ariaLabel: 'Tool',
    onSelect: value => SelectedOption({ value }),
    isOptionDisabled: value => value === disabledValue,
    toView: ({ group, options: optionInfos }) =>
      h.div(
        [...group],
        optionInfos.map(option =>
          h.div(
            [...option.option],
            [h.span([...option.label], [option.value])],
          ),
        ),
      ),
  })
}

const option = (index: number) => Scene.selector(`#${RADIO_ID}-option-${index}`)

describe('RadioGroup controlled view', () => {
  it('gives the first option a roving tabindex when nothing is selected', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.with(init),
      Scene.expect(option(0)).toHaveAttr('tabIndex', '0'),
      Scene.expect(option(1)).toHaveAttr('tabIndex', '-1'),
      Scene.expect(option(0)).toHaveAttr('aria-checked', 'false'),
    )
  })

  it('checks the clicked option and dispatches the parent Message', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.with(init),
      Scene.click(option(1)),
      Scene.expect(option(1)).toHaveAttr('aria-checked', 'true'),
      Scene.expect(option(1)).toHaveAttr('data-checked', ''),
      Scene.expect(option(1)).toHaveAttr('tabIndex', '0'),
      Scene.expect(option(0)).toHaveAttr('tabIndex', '-1'),
    )
  })

  it('moves the selection with the arrow keys', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.with({ selectedValue: Option.some('Brush') }),
      Scene.keydown(option(0), 'ArrowDown'),
      Scene.expect(option(1)).toHaveAttr('aria-checked', 'true'),
    )
  })

  it('selects the focused option on Space', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.with(init),
      Scene.keydown(option(0), ' '),
      Scene.expect(option(0)).toHaveAttr('aria-checked', 'true'),
    )
  })

  it('skips a disabled option when navigating', () => {
    Scene.scene(
      { update, view: testView('Eraser') },
      Scene.with({ selectedValue: Option.some('Fill') }),
      Scene.expect(option(2)).toHaveAttr('aria-disabled', 'true'),
      Scene.keydown(option(1), 'ArrowDown'),
      Scene.expect(option(0)).toHaveAttr('aria-checked', 'true'),
    )
  })

  it('keeps the tab stop on an enabled option when the selection is disabled', () => {
    Scene.scene(
      { update, view: testView('Brush') },
      Scene.with({ selectedValue: Option.some('Brush') }),
      Scene.expect(option(0)).toHaveAttr('aria-disabled', 'true'),
      Scene.expect(option(0)).toHaveAttr('tabIndex', '-1'),
      Scene.expect(option(1)).toHaveAttr('tabIndex', '0'),
    )
  })
})
