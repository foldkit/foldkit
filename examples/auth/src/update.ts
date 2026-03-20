import { Array, Effect, Match as M, Option } from 'effect'
import { Command } from 'foldkit'
import { load, pushUrl, replaceUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import { clearSession, logError, saveSession } from './command'
import {
  CompletedExternalNavigation,
  CompletedInternalNavigation,
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

type UpdateReturn = [Model, ReadonlyArray<Command.Command<Message>>]
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
              [
                pushUrl(urlToString(url)).pipe(
                  Effect.as(CompletedInternalNavigation()),
                  Command.make('NavigateInternal'),
                ),
              ],
            ],
            External: ({ href }) => [
              model,
              [
                load(href).pipe(
                  Effect.as(CompletedExternalNavigation()),
                  Command.make('LoadExternal'),
                ),
              ],
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
                M.tag('Home', 'Login', 'NotFound', route => [
                  evo(loggedOutModel, { route: () => route }),
                  [],
                ]),
                M.orElse(() => [
                  model,
                  [
                    replaceUrl(loginRouter()).pipe(
                      Effect.as(CompletedInternalNavigation()),
                      Command.make('RedirectToLogin'),
                    ),
                  ],
                ]),
              ),

            LoggedIn: loggedInModel =>
              M.value(route).pipe(
                withUpdateReturn,
                M.tag('Dashboard', 'Settings', 'NotFound', route => [
                  evo(loggedInModel, { route: () => route }),
                  [],
                ]),
                M.orElse(() => [
                  model,
                  [
                    replaceUrl(dashboardRouter()).pipe(
                      Effect.as(CompletedInternalNavigation()),
                      Command.make('RedirectToDashboard'),
                    ),
                  ],
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

      FailedSessionSave: ({ error }) => [
        model,
        [logError('Failed to save session:', error)],
      ],

      FailedSessionClear: ({ error }) => [
        model,
        [logError('Failed to clear session:', error)],
      ],

      GotLoggedOutMessage: ({ message }) =>
        handleGotLoggedOutMessage(model, message),

      GotLoggedInMessage: ({ message }) =>
        handleGotLoggedInMessage(model, message),
    }),
    M.tag(
      'CompletedInternalNavigation',
      'CompletedExternalNavigation',
      'CompletedErrorLog',
      'SavedSession',
      'ClearedSession',
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
              saveSession(session),
              replaceUrl(dashboardRouter()).pipe(
                Effect.as(CompletedInternalNavigation()),
                Command.make('RedirectToDashboard'),
              ),
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
            [
              ...mappedCommands,
              clearSession(),
              replaceUrl(homeRouter()).pipe(
                Effect.as(CompletedInternalNavigation()),
                Command.make('RedirectToHome'),
              ),
            ],
          ],
        }),
      ),
  })
}
