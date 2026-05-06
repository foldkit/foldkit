import { Scene } from 'foldkit'

// Single Command. Click a button, acknowledge its Command result.
Scene.click(Scene.role('button', { name: 'Get Weather' }))
Scene.Command.expectExact(FetchWeather)
Scene.Command.resolve(FetchWeather, SucceededFetchWeather({ weather }))

// Multiple Commands. Resolve a batch in one step; cascading Commands resolve too.
Scene.click(Scene.role('button', { name: 'Sign In' }))
Scene.Command.expectExact(RequestAuthentication, TrackSignInAttempt)
Scene.Command.resolveAll(
  [RequestAuthentication, SucceededRequestAuthentication({ session })],
  [TrackSignInAttempt, CompletedTrackSignInAttempt()],
)

// Subset assertion. Use when you only care that a particular Command is pending.
Scene.Command.expectHas(FetchWeather)

// Negative assertion. Useful before a transition that should produce no Commands.
Scene.Command.expectNone()

// Submodel lift. When the Command lives in a child component, lift its
// result Message into the parent's universe (mirrors Scene.Mount.resolve).
Scene.Command.resolve(
  Search.FetchSuggestions,
  Search.SucceededFetchSuggestions({ suggestions }),
  message => GotSearchMessage({ message }),
)
