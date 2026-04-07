import { Scene } from 'foldkit'

// After clicking "Get Weather", verify exactly one Command was produced
Scene.click(Scene.role('button', { name: 'Get Weather' }))
Scene.expectExactCommands(FetchWeather)
Scene.resolve(FetchWeather, SucceededFetchWeather({ weather }))

// After a successful login, both Commands are produced together
Scene.expectExactCommands(SaveSession, RedirectToDashboard)
Scene.resolve(SaveSession, SucceededSaveSession())
Scene.expectExactCommands(RedirectToDashboard)
Scene.resolve(RedirectToDashboard, CompletedNavigateInternal())
