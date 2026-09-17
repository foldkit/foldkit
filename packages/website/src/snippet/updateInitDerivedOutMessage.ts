const OutMessage = defineMessageUnion({
  SelectedEndDate: { date: Schema.String },
  CompletedRange: { startDate: Schema.String, endDate: Schema.String },
})
type OutMessage = typeof OutMessage.Type

const foldEndDateOutMessage = DatePicker.OutMessage.match<
  Update.StepWithOutMessage<Model, Message, OutMessage>
>({
  SelectedDate:
    ({ date }) =>
    model => {
      const nextModel = evo(model, {
        maybeEndDate: () => Option.some(date),
      })

      return Option.match(nextModel.maybeStartDate, {
        onNone: () => ({ model: nextModel }),
        onSome: startDate => ({
          model: nextModel,
          outMessage: OutMessage.CompletedRange({ startDate, endDate: date }),
        }),
      })
    },
})

const init = (maybeStartDate: Option.Option<string>) =>
  Update.foldChildInit(DatePicker.boot(), {
    toParentModel: endDatePicker =>
      Model.make({
        endDatePicker,
        maybeStartDate,
        maybeEndDate: Option.none(),
      }),
    toParentMessage: message => Message.GotEndDateMessage({ message }),
    foldOutMessage: foldEndDateOutMessage,
    toParentOutMessage: DatePicker.OutMessage.match<OutMessage>({
      SelectedDate: ({ date }) => OutMessage.SelectedEndDate({ date }),
    }),
  })
