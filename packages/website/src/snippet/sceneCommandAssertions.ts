import { Scene } from 'foldkit'

// Single Command. Click a button, acknowledge its Command result.
Scene.click(Scene.role('button', { name: 'Get Weather' }))
Scene.Command.expectExact(FetchWeather)
Scene.Command.resolve(FetchWeather, SucceededFetchWeather({ weather }))

// Lock in args. Pass a Command instance instead of a Definition to match by
// source identity, bound path, AND args. This catches wrong inputs or placement.
Scene.Command.expectExact(FetchWeather({ zipCode: '90210' }))

// Multiple Commands. Resolve a batch in one step; cascading Commands resolve too.
Scene.click(Scene.role('button', { name: 'Sign In' }))
Scene.Command.expectExact(RequestAuthentication, TrackSignInAttempt)
Scene.Command.resolveAll(
  [RequestAuthentication, SucceededRequestAuthentication({ session })],
  [TrackSignInAttempt, CompletedTrackSignInAttempt()],
)

// Resolve the batch while asserting every listed Command was dispatched.
Scene.click(Scene.role('button', { name: 'Sign In' }))
Scene.Command.resolveAllExact(
  [RequestAuthentication, SucceededRequestAuthentication({ session })],
  [TrackSignInAttempt, CompletedTrackSignInAttempt()],
)

// Subset assertion. Use when you only care that a particular Command is pending.
// Definition or instance: instance form locks in the args.
Scene.Command.expectHas(FetchWeather)
Scene.Command.expectHas(FetchWeather({ zipCode: '90210' }))

// Negative assertion. Useful before a transition that should produce no Commands.
Scene.Command.expectNone()

// Block Command. When the Command lives in a child component, resolve it
// with the child's raw result Message. resolve replays the Command's own
// mapMessages wrapping automatically, so you never restate the lift.
Scene.Command.resolve(
  Search.FetchSuggestions,
  Search.SucceededFetchSuggestions({ suggestions }),
)
