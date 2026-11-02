import { Effect, Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Calendar from 'foldkit/calendar'
import { inertHtml as ih } from 'foldkit/html'
import * as Scene from 'foldkit/scene'

import * as DatePicker from '@foldkit/ui/datePicker'

export const Key = Symbol('PublicDatePickerConsumer')
export const Definition = Block.makeDefinition('PublicDatePickerConsumer', {
  key: Key,
  Init: Schema.Tuple([]),
  Model: Schema.Struct({ picker: DatePicker.DatePickerBlock.Model }),
  Message: Schema.Never,
  view: { kind: 'Element' },
})
export const PickerBinding = Definition.makeBinding(
  DatePicker.DatePickerBlock,
  {
    field: 'picker',
    init: {
      contextToArgs: () => [
        { id: 'picker', today: Calendar.make(2026, 4, 13) },
      ],
    },
  },
).withOutMessagePolicy({
  fold: Definition.makeOutMessageFold(DatePicker.DatePickerBlock, {
    ChangedViewMonth: () => model => ({ model }),
    SelectedDate: () => model => ({ model }),
    ClearedDate: () => model => ({ model }),
  }),
})
export const Composition = Definition.makeComposition({
  bindings: [PickerBinding],
})
export const DatePickerParent = Definition.makeBlock(
  Effect.gen(function* () {
    const picker = yield* PickerBinding
    return {
      children: [picker],
      init: Composition.makeInit(() => ({ model: {} })),
      update: Composition.makeUpdate({}),
      view: Composition.makeView((model, h) =>
        h.block(
          PickerBinding.embedView({
            slotId: 'picker',
            model: model.picker,
            viewInputs: {
              anchor: { placement: 'bottom-start' },
              maybeSelectedDate: Option.none(),
              triggerContent: () => ih.span([], ['Select a date']),
              toCalendarView: attrs => ih.div(attrs.root),
            },
          }),
        ),
      ),
    }
  }),
).provide(DatePicker.layer)

export const acceptedDatePickerScene = Scene.scene(
  DatePickerParent,
  Scene.init(),
  Scene.expect(Scene.selector('#picker-popover-button')).toHaveText(
    'Select a date',
  ),
)

if (false) {
  // @ts-expect-error DatePicker initialization retains its CalendarDate Schema.
  PickerBinding.init({ args: [{ id: 'picker', today: 'today' }] })
  // @ts-expect-error DatePicker operations retain the exact CalendarDate payload.
  PickerBinding.requestSelectDate('today')
}
