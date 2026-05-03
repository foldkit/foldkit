import { Story } from 'foldkit'

// Set the initial Model.
Story.with(model)

// Send a Message. Commands stay pending.
Story.message(ClickedSubmit())

// Resolve one Command with its result.
Story.Command.resolve(FetchWeather, SucceededFetchWeather({ data }))

// Resolve many Commands at once.
Story.Command.resolveAll([
  [FocusInput, CompletedFocusInput()],
  [ScrollToTop, CompletedScroll()],
])

// Assert on the Model.
Story.model(model => {
  expect(model.count).toBe(0)
})

// Assert these Commands were produced.
Story.Command.expectHas(FetchWeather)

// Assert exactly these Commands were produced.
Story.Command.expectExact(FetchWeather, SaveBoard)

// Assert no Commands were produced.
Story.Command.expectNone()

// Assert on the OutMessage.
Story.expectOutMessage(SucceededLogin({ session }))

// Run the test story. Throws on unresolved Commands.
Story.story(
  update,
  Story.with(model),
  Story.message(ClickedSubmit()),
  Story.Command.expectHas(FetchData),
  Story.Command.resolve(FetchData, SucceededFetch({ data })),
  Story.model(model => {
    expect(model.status).toBe('loaded')
  }),
)
