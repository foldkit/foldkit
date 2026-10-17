import { Match } from 'effect'
import { UrlRequest } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import {
  LoadExternal,
  LogError,
  NavigateInternal,
  RedirectToDashboard,
  RedirectToLogin,
} from './command'
import { ApplicationComposition } from './composition'
import { Message } from './message'
import { urlToApplicationRoute } from './route'

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedLink: ({ request }) =>
      UrlRequest.match(request, {
        Internal: ({ url }) => ({
          model,
          commands: [NavigateInternal({ url: urlToString(url) })],
        }),
        External: ({ href }) => ({
          model,
          commands: [LoadExternal({ href })],
        }),
      }),

    ChangedUrl: ({ url }) => {
      const route = urlToApplicationRoute(url)

      return Match.value(model).pipe(
        Match.tagsExhaustive({
          LoggedOut: loggedOutModel =>
            Match.value(route).pipe(
              Match.tag('Home', 'Login', 'NotFound', route => ({
                model: modifyFields(loggedOutModel, { route: () => route }),
              })),
              Match.orElse(() => ({ model, commands: [RedirectToLogin()] })),
            ),

          LoggedIn: loggedInModel =>
            Match.value(route).pipe(
              Match.tag('Dashboard', 'Settings', 'NotFound', route => ({
                model: modifyFields(loggedInModel, { route: () => route }),
              })),
              Match.orElse(() => ({
                model,
                commands: [RedirectToDashboard()],
              })),
            ),
        }),
      )
    },

    FailedSaveSession: ({ error }) => ({
      model,
      commands: [LogError({ entries: ['Failed to save session:', error] })],
    }),

    FailedClearSession: ({ error }) => ({
      model,
      commands: [LogError({ entries: ['Failed to clear session:', error] })],
    }),

    CompletedNavigateInternal: () => ({ model }),
    CompletedRedirectToLogin: () => ({ model }),
    CompletedRedirectToDashboard: () => ({ model }),
    CompletedRedirectToHome: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),
    CompletedLogError: () => ({ model }),
    SucceededSaveSession: () => ({ model }),
    SucceededClearSession: () => ({ model }),
  }),
)
