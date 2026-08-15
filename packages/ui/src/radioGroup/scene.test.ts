import { Match as M, Option, Schema as S } from 'effect'
import * as Command from 'foldkit/command'
import type { HtmlBuilder } from 'foldkit/html'
import { m } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { evo } from 'foldkit/struct'
import * as Update from 'foldkit/update'

import { describe, it } from '@effect/vitest'

import type {
  Model as RadioGroupModel,
  OutMessage as RadioGroupOutMessage,
  ViewInputs,
} from './index.js'
import {
  CompletedFocusOption,
  FocusOption,
  Message as RadioGroupMessage,
  create,
  init,
} from './index.js'

const RADIO_ID = 'test'
const options: ReadonlyArray<string> = ['Brush', 'Fill', 'Eraser']

const TestRadioGroup = create()

const GotRadioGroupMessage = m('GotRadioGroupMessage', {
  message: RadioGroupMessage,
})

const Message = S.Union([GotRadioGroupMessage])
type Message = typeof Message.Type

type Model = Readonly<{
  radioGroup: RadioGroupModel
  maybeSelectedValue: Option.Option<string>
}>

const modelWith = (maybeSelectedValue: Option.Option<string>): Model => ({
  radioGroup: init({ id: RADIO_ID }),
  maybeSelectedValue,
})

const nothingSelected = modelWith(Option.none())

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const foldRadioGroupOutMessage = M.type<RadioGroupOutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => [
        evo(model, { maybeSelectedValue: () => Option.some(value) }),
        [],
      ],
  }),
)

const foldRadioGroup = Update.foldChild({
  update: TestRadioGroup.update,
  read: (model: Model) => Option.some(model.radioGroup),
  write: (model, nextRadioGroup) =>
    evo(model, { radioGroup: () => nextRadioGroup }),
  toParentMessage: message => GotRadioGroupMessage({ message }),
  foldOutMessage: foldRadioGroupOutMessage,
})

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      GotRadioGroupMessage: ({ message }) => foldRadioGroup(model, message),
    }),
  )

type Overrides = Omit<
  Partial<ViewInputs>,
  'options' | 'selectedValue' | 'ariaLabel' | 'toView'
>

const testView =
  (overrides: Overrides = {}) =>
  (model: Model, h: HtmlBuilder<Message>) =>
    h.submodel({
      slotId: RADIO_ID,
      model: model.radioGroup,
      view: TestRadioGroup.view,
      viewInputs: {
        options,
        selectedValue: model.maybeSelectedValue,
        ariaLabel: 'Tool',
        ...overrides,
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
      },
      toParentMessage: message => GotRadioGroupMessage({ message }),
    })

const resolveFocusOption = Scene.Command.resolve(
  FocusOption,
  CompletedFocusOption(),
)

const group = Scene.role('radiogroup')
const option = (index: number) => Scene.selector(`#${RADIO_ID}-option-${index}`)

