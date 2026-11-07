import { Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import * as Scene from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

import type { ViewInputs } from './radioGroup.js'
import {
  FocusOption,
  layer as RadioGroupLayer,
  Message as RadioGroupMessage,
  makeBlock,
} from './radioGroup.js'

const RADIO_ID = 'test'
const options: ReadonlyArray<string> = ['Brush', 'Fill', 'Eraser']

const TestRadioGroup = makeBlock()

const Model = Schema.Struct({
  radioGroup: TestRadioGroup.Model,
  maybeSelectedValue: Schema.Option(Schema.String),
})
type Model = typeof Model.Type

const RadioGroupSceneKey = Symbol('RadioGroupScene')
const RadioGroupSceneBlock = Block.make('RadioGroupScene', {
  key: RadioGroupSceneKey,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([Schema.Option(Schema.String)]),
  ChildInitContext: Schema.String,
  view: { kind: 'Element', Inputs: Block.makeInputContract<Overrides>() },
})

const givenSelection = (maybeSelectedValue: Option.Option<string>) =>
  Scene.init(maybeSelectedValue)
const givenNothingSelected = givenSelection(Option.none())

const foldRadioGroupOutMessage = RadioGroupSceneBlock.makeOutMessageFold(
  TestRadioGroup,
  {
    Selected:
      ({ value }) =>
      model => ({
        model: modifyFields(model, {
          maybeSelectedValue: () => Option.some(value),
        }),
      }),
  },
)

const RadioGroupBinding = RadioGroupSceneBlock.makeRequiredFieldBinding(
  TestRadioGroup,
  {
    field: 'radioGroup',
    init: { contextToArgs: id => [{ id }] },
  },
).withOutMessagePolicy({ fold: foldRadioGroupOutMessage })

const RadioGroupSceneComposition = RadioGroupSceneBlock.makeComposition({
  bindings: [RadioGroupBinding],
})

const update = RadioGroupSceneComposition.makeUpdate({})

type Overrides = Omit<
  Partial<ViewInputs>,
  'options' | 'selectedValue' | 'ariaLabel' | 'toView'
>

const rootView = RadioGroupSceneComposition.makeView.withInputs(
  (model, overrides, h) =>
    h.block(
      RadioGroupBinding.embedView({
        slotId: RADIO_ID,
        model: model.radioGroup,
        viewInputs: {
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
        },
      }),
    ),
)

const init = RadioGroupSceneComposition.makeInit(maybeSelectedValue => ({
  model: { maybeSelectedValue },
  childInitContext: RADIO_ID,
}))
const radioGroupScene = {
  block: RadioGroupSceneBlock,
  layer: RadioGroupSceneBlock.makeLayer(
    Effect.gen(function* () {
      const children = yield* RadioGroupSceneComposition.acquireChildren()

      return {
        children,
        init,
        update,
        view: rootView,
      }
    }),
  ).pipe(Layer.provide(RadioGroupLayer)),
}

const resolveFocusOption = Scene.Command.resolve(
  FocusOption,
  RadioGroupMessage.CompletedFocusOption(),
)

const group = Scene.role('radiogroup')
const option = (index: number) => Scene.selector(`#${RADIO_ID}-option-${index}`)

describe('RadioGroup', () => {
  describe('descriptions', () => {
    it.effect('omits aria-describedby by default', () => {
      return Scene.scene(
        { block: radioGroupScene, viewInputs: {} },
        givenNothingSelected,
        Scene.expect(option(0)).not.toHaveAttr('aria-describedby'),
        Scene.expect(option(1)).not.toHaveAttr('aria-describedby'),
      )
    })

    it.effect('references descriptions only for matching options', () => {
      return Scene.scene(
        {
          block: radioGroupScene,
          viewInputs: {
            hasOptionDescription: (_value, index) => index === 1,
          },
        },
        givenNothingSelected,
        Scene.expect(option(0)).not.toHaveAttr('aria-describedby'),
        Scene.expect(option(1)).toHaveAttr(
          'aria-describedby',
          `${RADIO_ID}-option-1-description`,
        ),
        Scene.expect(option(2)).not.toHaveAttr('aria-describedby'),
      )
    })
  })

  describe('selection', () => {
    it.effect(
      'gives the first option a roving tabindex when nothing is selected',
      () => {
        return Scene.scene(
          { block: radioGroupScene, viewInputs: {} },
          givenNothingSelected,
          Scene.expect(option(0)).toHaveAttr('tabIndex', '0'),
          Scene.expect(option(0)).toHaveAttr('data-active', ''),
          Scene.expect(option(1)).toHaveAttr('tabIndex', '-1'),
          Scene.expect(option(0)).toHaveAttr('aria-checked', 'false'),
        )
      },
    )

    it.effect(
      'checks the clicked option and moves the roving tabindex onto it',
      () => {
        return Scene.scene(
          { block: radioGroupScene, viewInputs: {} },
          givenNothingSelected,
          Scene.expect(option(1)).toHaveHandler('click'),
          Scene.click(option(1)),
          resolveFocusOption,
          Scene.expect(option(1)).toHaveAttr('aria-checked', 'true'),
          Scene.expect(option(1)).toHaveAttr('data-checked', ''),
          Scene.expect(option(1)).toHaveAttr('tabIndex', '0'),
          Scene.expect(option(0)).toHaveAttr('tabIndex', '-1'),
        )
      },
    )

    it.effect('moves the selection with the arrow keys', () => {
      return Scene.scene(
        { block: radioGroupScene, viewInputs: {} },
        givenSelection(Option.some('Brush')),
        Scene.keydown(option(0), 'ArrowDown'),
        resolveFocusOption,
        Scene.expect(option(1)).toHaveAttr('aria-checked', 'true'),
        Scene.expect(option(1)).toHaveAttr('data-active', ''),
      )
    })

    it.effect('selects the focused option on Space', () => {
      return Scene.scene(
        { block: radioGroupScene, viewInputs: {} },
        givenNothingSelected,
        Scene.keydown(option(0), ' '),
        resolveFocusOption,
        Scene.expect(option(0)).toHaveAttr('aria-checked', 'true'),
      )
    })

    it.effect('skips a disabled option when navigating', () => {
      return Scene.scene(
        {
          block: radioGroupScene,
          viewInputs: { isOptionDisabled: value => value === 'Eraser' },
        },
        givenSelection(Option.some('Fill')),
        Scene.expect(option(2)).toHaveAttr('aria-disabled', 'true'),
        Scene.keydown(option(1), 'ArrowDown'),
        resolveFocusOption,
        Scene.expect(option(0)).toHaveAttr('aria-checked', 'true'),
      )
    })

    it.effect(
      'keeps the tab stop on an enabled option when the selection is disabled',
      () => {
        return Scene.scene(
          {
            block: radioGroupScene,
            viewInputs: { isOptionDisabled: value => value === 'Brush' },
          },
          givenSelection(Option.some('Brush')),
          Scene.expect(option(0)).toHaveAttr('aria-disabled', 'true'),
          Scene.expect(option(0)).toHaveAttr('tabIndex', '-1'),
          Scene.expect(option(1)).toHaveAttr('tabIndex', '0'),
        )
      },
    )

    it.effect(
      'sets type button so a button option does not submit a form',
      () => {
        return Scene.scene(
          { block: radioGroupScene, viewInputs: {} },
          givenNothingSelected,
          Scene.expect(option(0)).toHaveAttr('type', 'button'),
          Scene.expect(option(1)).toHaveAttr('type', 'button'),
        )
      },
    )

    it.effect('keeps type button on a disabled option', () => {
      return Scene.scene(
        {
          block: radioGroupScene,
          viewInputs: { isOptionDisabled: value => value === 'Brush' },
        },
        givenNothingSelected,
        Scene.expect(option(0)).toHaveAttr('type', 'button'),
      )
    })
  })

  describe('read-only', () => {
    it.effect(
      'announces itself with aria-readonly and marks the group and every option',
      () => {
        return Scene.scene(
          { block: radioGroupScene, viewInputs: { isReadOnly: true } },
          givenSelection(Option.some('Brush')),
          Scene.expect(group).toHaveAttr('aria-readonly', 'true'),
          Scene.expect(group).toHaveAttr('data-readonly', ''),
          Scene.expect(option(0)).toHaveAttr('data-readonly', ''),
          Scene.expect(option(1)).toHaveAttr('data-readonly', ''),
          Scene.expect(option(2)).toHaveAttr('data-readonly', ''),
        )
      },
    )

    it.effect(
      'moves focus with the arrow keys without changing the selection',
      () => {
        return Scene.scene(
          { block: radioGroupScene, viewInputs: { isReadOnly: true } },
          givenSelection(Option.some('Brush')),
          Scene.keydown(option(0), 'ArrowDown'),
          resolveFocusOption,
          Scene.expect(option(0)).toHaveAttr('aria-checked', 'true'),
          Scene.expect(option(1)).toHaveAttr('aria-checked', 'false'),
          Scene.expect(option(1)).toHaveAttr('data-active', ''),
          Scene.expect(option(0)).not.toHaveAttr('data-active'),
          Scene.expect(option(1)).toHaveAttr('tabIndex', '0'),
          Scene.expect(option(0)).toHaveAttr('tabIndex', '-1'),
        )
      },
    )

    it.effect(
      'jumps to the last option on End and back to the first on Home',
      () => {
        return Scene.scene(
          { block: radioGroupScene, viewInputs: { isReadOnly: true } },
          givenSelection(Option.some('Brush')),
          Scene.keydown(option(0), 'End'),
          resolveFocusOption,
          Scene.expect(option(2)).toHaveAttr('data-active', ''),
          Scene.keydown(option(2), 'Home'),
          resolveFocusOption,
          Scene.expect(option(0)).toHaveAttr('data-active', ''),
          Scene.expect(option(0)).toHaveAttr('aria-checked', 'true'),
        )
      },
    )

    it.effect('ignores Space', () => {
      return Scene.scene(
        { block: radioGroupScene, viewInputs: { isReadOnly: true } },
        givenNothingSelected,
        Scene.keydown(option(1), ' '),
        Scene.expectIgnored(),
        Scene.Command.expectNone(),
        Scene.expect(option(1)).toHaveAttr('aria-checked', 'false'),
      )
    })

    it.effect(
      'drops the click handler while keeping the keydown handler',
      () => {
        return Scene.scene(
          { block: radioGroupScene, viewInputs: { isReadOnly: true } },
          givenNothingSelected,
          Scene.expect(option(1)).not.toHaveHandler('click'),
          Scene.expect(option(1)).toHaveHandler('keydown'),
          Scene.expect(option(1)).toHaveAttr('aria-checked', 'false'),
          Scene.expect(option(0)).toHaveAttr('data-active', ''),
        )
      },
    )

    it.effect(
      'carries both markers and stays inert when the group is also disabled',
      () => {
        return Scene.scene(
          {
            block: radioGroupScene,
            viewInputs: { isReadOnly: true, isDisabled: true },
          },
          givenSelection(Option.some('Brush')),
          Scene.expect(group).toHaveAttr('aria-readonly', 'true'),
          Scene.expect(option(0)).toHaveAttr('aria-disabled', 'true'),
          Scene.expect(option(0)).toHaveAttr('data-disabled', ''),
          Scene.expect(option(0)).toHaveAttr('data-readonly', ''),
          Scene.expect(option(0)).not.toHaveHandler('click'),
          Scene.expect(option(0)).not.toHaveHandler('keydown'),
        )
      },
    )
  })
})
