import { Array } from 'effect'
import {
  Command,
  expectOutMessage,
  given,
  message,
  model,
  steps,
  story,
} from 'foldkit/story'

// Set the initial Model.
given(model)

// Send a Message. Commands stay pending.
message(ClickedSubmit())

// Group a reusable sequence without erasing its step types.
steps(given(initialModel), message(ClickedSubmit()))

// Resolve one Command with its result. Pass a Definition to match by name,
// or a Command instance to match by name AND args.
Command.resolve(FetchWeather, SucceededFetchWeather({ data }))
Command.resolve(
  FetchWeather({ zipCode: '90210' }),
  SucceededFetchWeather({ data }),
)

// Resolve many Commands at once. Each entry resolves exactly one matching
// dispatch in declaration order.
Command.resolveAll(
  [FocusInput, CompletedFocusInput()],
  [ScrollToTop, CompletedScrollToTop()],
)

// Resolve and assert a batch. Every listed resolver must match in this call,
// and no actual Command may remain unresolved.
message(ClickedSubmit())
Command.resolveAllExact(
  [FocusInput, CompletedFocusInput()],
  [ScrollToTop, CompletedScrollToTop()],
)

// For N identical responses, compose with Array.makeBy.
Command.resolveAll(
  ...Array.makeBy(3, () => [AnimationTick, CompletedTick()] as const),
)

// Assert on the Model.
model(model => {
  expect(model.count).toBe(0)
})

// Assert these Commands were produced. Definition matchers match by name only;
// instance matchers (FetchWeather({ zipCode: '90210' })) match by name AND args.
Command.expectHas(FetchWeather)
Command.expectHas(FetchWeather({ zipCode: '90210' }))

// Assert exactly these Commands were produced (mix Definition and instance).
Command.expectExact(FetchWeather, SaveBoard)
Command.expectExact(FetchWeather({ zipCode: '90210' }), SaveBoard)

// Assert no Commands were produced.
Command.expectNone()

// Assert on the OutMessage.
expectOutMessage(SucceededLogin({ session }))

// Run the test story. Throws on unresolved Commands.
story(
  update,
  given(model),
  message(ClickedSubmit()),
  Command.expectHas(FetchData),
  Command.resolve(FetchData, SucceededFetch({ data })),
  model(model => {
    expect(model.status).toBe('loaded')
  }),
)
