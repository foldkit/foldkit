import { Array, Match as M, Option } from 'effect'
import { evo } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import {
  ClearSession,
  Command,
  LiftLoggedOut,
  LoadExternal,
  LogError,
  NavigateInternal,
  RedirectToDashboard,
  RedirectToHome,
  RedirectToLogin,
  SaveSession,
} from './command'
import { Message } from './message'
import { LoggedIn, LoggedOut, Model } from './model'
import { DashboardRoute, HomeRoute, urlToAppRoute } from './route'

type UpdateReturn = readonly [Model, ReadonlyArray<Command>]
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

  const liftedCommands = Array.map(commands, command =>
    LiftLoggedOut({ command }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [nextModel, liftedCommands],
    onSome: outMessage =>
      M.value(outMessage).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
          SucceededLogin: ({ session }) => [
            LoggedIn.init(DashboardRoute(), session),
            [
              ...liftedCommands,
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

  return Option.match(maybeOutMessage, {
    onNone: () => [nextModel, commands],
    onSome: outMessage =>
      M.value(outMessage).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
          RequestedLogout: () => [
            LoggedOut.init(HomeRoute()),
            [...commands, ClearSession(), RedirectToHome()],
          ],
        }),
      ),
  })
}
