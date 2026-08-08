import { Effect, Match as M, Option, Schema as S } from 'effect'
import { Command, Update } from 'foldkit'
import { load, pushUrl, replaceUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import { ClearSession, LogError, SaveSession } from './command'
import {
  CompletedLoadExternal,
  CompletedNavigateInternal,
  GotLoggedInMessage,
  GotLoggedOutMessage,
  Message,
} from './message'
import { LoggedIn, LoggedOut, Model } from './model'
import {
  DashboardRoute,
  HomeRoute,
  dashboardRouter,
  homeRouter,
  loginRouter,
  urlToAppRoute,
} from './route'

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: S.String },
  messages: [CompletedNavigateInternal],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(CompletedNavigateInternal())),
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: S.String },
  messages: [CompletedLoadExternal],
  execute: ({ href }) => load(href).pipe(Effect.as(CompletedLoadExternal())),
})

export const RedirectToLogin = Command.define('RedirectToLogin', {
  messages: [CompletedNavigateInternal],
  execute: replaceUrl(loginRouter()).pipe(
    Effect.as(CompletedNavigateInternal()),
  ),
})

export const RedirectToDashboard = Command.define('RedirectToDashboard', {
  messages: [CompletedNavigateInternal],
  execute: replaceUrl(dashboardRouter()).pipe(
    Effect.as(CompletedNavigateInternal()),
  ),
})

const RedirectToHome = Command.define('RedirectToHome', {
  messages: [CompletedNavigateInternal],
  execute: replaceUrl(homeRouter()).pipe(
    Effect.as(CompletedNavigateInternal()),
  ),
})

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const foldLoggedOutOutMessage: (
  outMessage: LoggedOut.OutMessage,
) => Update.Step<Model, Message> = M.type<LoggedOut.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    SucceededLogin:
      ({ session }) =>
      () => [
        LoggedIn.init(DashboardRoute(), session),
        [SaveSession({ session }), RedirectToDashboard()],
      ],
  }),
)

const foldLoggedOut = Update.foldChild({
  update: LoggedOut.update,
  read: (model: Model) =>
    model._tag === 'LoggedOut' ? Option.some(model) : Option.none(),
  write: (_model, nextLoggedOut) => nextLoggedOut,
  toParentMessage: message => GotLoggedOutMessage({ message }),
  foldOutMessage: foldLoggedOutOutMessage,
})

const foldLoggedInOutMessage: (
  outMessage: LoggedIn.OutMessage,
) => Update.Step<Model, Message> = M.type<LoggedIn.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    RequestedLogout: () => () => [
      LoggedOut.init(HomeRoute()),
      [ClearSession(), RedirectToHome()],
    ],
  }),
)

const foldLoggedIn = Update.foldChild({
  update: LoggedIn.update,
  read: (model: Model) =>
    model._tag === 'LoggedIn' ? Option.some(model) : Option.none(),
  write: (_model, nextLoggedIn) => nextLoggedIn,
  toParentMessage: message => GotLoggedInMessage({ message }),
  foldOutMessage: foldLoggedInOutMessage,
})

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tags({
      ClickedLink: ({ request }) =>
        M.value(request).pipe(
          withUpdateReturn,
          M.tagsExhaustive({
            Internal: ({ url }) => [
              model,
              [NavigateInternal({ url: urlToString(url) })],
            ],
            External: ({ href }) => [model, [LoadExternal({ href })]],
          }),
        ),

      ChangedUrl: ({ url }) => {
        const route = urlToAppRoute(url)

        return M.value(model).pipe(
          withUpdateReturn,
          M.tagsExhaustive({
            LoggedOut: loggedOutModel =>
              M.value(route).pipe(
                withUpdateReturn,
                M.tag('Home', 'Login', 'NotFound', route => [
                  evo(loggedOutModel, { route: () => route }),
                  [],
                ]),
                M.orElse(() => [model, [RedirectToLogin()]]),
              ),

            LoggedIn: loggedInModel =>
              M.value(route).pipe(
                withUpdateReturn,
                M.tag('Dashboard', 'Settings', 'NotFound', route => [
                  evo(loggedInModel, { route: () => route }),
                  [],
                ]),
                M.orElse(() => [model, [RedirectToDashboard()]]),
              ),
          }),
        )
      },

      FailedSaveSession: ({ error }) => [
        model,
        [LogError({ entries: ['Failed to save session:', error] })],
      ],

      FailedClearSession: ({ error }) => [
        model,
        [LogError({ entries: ['Failed to clear session:', error] })],
      ],

      GotLoggedOutMessage: ({ message }) => foldLoggedOut(message)(model),

      GotLoggedInMessage: ({ message }) => foldLoggedIn(message)(model),
    }),
    M.tag(
      'CompletedNavigateInternal',
      'CompletedLoadExternal',
      'CompletedLogError',
      'SucceededSaveSession',
      'SucceededClearSession',
      () => [model, []],
    ),
    M.exhaustive,
  )
