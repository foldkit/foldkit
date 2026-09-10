import { Command, click, role } from 'foldkit/scene'

// Single Command. Click a button, acknowledge its Command result.
click(role('button', { name: 'Get Weather' }))
Command.expectExact(FetchWeather)
Command.resolve(FetchWeather, SucceededFetchWeather({ weather }))

// Lock in args. Pass a Command instance instead of a Definition to match by
// name AND args. Catches regressions where the Command fires with wrong inputs.
Command.expectExact(FetchWeather({ zipCode: '90210' }))

// Multiple Commands. Resolve a batch in one step; cascading Commands resolve too.
click(role('button', { name: 'Sign In' }))
Command.expectExact(RequestAuthentication, TrackSignInAttempt)
Command.resolveAll(
  [RequestAuthentication, SucceededRequestAuthentication({ session })],
  [TrackSignInAttempt, CompletedTrackSignInAttempt()],
)

// Resolve the batch while asserting every listed Command was dispatched.
click(role('button', { name: 'Sign In' }))
Command.resolveAllExact(
  [RequestAuthentication, SucceededRequestAuthentication({ session })],
  [TrackSignInAttempt, CompletedTrackSignInAttempt()],
)

// Subset assertion. Use when you only care that a particular Command is pending.
// Definition or instance: instance form locks in the args.
Command.expectHas(FetchWeather)
Command.expectHas(FetchWeather({ zipCode: '90210' }))

// Negative assertion. Useful before a transition that should produce no Commands.
Command.expectNone()

// Submodel Command. When the Command lives in a child component, resolve it
// with the child's raw result Message. resolve replays the Command's own
// mapMessages wrapping automatically, so you never restate the lift.
Command.resolve(
  Search.FetchSuggestions,
  Search.SucceededFetchSuggestions({ suggestions }),
)
