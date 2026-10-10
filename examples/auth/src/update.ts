import { Match, Option } from 'effect'
import { Update } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import {
  ClearSession,
  LoadExternal,
  LogError,
  NavigateInternal,
  RedirectToDashboard,
  RedirectToHome,
  RedirectToLogin,
  SaveSession,
} from './command'
import { Message } from './message'
import { Model } from './model'
import { LoggedIn, LoggedOut } from './page'
import { AppRoute, urlToAppRoute } from './route'

const foldLoggedOutOutMessage = (outMessage: LoggedOut.OutMessage) =>
  LoggedOut.OutMessage.match(outMessage, {
    SucceededLogin: ({ session }) =>
      Update.makeStep((_model: Model) => ({
        model: LoggedIn.init(AppRoute.Dashboard(), session),
        commands: [SaveSession({ session }), RedirectToDashboard()],
      })),
  })

const foldLoggedOut = Update.foldChild({
  update: LoggedOut.update,
  read: (model: Model) =>
    Match.value(model).pipe(
      Match.tagsExhaustive({
        LoggedOut: loggedOutModel => Option.some(loggedOutModel),
        LoggedIn: () => Option.none(),
      }),
    ),
  write: (_model, nextLoggedOut) => nextLoggedOut,
  toParentMessage: message => Message.GotLoggedOutMessage({ message }),
  foldOutMessage: foldLoggedOutOutMessage,
})

const foldLoggedInOutMessage = (outMessage: LoggedIn.OutMessage) =>
  LoggedIn.OutMessage.match(outMessage, {
    RequestedLogout: () =>
      Update.makeStep((_model: Model) => ({
        model: LoggedOut.init(AppRoute.Home()),
        commands: [ClearSession(), RedirectToHome()],
      })),
  })

const foldLoggedIn = Update.foldChild({
  update: LoggedIn.update,
  read: (model: Model) =>
    Match.value(model).pipe(
      Match.tagsExhaustive({
        LoggedOut: () => Option.none(),
        LoggedIn: loggedInModel => Option.some(loggedInModel),
      }),
    ),
  write: (_model, nextLoggedIn) => nextLoggedIn,
  toParentMessage: message => Message.GotLoggedInMessage({ message }),
  foldOutMessage: foldLoggedInOutMessage,
})

export const update = Update.make((model: Model, message: Message) =>
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
      const route = urlToAppRoute(url)

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

    GotLoggedOutMessage: ({ message }) => foldLoggedOut(model, message),

    GotLoggedInMessage: ({ message }) => foldLoggedIn(model, message),
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
