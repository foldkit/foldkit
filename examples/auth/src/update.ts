import { Array, Effect, Match as M, Option, Schema as S } from 'effect'
import { Command } from 'foldkit/command'
import { load, pushUrl, replaceUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import { clearSession, logError, saveSession } from './command'
import {
  GotLoggedInMessage,
  GotLoggedOutMessage,
  Message,
  NoOp,
} from './message'
import { LoggedIn, LoggedOut, Model } from './model'
import {
  DashboardRoute,
  HomeRoute,
  LoggedInRoute,
  LoggedOutRoute,
  dashboardRouter,
  homeRouter,
  loginRouter,
  urlToAppRoute,
} from './route'

type UpdateReturn = [Model, ReadonlyArray<Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      NoOp: () => [model, []],

      ClickedLink: ({ request }) =>
        M.value(request).pipe(
          withUpdateReturn,
          M.tagsExhaustive({
            Internal: ({ url }) => [
              model,
              [pushUrl(urlToString(url)).pipe(Effect.as(NoOp()))],
            ],
            External: ({ href }) => [
              model,
              [load(href).pipe(Effect.as(NoOp()))],
            ],
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
                M.when(S.is(LoggedOutRoute), route => [
                  evo(loggedOutModel, { route: () => route }),
                  [],
                ]),
                M.orElse(() => [
                  model,
                  [replaceUrl(loginRouter()).pipe(Effect.as(NoOp()))],
                ]),
              ),

            LoggedIn: loggedInModel =>
              M.value(route).pipe(
                withUpdateReturn,
                M.when(S.is(LoggedInRoute), route => [
                  evo(loggedInModel, { route: () => route }),
                  [],
                ]),
                M.orElse(() => [
                  model,
                  [replaceUrl(dashboardRouter()).pipe(Effect.as(NoOp()))],
                ]),
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

      SavedSession: () => [model, []],

      FailedSessionSave: ({ error }) => [
        model,
        [logError('Failed to save session:', error)],
      ],

      ClearedSession: () => [model, []],

      FailedSessionClear: ({ error }) => [
        model,
        [logError('Failed to clear session:', error)],
      ],

      GotLoggedOutMessage: ({ message }) =>
        handleGotLoggedOutMessage(model, message),

      GotLoggedInMessage: ({ message }) =>
        handleGotLoggedInMessage(model, message),
    }),
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

  const mappedCommands = Array.map(commands, command =>
    Effect.map(command, message => GotLoggedOutMessage({ message })),
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
              saveSession(session).pipe(Effect.as(NoOp())),
              replaceUrl(dashboardRouter()).pipe(Effect.as(NoOp())),
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

  const mappedCommands = Array.map(commands, command =>
    Effect.map(command, message => GotLoggedInMessage({ message })),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [nextModel, mappedCommands],
    onSome: outMessage =>
      M.value(outMessage).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
          RequestedLogout: () => [
            LoggedOut.init(HomeRoute()),
            [
              ...mappedCommands,
              clearSession().pipe(Effect.as(NoOp())),
              replaceUrl(homeRouter()).pipe(Effect.as(NoOp())),
            ],
          ],
        }),
      ),
  })
}
