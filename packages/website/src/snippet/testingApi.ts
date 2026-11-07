import { Array, Effect } from 'effect'
import { Story } from 'foldkit'

import { ApplicationBlock, layer } from './block'

// Set the initial Model.
Story.given(Story.model)

// Send a Message. Commands stay pending.
Story.message(ClickedSubmit())

// Group a reusable sequence without erasing its step types.
Story.steps(Story.given(initialModel), Story.message(ClickedSubmit()))

// Resolve one Command with its result. A Definition matches its source identity;
// an instance also selects its bound path and exact args.
Story.Command.resolve(FetchWeather, SucceededFetchWeather({ data }))
Story.Command.resolve(
  FetchWeather({ zipCode: '90210' }),
  SucceededFetchWeather({ data }),
)

// Resolve many Commands at once. Each entry resolves exactly one matching
// dispatch in declaration order.
Story.Command.resolveAll(
  [FocusInput, CompletedFocusInput()],
  [ScrollToTop, CompletedScrollToTop()],
)

// Resolve and assert a batch. Every listed resolver must match in this call,
// and no actual Command may remain unresolved.
Story.message(ClickedSubmit())
Story.Command.resolveAllExact(
  [FocusInput, CompletedFocusInput()],
  [ScrollToTop, CompletedScrollToTop()],
)

// For N identical responses, compose with Array.makeBy.
Story.Command.resolveAll(
  ...Array.makeBy(3, () => [AnimationTick, CompletedTick()] as const),
)

// Assert on the Model.
Story.model(model => {
  expect(model.count).toBe(0)
})

// Assert these Commands were produced. Definition matchers retain their source
// identity; instances also select a bound path and exact args.
Story.Command.expectHas(FetchWeather)
Story.Command.expectHas(FetchWeather({ zipCode: '90210' }))

// Assert exactly these Commands were produced (mix Definition and instance).
Story.Command.expectExact(FetchWeather, SaveBoard)
Story.Command.expectExact(FetchWeather({ zipCode: '90210' }), SaveBoard)

// Assert the exact dispatch order without running the effects.
Story.Command.expectExactInOrder(FetchWeather({ zipCode: '90210' }), SaveBoard)

// Assert no Commands were produced.
Story.Command.expectNone()

// Assert on the OutMessage.
Story.expectOutMessage(SucceededLogin({ session }))

// Run the scoped Story. Every pending Command must be resolved.
await Effect.runPromise(
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(Story.model),
    Story.message(ClickedSubmit()),
    Story.Command.expectHas(FetchData),
    Story.Command.resolve(FetchData, SucceededFetch({ data })),
    Story.model(model => {
      expect(model.status).toBe('loaded')
    }),
  ),
)
