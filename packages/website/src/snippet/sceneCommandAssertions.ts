import { Scene } from 'foldkit'

// Single Command. Click a button, acknowledge its Command result.
Scene.click(Scene.role('button', { name: 'Get Weather' }))
Scene.Command.expectExact(FetchWeather)
Scene.Command.resolve(FetchWeather, SucceededFetchWeather({ weather }))

// Lock in args. Pass a Command instance instead of a Definition to match by
// name AND args. Catches regressions where the Command fires with wrong inputs.
Scene.Command.expectExact(FetchWeather({ zipCode: '90210' }))

// Multiple Commands. Resolve a batch in one step; cascading Commands resolve too.
Scene.click(Scene.role('button', { name: 'Sign In' }))
Scene.Command.expectExact(RequestAuthentication, TrackSignInAttempt)
Scene.Command.resolveAll(
  [RequestAuthentication, SucceededRequestAuthentication({ session })],
  [TrackSignInAttempt, CompletedTrackSignInAttempt()],
)

// Subset assertion. Use when you only care that a particular Command is pending.
// Definition or instance: instance form locks in the args.
Scene.Command.expectHas(FetchWeather)
Scene.Command.expectHas(FetchWeather({ zipCode: '90210' }))

// Negative assertion. Useful before a transition that should produce no Commands.
Scene.Command.expectNone()

// Submodel lift. When the Command lives in a child component, lift its
// result Message into the parent's universe (mirrors Scene.Mount.resolve).
Scene.Command.resolve(
  Search.FetchSuggestions,
  Search.SucceededFetchSuggestions({ suggestions }),
  message => GotSearchMessage({ message }),
)
