import { Array, Effect, Match as M, Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
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

const NavigateInternal = Command.define(
  'NavigateInternal',
  { url: S.String },
  CompletedNavigateInternal,
)(({ url }) => pushUrl(url).pipe(Effect.as(CompletedNavigateInternal())))

const LoadExternal = Command.define(
  'LoadExternal',
  { href: S.String },
  CompletedLoadExternal,
)(({ href }) => load(href).pipe(Effect.as(CompletedLoadExternal())))

const RedirectToLogin = Command.define(
  'RedirectToLogin',
  CompletedNavigateInternal,
)(replaceUrl(loginRouter()).pipe(Effect.as(CompletedNavigateInternal())))

export const RedirectToDashboard = Command.define(
  'RedirectToDashboard',
  CompletedNavigateInternal,
)(replaceUrl(dashboardRouter()).pipe(Effect.as(CompletedNavigateInternal())))

const RedirectToHome = Command.define(
  'RedirectToHome',
  CompletedNavigateInternal,
)(replaceUrl(homeRouter()).pipe(Effect.as(CompletedNavigateInternal())))

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

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

      LoadedSession: ({ session }) =>
        M.value(session).pipe(
          withUpdateReturn,
          M.tagsExhaustive({
            Some: ({ value }) => [LoggedIn.init(DashboardRoute(), value), []],
            None: () => [model, []],
          }),
        ),

      FailedSaveSession: ({ error }) => [
        model,
        [LogError({ entries: ['Failed to save session:', error] })],
      ],

      FailedClearSession: ({ error }) => [
        model,
        [LogError({ entries: ['Failed to clear session:', error] })],
      ],

      GotLoggedOutMessage: ({ message }) =>
        handleGotLoggedOutMessage(model, message),

      GotLoggedInMessage: ({ message }) =>
        handleGotLoggedInMessage(model, message),
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

const handleGotLoggedOutMessage = (
  model: Model,
  message: LoggedOut.Message,
): UpdateReturn => {
  if (model._tag !== 'LoggedOut') {
    return [model, []]
  }

  const [nextModel, commands, maybeOutMessage] = LoggedOut.update(
    model,
    message,
  )

  const mappedCommands = Array.map(
    commands,
    Command.mapEffect(Effect.map(message => GotLoggedOutMessage({ message }))),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [nextModel, mappedCommands],
    onSome: outMessage =>
      M.value(outMessage).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
          SucceededLogin: ({ session }) => [
            LoggedIn.init(DashboardRoute(), session),
            [
              ...mappedCommands,
              SaveSession({ session }),
              RedirectToDashboard(),
            ],
          ],
        }),
      ),
  })
}

const handleGotLoggedInMessage = (
  model: Model,
  message: LoggedIn.Message,
): UpdateReturn => {
  if (model._tag !== 'LoggedIn') {
    return [model, []]
  }

  const [nextModel, commands, maybeOutMessage] = LoggedIn.update(model, message)

  const mappedCommands = Array.map(
    commands,
    Command.mapEffect(Effect.map(message => GotLoggedInMessage({ message }))),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [nextModel, mappedCommands],
    onSome: outMessage =>
      M.value(outMessage).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
          RequestedLogout: () => [
            LoggedOut.init(HomeRoute()),
            [...mappedCommands, ClearSession(), RedirectToHome()],
          ],
        }),
      ),
  })
}
