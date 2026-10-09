import { Effect, Layer, Match, Option, Schema } from 'effect'
import { Command, Update } from 'foldkit'
import { UrlRequest, load, pushUrl, replaceUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import { ClearSession, CommandsLive, LogError, SaveSession } from './command'
import { Message } from './message'
import { Model } from './model'
import { LoggedIn, LoggedOut } from './page'
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
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
})

export const RedirectToLogin = Command.define('RedirectToLogin', {
  messages: [Message.CompletedNavigateInternal],
})

export const RedirectToDashboard = Command.define('RedirectToDashboard', {
  messages: [Message.CompletedNavigateInternal],
})

const RedirectToHome = Command.define('RedirectToHome', {
  messages: [Message.CompletedNavigateInternal],
})

const NavigationLive = Layer.mergeAll(
  NavigateInternal.toLayer(({ url }) =>
    pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
  ),
  LoadExternal.toLayer(({ href }) =>
    load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
  ),
  RedirectToLogin.toLayer(() =>
    replaceUrl(loginRouter()).pipe(
      Effect.as(Message.CompletedNavigateInternal()),
    ),
  ),
  RedirectToDashboard.toLayer(() =>
    replaceUrl(dashboardRouter()).pipe(
      Effect.as(Message.CompletedNavigateInternal()),
    ),
  ),
  RedirectToHome.toLayer(() =>
    replaceUrl(homeRouter()).pipe(
      Effect.as(Message.CompletedNavigateInternal()),
    ),
  ),
)

export const Live = Layer.mergeAll(CommandsLive, NavigationLive, LoggedOut.Live)

type CommandServices = Layer.Success<typeof Live>

type UpdateReturn = Update.Return<Model, Message, CommandServices>
const withUpdateReturn = Match.withReturnType<UpdateReturn>()

const foldLoggedOutOutMessage = LoggedOut.OutMessage.match<
  Update.Step<Model, Message, CommandServices>
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
  Update.Step<Model, Message, CommandServices>
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

export const update = Update.make((model: Model, message: Message) =>
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
                model: modifyFields(loggedOutModel, { route: () => route }),
              })),
              Match.orElse(() => ({ model, commands: [RedirectToLogin()] })),
            ),

          LoggedIn: loggedInModel =>
            Match.value(route).pipe(
              withUpdateReturn,
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
    CompletedLoadExternal: () => ({ model }),
    CompletedLogError: () => ({ model }),
    SucceededSaveSession: () => ({ model }),
    SucceededClearSession: () => ({ model }),
  }),
)
