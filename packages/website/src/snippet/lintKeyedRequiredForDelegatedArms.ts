import { Match as M } from 'effect'
import { html } from 'foldkit/html'

const h = html<Message>()

// ❌ Bad
// The arms delegate to view functions, so the build cannot see the element
// construction to key. Switching routes patches one page's DOM into the other.
const badRouteView = (model: Model) =>
  h.main(
    [],
    [
      M.value(model.route).pipe(
        M.tagsExhaustive({
          Home: () => homeView(model),
          Settings: () => settingsView(model),
        }),
      ),
    ],
  )

// ✅ Good
const goodRouteView = (model: Model) => {
  const routeContent = M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: () => homeView(model),
      Settings: () => settingsView(model),
    }),
  )

  return h.main([], [h.keyed('div')(model.route._tag, [], [routeContent])])
}
