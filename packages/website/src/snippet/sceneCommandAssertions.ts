import { Scene } from 'foldkit'

// Single Command
Scene.click(Scene.role('button', { name: 'Get Weather' }))
Scene.expectExactCommands(FetchWeather)
Scene.resolve(FetchWeather, SucceededFetchWeather({ weather }))

// Multiple Commands
Scene.click(Scene.role('button', { name: 'Sign In' }))
Scene.expectExactCommands(RequestAuthentication, TrackSignInAttempt)
Scene.resolveAll(
  [RequestAuthentication, SucceededRequestAuthentication({ session })],
  [TrackSignInAttempt, CompletedTrackSignInAttempt()],
)
