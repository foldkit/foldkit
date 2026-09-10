import { Effect, Match, Option, Schema } from 'effect'
import { Command, Update } from 'foldkit'
import { UrlRequest, load, pushUrl, replaceUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import { ClearSession, LogError, SaveSession } from './command'
import { Message } from './message'
import { LoggedIn, LoggedOut, Model } from './model'
import {
  AppRoute,
  dashboardRouter,
  homeRouter,
  loginRouter,
  urlToAppRoute,
} from './route'

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  execute: ({ href }) =>
    load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
})

export const RedirectToLogin = Command.define('RedirectToLogin', {
  messages: [Message.CompletedNavigateInternal],
  execute: replaceUrl(loginRouter()).pipe(
    Effect.as(Message.CompletedNavigateInternal()),
  ),
})

export const RedirectToDashboard = Command.define('RedirectToDashboard', {
  messages: [Message.CompletedNavigateInternal],
  execute: replaceUrl(dashboardRouter()).pipe(
    Effect.as(Message.CompletedNavigateInternal()),
  ),
})

const RedirectToHome = Command.define('RedirectToHome', {
  messages: [Message.CompletedNavigateInternal],
  execute: replaceUrl(homeRouter()).pipe(
    Effect.as(Message.CompletedNavigateInternal()),
  ),
})

type UpdateReturn = Update.Return<Model, Message>
const withUpdateReturn = Match.withReturnType<UpdateReturn>()

const foldLoggedOutOutMessage = LoggedOut.OutMessage.match<
  Update.Step<Model, Message>
>({
  SucceededLogin:
    ({ session }) =>
    () => ({
      model: LoggedIn.init(AppRoute.Dashboard(), session),
      commands: [SaveSession({ session }), RedirectToDashboard()],
    }),
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

const foldLoggedInOutMessage = LoggedIn.OutMessage.match<
  Update.Step<Model, Message>
>({
  RequestedLogout: () => () => ({
    model: LoggedOut.init(AppRoute.Home()),
    commands: [ClearSession(), RedirectToHome()],
  }),
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

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedLink: ({ request }) =>
      UrlRequest.match<UpdateReturn>(request, {
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
        withUpdateReturn,
        Match.tagsExhaustive({
          LoggedOut: loggedOutModel =>
            Match.value(route).pipe(
              withUpdateReturn,
              Match.tag('Home', 'Login', 'NotFound', route => ({
                model: evo(loggedOutModel, { route: () => route }),
              })),
              Match.orElse(() => ({ model, commands: [RedirectToLogin()] })),
            ),

          LoggedIn: loggedInModel =>
            Match.value(route).pipe(
              withUpdateReturn,
              Match.tag('Dashboard', 'Settings', 'NotFound', route => ({
                model: evo(loggedInModel, { route: () => route }),
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
    CompletedLoadExternal: () => ({ model }),
    CompletedLogError: () => ({ model }),
    SucceededSaveSession: () => ({ model }),
    SucceededClearSession: () => ({ model }),
  })
