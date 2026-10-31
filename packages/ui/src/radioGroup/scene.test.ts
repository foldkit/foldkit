import { Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import * as Scene from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

import { FocusOption, type ViewInputs, makeBlock } from './radioGroup.js'

const RADIO_ID = 'test'
const options: ReadonlyArray<string> = ['Brush', 'Fill', 'Eraser']

const TestRadioGroup = makeBlock()

type Overrides = Omit<
  Partial<ViewInputs>,
  'options' | 'selectedValue' | 'ariaLabel' | 'toView'
>

class RadioGroupScene extends Block<RadioGroupScene, Overrides>()(
  'RadioGroupScene',
  {
    Model: Schema.Struct({
      radioGroup: TestRadioGroup,
      maybeSelectedValue: Schema.Option(Schema.String),
    }),
  },
) {}

const RadioGroupSceneLive = RadioGroupScene.make(
  Effect.fn(function* (_id, overrides) {
    const radioGroup = yield* new TestRadioGroup('radioGroup', {
      id: RADIO_ID,
    })

    return {
      model: { radioGroup, maybeSelectedValue: Option.none() },
      update: {
        ...radioGroup.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeSelectedValue: () => Option.some(value),
            }),
          }),
        }),
      },
      view: (model, h) =>
        model.radioGroup.view({
          options,
          selectedValue: model.maybeSelectedValue,
          ariaLabel: 'Tool',
          ...overrides,
          toView: ({ group, options: optionInfos }) =>
            h.div(
              [...group],
              optionInfos.map(option =>
                h.button(
                  [...option.option],
                  [h.span([...option.label], [option.value])],
                ),
              ),
            ),
        }),
    }
  }),
).pipe(Layer.provide(TestRadioGroup.Live))

const modelWith = (maybeSelectedValue: Option.Option<string>) => ({
  radioGroup: { id: RADIO_ID, maybeFocusedIndex: Option.none() },
  maybeSelectedValue,
})

const nothingSelected = modelWith(Option.none())

const resolveFocusOption = Scene.Command.resolve(
  FocusOption,
  TestRadioGroup.Message.CompletedFocusOption(),
)

const group = Scene.role('radiogroup')
const option = (index: number) => Scene.selector(`#${RADIO_ID}-option-${index}`)

