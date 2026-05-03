import { Scene } from 'foldkit'

// Single Command
Scene.click(Scene.role('button', { name: 'Get Weather' }))
Scene.Command.expectExact(FetchWeather)
Scene.Command.resolve(FetchWeather, SucceededFetchWeather({ weather }))

// Multiple Commands
Scene.click(Scene.role('button', { name: 'Sign In' }))
Scene.Command.expectExact(RequestAuthentication, TrackSignInAttempt)
Scene.Command.resolveAll(
  [RequestAuthentication, SucceededRequestAuthentication({ session })],
  [TrackSignInAttempt, CompletedTrackSignInAttempt()],
)
