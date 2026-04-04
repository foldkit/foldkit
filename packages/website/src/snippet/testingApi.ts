import { Story } from 'foldkit'

// Set the initial Model.
Story.with(model)

// Send a Message. Commands stay pending.
Story.message(ClickedSubmit())

// Resolve one Command with its result.
Story.resolve(FetchWeather, SucceededFetchWeather({ data }))

// Resolve many Commands at once.
Story.resolveAll([
  [FocusInput, CompletedFocusInput()],
  [ScrollToTop, CompletedScroll()],
])

// Assert without breaking the chain.
Story.tap(({ model, message, commands }) => {
  expect(model.count).toBe(0)
})

// Run the test story. Throws on unresolved Commands.
Story.story(
  update,
  Story.with(model),
  Story.message(ClickedSubmit()),
  Story.resolve(FetchData, SucceededFetch({ data })),
  Story.tap(({ model }) => {
    expect(model.status).toBe('loaded')
  }),
)
