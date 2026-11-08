import { Array, Tuple } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './block'

// Set the initial Model.
Story.given(initialModel)

// Send a Message. Commands stay pending.
Story.message(Message.ClickedSubmit())

// Group a reusable sequence without erasing its step types.
Story.steps(Story.given(initialModel), Story.message(Message.ClickedSubmit()))

// Resolve one Command with its result. A Definition matches its source identity;
// an instance also selects its bound path and exact args.
Story.Command.resolve(FetchWeather, Message.SucceededFetchWeather({ data }))
Story.Command.resolve(
  FetchWeather({ zipCode: '90210' }),
  Message.SucceededFetchWeather({ data }),
)

// Resolve matching current pending Commands at this point. Each entry resolves
// exactly one matching dispatch in declaration order. Unused entries are
// discarded when this step ends; unrelated Commands remain pending.
Story.Command.resolveAll(
  [FocusInput, Message.CompletedFocusInput()],
  [ScrollToTop, Message.CompletedScrollToTop()],
)

// Resolve and assert a batch. Every listed resolver must match in this call,
// and no actual Command may remain unresolved.
Story.message(Message.ClickedSubmit())
Story.Command.resolveAllExact(
  [FocusInput, Message.CompletedFocusInput()],
  [ScrollToTop, Message.CompletedScrollToTop()],
)

// For N identical responses, compose with Array.makeBy.
Story.Command.resolveAll(
  ...Array.makeBy(3, () => Tuple.make(AnimationTick, Message.CompletedTick())),
)

// Deliver a declared Subscription output through the selected Block graph.
Story.Subscription.emit(subscriptions.ticks, Message.Ticked())

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
Story.expectOutMessage(OutMessage.SucceededLogin({ session }))

// Run the scoped Story. Every pending Command must be resolved.
it.effect('loads the submitted data', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(initialModel),
    Story.message(Message.ClickedSubmit()),
    Story.Command.expectHas(FetchData),
    Story.Command.resolve(FetchData, Message.SucceededFetch({ data })),
    Story.model(model => {
      expect(model.status).toBe('loaded')
    }),
  ),
)
