import { Match, Option } from 'effect'
import { Url } from 'foldkit/url'

import { RedirectToDashboard, RedirectToLogin } from './command'
import {
  ApplicationComposition,
  LoggedInBinding,
  LoggedOutBinding,
} from './composition'
import type { Flags } from './flags'
import { ApplicationRoute, urlToApplicationRoute } from './route'

export const init = ApplicationComposition.makeInit(
  (flags: Flags, url: Url) => {
    const route = urlToApplicationRoute(url)

    return Option.match(flags.maybeSession, {
      onNone: () =>
        Match.value(route).pipe(
          Match.tag('Home', 'Login', 'NotFound', route =>
            LoggedOutBinding.init({
              args: [route],
              toParentModel: loggedOut => loggedOut,
            }),
          ),
          Match.orElse(() =>
            LoggedOutBinding.init({
              args: [ApplicationRoute.Login()],
              toParentModel: loggedOut => loggedOut,
              commands: [RedirectToLogin()],
            }),
          ),
        ),

      onSome: session =>
        Match.value(route).pipe(
          Match.tag('Dashboard', 'Settings', 'NotFound', route =>
            LoggedInBinding.init({
              args: [route, session],
              toParentModel: loggedIn => loggedIn,
            }),
          ),
          Match.orElse(() =>
            LoggedInBinding.init({
              args: [ApplicationRoute.Dashboard(), session],
              toParentModel: loggedIn => loggedIn,
              commands: [RedirectToDashboard()],
            }),
          ),
        ),
    })
  },
)