describe('RadioGroup', () => {
  describe('descriptions', () => {
    it.effect('omits aria-describedby by default', () =>
      Scene.scene(
        RadioGroupSceneLive,
        {},
        Scene.given(nothingSelected),
        Scene.expect(option(0)).not.toHaveAttr('aria-describedby'),
        Scene.expect(option(1)).not.toHaveAttr('aria-describedby'),
      ),
    )

    it.effect('references descriptions only for matching options', () =>
      Scene.scene(
        RadioGroupSceneLive,
        {
          hasOptionDescription: (_value, index) => index === 1,
        },
        Scene.given(nothingSelected),
        Scene.expect(option(0)).not.toHaveAttr('aria-describedby'),
        Scene.expect(option(1)).toHaveAttr(
          'aria-describedby',
          `${RADIO_ID}-option-1-description`,
        ),
        Scene.expect(option(2)).not.toHaveAttr('aria-describedby'),
      ),
    )
  })

  describe('selection', () => {
    it.effect(
      'gives the first option a roving tabindex when nothing is selected',
      () =>
        Scene.scene(
          RadioGroupSceneLive,
          {},
          Scene.given(nothingSelected),
          Scene.expect(option(0)).toHaveAttr('tabIndex', '0'),
          Scene.expect(option(0)).toHaveAttr('data-active', ''),
          Scene.expect(option(1)).toHaveAttr('tabIndex', '-1'),
          Scene.expect(option(0)).toHaveAttr('aria-checked', 'false'),
        ),
    )

    it.effect(
      'checks the clicked option and moves the roving tabindex onto it',
      () =>
        Scene.scene(
          RadioGroupSceneLive,
          {},
          Scene.given(nothingSelected),
          Scene.expect(option(1)).toHaveHandler('click'),
          Scene.click(option(1)),
          resolveFocusOption,
          Scene.expect(option(1)).toHaveAttr('aria-checked', 'true'),
          Scene.expect(option(1)).toHaveAttr('data-checked', ''),
          Scene.expect(option(1)).toHaveAttr('tabIndex', '0'),
          Scene.expect(option(0)).toHaveAttr('tabIndex', '-1'),
        ),
    )

    it.effect('moves the selection with the arrow keys', () =>
      Scene.scene(
        RadioGroupSceneLive,
        {},
        Scene.given(modelWith(Option.some('Brush'))),
        Scene.keydown(option(0), 'ArrowDown'),
        resolveFocusOption,
        Scene.expect(option(1)).toHaveAttr('aria-checked', 'true'),
        Scene.expect(option(1)).toHaveAttr('data-active', ''),
      ),
    )

    it.effect('selects the focused option on Space', () =>
      Scene.scene(
        RadioGroupSceneLive,
        {},
        Scene.given(nothingSelected),
        Scene.keydown(option(0), ' '),
        resolveFocusOption,
        Scene.expect(option(0)).toHaveAttr('aria-checked', 'true'),
      ),
    )

    it.effect('skips a disabled option when navigating', () =>
      Scene.scene(
        RadioGroupSceneLive,
        { isOptionDisabled: value => value === 'Eraser' },
        Scene.given(modelWith(Option.some('Fill'))),
        Scene.expect(option(2)).toHaveAttr('aria-disabled', 'true'),
        Scene.keydown(option(1), 'ArrowDown'),
        resolveFocusOption,
        Scene.expect(option(0)).toHaveAttr('aria-checked', 'true'),
      ),
    )

    it.effect(
      'keeps the tab stop on an enabled option when the selection is disabled',
      () =>
        Scene.scene(
          RadioGroupSceneLive,
          { isOptionDisabled: value => value === 'Brush' },
          Scene.given(modelWith(Option.some('Brush'))),
          Scene.expect(option(0)).toHaveAttr('aria-disabled', 'true'),
          Scene.expect(option(0)).toHaveAttr('tabIndex', '-1'),
          Scene.expect(option(1)).toHaveAttr('tabIndex', '0'),
        ),
    )

    it.effect(
      'sets type button so a button option does not submit a form',
      () =>
        Scene.scene(
          RadioGroupSceneLive,
          {},
          Scene.given(nothingSelected),
          Scene.expect(option(0)).toHaveAttr('type', 'button'),
          Scene.expect(option(1)).toHaveAttr('type', 'button'),
        ),
    )

    it.effect('keeps type button on a disabled option', () =>
      Scene.scene(
        RadioGroupSceneLive,
        { isOptionDisabled: value => value === 'Brush' },
        Scene.given(nothingSelected),
        Scene.expect(option(0)).toHaveAttr('type', 'button'),
      ),
    )
  })

  describe('read-only', () => {
    it.effect(
      'announces itself with aria-readonly and marks the group and every option',
      () =>
        Scene.scene(
          RadioGroupSceneLive,
          { isReadOnly: true },
          Scene.given(modelWith(Option.some('Brush'))),
          Scene.expect(group).toHaveAttr('aria-readonly', 'true'),
          Scene.expect(group).toHaveAttr('data-readonly', ''),
          Scene.expect(option(0)).toHaveAttr('data-readonly', ''),
          Scene.expect(option(1)).toHaveAttr('data-readonly', ''),
          Scene.expect(option(2)).toHaveAttr('data-readonly', ''),
        ),
    )

    it.effect(
      'moves focus with the arrow keys without changing the selection',
      () =>
        Scene.scene(
          RadioGroupSceneLive,
          { isReadOnly: true },
          Scene.given(modelWith(Option.some('Brush'))),
          Scene.keydown(option(0), 'ArrowDown'),
          resolveFocusOption,
          Scene.expect(option(0)).toHaveAttr('aria-checked', 'true'),
          Scene.expect(option(1)).toHaveAttr('aria-checked', 'false'),
          Scene.expect(option(1)).toHaveAttr('data-active', ''),
          Scene.expect(option(0)).not.toHaveAttr('data-active'),
          Scene.expect(option(1)).toHaveAttr('tabIndex', '0'),
          Scene.expect(option(0)).toHaveAttr('tabIndex', '-1'),
        ),
    )

    it.effect(
      'jumps to the last option on End and back to the first on Home',
      () =>
        Scene.scene(
          RadioGroupSceneLive,
          { isReadOnly: true },
          Scene.given(modelWith(Option.some('Brush'))),
          Scene.keydown(option(0), 'End'),
          resolveFocusOption,
          Scene.expect(option(2)).toHaveAttr('data-active', ''),
          Scene.keydown(option(2), 'Home'),
          resolveFocusOption,
          Scene.expect(option(0)).toHaveAttr('data-active', ''),
          Scene.expect(option(0)).toHaveAttr('aria-checked', 'true'),
        ),
    )

    it.effect('ignores Space', () =>
      Scene.scene(
        RadioGroupSceneLive,
        { isReadOnly: true },
        Scene.given(nothingSelected),
        Scene.keydown(option(1), ' '),
        Scene.expectIgnored(),
        Scene.Command.expectNone(),
        Scene.expect(option(1)).toHaveAttr('aria-checked', 'false'),
      ),
    )

    it.effect('drops the click handler while keeping the keydown handler', () =>
      Scene.scene(
        RadioGroupSceneLive,
        { isReadOnly: true },
        Scene.given(nothingSelected),
        Scene.expect(option(1)).not.toHaveHandler('click'),
        Scene.expect(option(1)).toHaveHandler('keydown'),
        Scene.expect(option(1)).toHaveAttr('aria-checked', 'false'),
        Scene.expect(option(0)).toHaveAttr('data-active', ''),
      ),
    )

    it.effect(
      'carries both markers and stays inert when the group is also disabled',
      () =>
        Scene.scene(
          RadioGroupSceneLive,
          { isReadOnly: true, isDisabled: true },
          Scene.given(modelWith(Option.some('Brush'))),
          Scene.expect(group).toHaveAttr('aria-readonly', 'true'),
          Scene.expect(option(0)).toHaveAttr('aria-disabled', 'true'),
          Scene.expect(option(0)).toHaveAttr('data-disabled', ''),
          Scene.expect(option(0)).toHaveAttr('data-readonly', ''),
          Scene.expect(option(0)).not.toHaveHandler('click'),
          Scene.expect(option(0)).not.toHaveHandler('keydown'),
        ),
    )
  })
})
