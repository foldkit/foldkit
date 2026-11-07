import { Layer, Option, Schema } from 'effect'
import { Block, Calendar } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { DatePicker } from '@foldkit/ui'

const Model = Schema.Struct({
  maybeStartDate: Schema.Option(Calendar.CalendarDate),
  maybeEndDate: Schema.Option(Calendar.CalendarDate),
  endDatePicker: DatePicker.DatePickerBlock.Model,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  UpdatedStartDate: { date: Calendar.CalendarDate },
  RequestedRestoreEndDate: { date: Calendar.CalendarDate },
})
type Message = typeof Message.Type

const OutMessage = defineMessageUnion({
  SelectedEndDate: { date: Calendar.CalendarDate },
  CompletedRange: {
    startDate: Calendar.CalendarDate,
    endDate: Calendar.CalendarDate,
  },
})
type OutMessage = typeof OutMessage.Type

export const DateRangeKey = Symbol('DateRange')
export const DateRangeBlock = Block.make('DateRange', {
  key: DateRangeKey,
  Model,
  Message,
  OutMessage,
  InitArgs: Schema.Tuple([Calendar.CalendarDate]),
  ChildInitContext: Calendar.CalendarDate,
})
const {
  makeStep,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
  makeOutMessageForward,
  makeComposition,
} = DateRangeBlock

const EndDatePickerBinding = makeRequiredFieldBinding(
  DatePicker.DatePickerBlock,
  {
    field: 'endDatePicker',
    init: {
      contextToArgs: today => [{ id: 'end-date', today }],
    },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(DatePicker.DatePickerBlock, {
    SelectedDate: ({ date }) =>
      makeStep(model => {
        const nextModel = modifyFields(model, {
          maybeEndDate: () => Option.some(date),
        })

        return Option.match(model.maybeStartDate, {
          onNone: () => ({ model: nextModel }),
          onSome: startDate => ({
            model: nextModel,
            outMessage: OutMessage.CompletedRange({ startDate, endDate: date }),
          }),
        })
      }),
    ClearedDate: () =>
      makeFieldsStep(() => ({ maybeEndDate: () => Option.none() })),
    ChangedViewMonth: makeNoopStep,
  }),
  forward: makeOutMessageForward(DatePicker.DatePickerBlock, {
    SelectedDate: ({ date }) => OutMessage.SelectedEndDate({ date }),
    ClearedDate: () => undefined,
    ChangedViewMonth: () => undefined,
  }),
})

const DateRangeComposition = makeComposition({
  bindings: [EndDatePickerBinding],
})
const init = DateRangeComposition.makeInit(today => ({
  childInitContext: today,
  model: { maybeStartDate: Option.none(), maybeEndDate: Option.none() },
}))
const update = DateRangeComposition.makeUpdate({
  UpdatedStartDate: makeFieldsStep.fromMessage(({ date }) => ({
    maybeStartDate: () => Option.some(date),
  })),
  RequestedRestoreEndDate: (model, { date }) =>
    EndDatePickerBinding.requestSelectDate(date)(model),
})

export const layer = DateRangeBlock.makeLayer({
  init,
  update,
}).pipe(Layer.provide(DatePicker.layer))
