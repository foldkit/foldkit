import { Array, Effect } from 'effect'
import {
  Command,
  expectOutMessage,
  given,
  message,
  model,
  steps,
  story,
} from 'foldkit/story'

import { ApplicationBlock } from './application'

// Set the initial Model.
given(model)

// Send a Message. Commands stay pending.
message(ClickedSubmit())

// Group a reusable sequence without erasing its step types.
steps(given(initialModel), message(ClickedSubmit()))

// Resolve one Command with its result. A Definition matches its source identity;
// an instance also selects its bound path and exact args.
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

// Assert these Commands were produced. Definition matchers retain their source
// identity; instances also select a bound path and exact args.
Command.expectHas(FetchWeather)
Command.expectHas(FetchWeather({ zipCode: '90210' }))

// Assert exactly these Commands were produced (mix Definition and instance).
Command.expectExact(FetchWeather, SaveBoard)
Command.expectExact(FetchWeather({ zipCode: '90210' }), SaveBoard)

// Assert no Commands were produced.
Command.expectNone()

// Assert on the OutMessage.
expectOutMessage(SucceededLogin({ session }))

// Run the scoped Story. Every pending Command must be resolved.
await Effect.runPromise(
  story(
    ApplicationBlock,
    given(model),
    message(ClickedSubmit()),
    Command.expectHas(FetchData),
    Command.resolve(FetchData, SucceededFetch({ data })),
    model(model => {
      expect(model.status).toBe('loaded')
    }),
  ),
)
