import { Test } from 'foldkit'

// Set the initial Model.
Test.with(model)

// Send a Message. Commands stay pending.
Test.message(ClickedSubmit())

// Resolve one Command with its result.
Test.resolve(FetchWeather, SucceededFetchWeather({ data }))

// Resolve many Commands at once.
Test.resolveAll([
  [FocusInput, CompletedFocusInput()],
  [ScrollToTop, CompletedScroll()],
])

// Assert without breaking the chain.
Test.tap(({ model, message, commands }) => {
  expect(model.count).toBe(0)
})

// Run the test story. Throws on unresolved Commands.
Test.story(
  update,
  Test.with(model),
  Test.message(ClickedSubmit()),
  Test.resolve(FetchData, SucceededFetch({ data })),
  Test.tap(({ model }) => {
    expect(model.status).toBe('loaded')
  }),
)