describe('RadioGroup', () => {
  describe('selection', () => {
    it('gives the first option a roving tabindex when nothing is selected', () => {
      Scene.scene(
        { update, view: testView() },
        Scene.given(nothingSelected),
        Scene.expect(option(0)).toHaveAttr('tabIndex', '0'),
        Scene.expect(option(0)).toHaveAttr('data-active', ''),
        Scene.expect(option(1)).toHaveAttr('tabIndex', '-1'),
        Scene.expect(option(0)).toHaveAttr('aria-checked', 'false'),
      )
    })

    it('checks the clicked option and moves the roving tabindex onto it', () => {
      Scene.scene(
        { update, view: testView() },
        Scene.given(nothingSelected),
        Scene.expect(option(1)).toHaveHandler('click'),
        Scene.click(option(1)),
        resolveFocusOption,
        Scene.expect(option(1)).toHaveAttr('aria-checked', 'true'),
        Scene.expect(option(1)).toHaveAttr('data-checked', ''),
        Scene.expect(option(1)).toHaveAttr('tabIndex', '0'),
        Scene.expect(option(0)).toHaveAttr('tabIndex', '-1'),
      )
    })

    it('moves the selection with the arrow keys', () => {
      Scene.scene(
        { update, view: testView() },
        Scene.given(modelWith(Option.some('Brush'))),
        Scene.keydown(option(0), 'ArrowDown'),
        resolveFocusOption,
        Scene.expect(option(1)).toHaveAttr('aria-checked', 'true'),
        Scene.expect(option(1)).toHaveAttr('data-active', ''),
      )
    })

    it('selects the focused option on Space', () => {
      Scene.scene(
        { update, view: testView() },
        Scene.given(nothingSelected),
        Scene.keydown(option(0), ' '),
        resolveFocusOption,
        Scene.expect(option(0)).toHaveAttr('aria-checked', 'true'),
      )
    })

    it('skips a disabled option when navigating', () => {
      Scene.scene(
        {
          update,
          view: testView({ isOptionDisabled: value => value === 'Eraser' }),
        },
        Scene.given(modelWith(Option.some('Fill'))),
        Scene.expect(option(2)).toHaveAttr('aria-disabled', 'true'),
        Scene.keydown(option(1), 'ArrowDown'),
        resolveFocusOption,
        Scene.expect(option(0)).toHaveAttr('aria-checked', 'true'),
      )
    })

    it('keeps the tab stop on an enabled option when the selection is disabled', () => {
      Scene.scene(
        {
          update,
          view: testView({ isOptionDisabled: value => value === 'Brush' }),
        },
        Scene.given(modelWith(Option.some('Brush'))),
        Scene.expect(option(0)).toHaveAttr('aria-disabled', 'true'),
        Scene.expect(option(0)).toHaveAttr('tabIndex', '-1'),
        Scene.expect(option(1)).toHaveAttr('tabIndex', '0'),
      )
    })

    it('sets type button so a button option does not submit a form', () => {
      Scene.scene(
        { update, view: testView() },
        Scene.given(nothingSelected),
        Scene.expect(option(0)).toHaveAttr('type', 'button'),
        Scene.expect(option(1)).toHaveAttr('type', 'button'),
      )
    })

    it('keeps type button on a disabled option', () => {
      Scene.scene(
        {
          update,
          view: testView({ isOptionDisabled: value => value === 'Brush' }),
        },
        Scene.given(nothingSelected),
        Scene.expect(option(0)).toHaveAttr('type', 'button'),
      )
    })
  })

  describe('read-only', () => {
    it('announces itself with aria-readonly and marks the group and every option', () => {
      Scene.scene(
        { update, view: testView({ isReadOnly: true }) },
        Scene.given(modelWith(Option.some('Brush'))),
        Scene.expect(group).toHaveAttr('aria-readonly', 'true'),
        Scene.expect(group).toHaveAttr('data-readonly', ''),
        Scene.expect(option(0)).toHaveAttr('data-readonly', ''),
        Scene.expect(option(1)).toHaveAttr('data-readonly', ''),
        Scene.expect(option(2)).toHaveAttr('data-readonly', ''),
      )
    })

    it('moves focus with the arrow keys without changing the selection', () => {
      Scene.scene(
        { update, view: testView({ isReadOnly: true }) },
        Scene.given(modelWith(Option.some('Brush'))),
        Scene.keydown(option(0), 'ArrowDown'),
        resolveFocusOption,
        Scene.expect(option(0)).toHaveAttr('aria-checked', 'true'),
        Scene.expect(option(1)).toHaveAttr('aria-checked', 'false'),
        Scene.expect(option(1)).toHaveAttr('data-active', ''),
        Scene.expect(option(0)).not.toHaveAttr('data-active'),
        Scene.expect(option(1)).toHaveAttr('tabIndex', '0'),
        Scene.expect(option(0)).toHaveAttr('tabIndex', '-1'),
      )
    })

    it('jumps to the last option on End and back to the first on Home', () => {
      Scene.scene(
        { update, view: testView({ isReadOnly: true }) },
        Scene.given(modelWith(Option.some('Brush'))),
        Scene.keydown(option(0), 'End'),
        resolveFocusOption,
        Scene.expect(option(2)).toHaveAttr('data-active', ''),
        Scene.keydown(option(2), 'Home'),
        resolveFocusOption,
        Scene.expect(option(0)).toHaveAttr('data-active', ''),
        Scene.expect(option(0)).toHaveAttr('aria-checked', 'true'),
      )
    })

    it('ignores Space', () => {
      Scene.scene(
        { update, view: testView({ isReadOnly: true }) },
        Scene.given(nothingSelected),
        Scene.keydown(option(1), ' '),
        Scene.expectIgnored(),
        Scene.Command.expectNone(),
        Scene.expect(option(1)).toHaveAttr('aria-checked', 'false'),
      )
    })

    it('drops the click handler while keeping the keydown handler', () => {
      Scene.scene(
        { update, view: testView({ isReadOnly: true }) },
        Scene.given(nothingSelected),
        Scene.expect(option(1)).not.toHaveHandler('click'),
        Scene.expect(option(1)).toHaveHandler('keydown'),
        Scene.expect(option(1)).toHaveAttr('aria-checked', 'false'),
        Scene.expect(option(0)).toHaveAttr('data-active', ''),
      )
    })

    it('carries both markers and stays inert when the group is also disabled', () => {
      Scene.scene(
        { update, view: testView({ isReadOnly: true, isDisabled: true }) },
        Scene.given(modelWith(Option.some('Brush'))),
        Scene.expect(group).toHaveAttr('aria-readonly', 'true'),
        Scene.expect(option(0)).toHaveAttr('aria-disabled', 'true'),
        Scene.expect(option(0)).toHaveAttr('data-disabled', ''),
        Scene.expect(option(0)).toHaveAttr('data-readonly', ''),
        Scene.expect(option(0)).not.toHaveHandler('click'),
        Scene.expect(option(0)).not.toHaveHandler('keydown'),
      )
    })
  })
})
