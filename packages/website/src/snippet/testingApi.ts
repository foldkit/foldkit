import { Story } from 'foldkit'

// Set the initial Model.
Story.with(model)

// Send a Message. Commands stay pending.
Story.message(ClickedSubmit())

// Resolve one Command with its result. Pass a Definition to match by name,
// or a Command instance to match by name AND args.
Story.Command.resolve(FetchWeather, SucceededFetchWeather({ data }))
Story.Command.resolve(
  FetchWeather({ zipCode: '90210' }),
  SucceededFetchWeather({ data }),
)

// Resolve many Commands at once.
Story.Command.resolveAll([
  [FocusInput, CompletedFocusInput()],
  [ScrollToTop, CompletedScrollToTop()],
])

// Assert on the Model.
Story.model(model => {
  expect(model.count).toBe(0)
})

// Assert these Commands were produced. Definition matchers match by name only;
// instance matchers (FetchWeather({ zipCode: '90210' })) match by name AND args.
Story.Command.expectHas(FetchWeather)
Story.Command.expectHas(FetchWeather({ zipCode: '90210' }))

// Assert exactly these Commands were produced (mix Definition and instance).
Story.Command.expectExact(FetchWeather, SaveBoard)
Story.Command.expectExact(FetchWeather({ zipCode: '90210' }), SaveBoard)

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
