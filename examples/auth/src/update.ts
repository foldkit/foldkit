import { Array, Effect, Match as M, Option } from 'effect'
import { Command } from 'foldkit'
import { load, pushUrl, replaceUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import { clearSession, logError, saveSession } from './command'
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
  CompletedNavigateInternal,
)
const LoadExternal = Command.define('LoadExternal', CompletedLoadExternal)
const RedirectToLogin = Command.define(
  'RedirectToLogin',
  CompletedNavigateInternal,
)
const RedirectToDashboard = Command.define(
  'RedirectToDashboard',
  CompletedNavigateInternal,
)
const RedirectToHome = Command.define(
  'RedirectToHome',
  CompletedNavigateInternal,
)

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
              [
                NavigateInternal(
                  pushUrl(urlToString(url)).pipe(
                    Effect.as(CompletedNavigateInternal()),
                  ),
                ),
              ],
            ],
            External: ({ href }) => [
              model,
              [
                LoadExternal(
                  load(href).pipe(Effect.as(CompletedLoadExternal())),
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
                    RedirectToLogin(
                      replaceUrl(loginRouter()).pipe(
                        Effect.as(CompletedNavigateInternal()),
                      ),
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
                    RedirectToDashboard(
                      replaceUrl(dashboardRouter()).pipe(
                        Effect.as(CompletedNavigateInternal()),
                      ),
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

      FailedSaveSession: ({ error }) => [
        model,
        [logError('Failed to save session:', error)],
      ],

      FailedClearSession: ({ error }) => [
        model,
        [logError('Failed to clear session:', error)],
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
              saveSession(session),
              RedirectToDashboard(
                replaceUrl(dashboardRouter()).pipe(
                  Effect.as(CompletedNavigateInternal()),
                ),
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
              RedirectToHome(
                replaceUrl(homeRouter()).pipe(
                  Effect.as(CompletedNavigateInternal()),
                ),
              ),
            ],
          ],
        }),
      ),
  })
}
