import { Console, Effect, Match, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Block, Command } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, load, pushUrl, replaceUrl } from 'foldkit/navigation'
import { taggedStruct } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import {
  SESSION_STORAGE_KEY,
  Session,
  SessionJsonString,
} from './domain/session'
import { LoggedIn } from './page/loggedIn/loggedIn'
import { LoggedOut } from './page/loggedOut/loggedOut'
import {
  ApplicationRoute,
  LoggedInRoute,
  LoggedOutRoute,
  dashboardRouter,
  homeRouter,
  loginRouter,
  urlToApplicationRoute,
} from './route'

export const Flags = Schema.Struct({
  maybeSession: Schema.Option(Session),
})
export type Flags = typeof Flags.Type

export const LoggedOutModel = taggedStruct('LoggedOut', {
  route: LoggedOutRoute,
  loggedOut: LoggedOut,
})
export type LoggedOutModel = typeof LoggedOutModel.Type

export const LoggedInModel = taggedStruct('LoggedIn', {
  route: LoggedInRoute,
  session: Session,
  loggedIn: LoggedIn,
})
export type LoggedInModel = typeof LoggedInModel.Type

export const Model = Schema.Union([LoggedOutModel, LoggedInModel])
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedRedirectToLogin: {},
  CompletedRedirectToDashboard: {},
  CompletedRedirectToHome: {},
  CompletedLoadExternal: {},
  CompletedLogError: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  SucceededSaveSession: {},
  FailedSaveSession: { error: Schema.String },
  SucceededClearSession: {},
  FailedClearSession: { error: Schema.String },
})
export type Message = typeof Message.Type

export const SaveSession = Command.define('SaveSession', {
  args: { session: Session },
  messages: [Message.SucceededSaveSession, Message.FailedSaveSession],
})

const ClearSession = Command.define('ClearSession', {
  messages: [Message.SucceededClearSession, Message.FailedClearSession],
})

const LogError = Command.define('LogError', {
  args: { entries: Schema.Array(Schema.Unknown) },
  messages: [Message.CompletedLogError],
})

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
})

const RedirectToLogin = Command.define('RedirectToLogin', {
  messages: [Message.CompletedRedirectToLogin],
})

export const RedirectToDashboard = Command.define('RedirectToDashboard', {
  messages: [Message.CompletedRedirectToDashboard],
})

const RedirectToHome = Command.define('RedirectToHome', {
  messages: [Message.CompletedRedirectToHome],
})

export class Application extends Block<
  Application,
  Readonly<{ flags: Flags; url: Url }>
>()('Application', {
  Model,
  Message,
  Command: [
    SaveSession,
    ClearSession,
    LogError,
    NavigateInternal,
    LoadExternal,
    RedirectToLogin,
    RedirectToDashboard,
    RedirectToHome,
  ],
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { flags, url }) {
    const store = yield* KeyValueStore.KeyValueStore
    const loggedOut = yield* new LoggedOut('loggedOut')
    const loggedIn = yield* new LoggedIn('loggedIn')

    const route = urlToApplicationRoute(url)

    const initial = Option.match(flags.maybeSession, {
      onNone: () =>
        Match.value(route).pipe(
          Match.tag('Home', 'Login', 'NotFound', loggedOutRoute => ({
            model: LoggedOutModel({ route: loggedOutRoute, loggedOut }),
            start: [],
          })),
          Match.orElse(() => ({
            model: LoggedOutModel({
              route: ApplicationRoute.Login(),
              loggedOut,
            }),
            start: [RedirectToLogin()],
          })),
        ),
      onSome: session =>
        Match.value(route).pipe(
          Match.tag('Dashboard', 'Settings', 'NotFound', loggedInRoute => ({
            model: LoggedInModel({ route: loggedInRoute, session, loggedIn }),
            start: [],
          })),
          Match.orElse(() => ({
            model: LoggedInModel({
              route: ApplicationRoute.Dashboard(),
              session,
              loggedIn,
            }),
            start: [RedirectToDashboard()],
          })),
        ),
    })

    return {
      model: initial.model,
      start: initial.start,

      update: {
        ClickedLink: (model, { request }) =>
          UrlRequest.match(request, {
            Internal: ({ url: internalUrl }) => ({
              model,
              commands: [NavigateInternal({ url: urlToString(internalUrl) })],
            }),
            External: ({ href }) => ({
              model,
              commands: [LoadExternal({ href })],
            }),
          }),

        ChangedUrl: (model, { url: nextUrl }) => {
          const nextRoute = urlToApplicationRoute(nextUrl)

          return Match.value(model).pipe(
            Match.tagsExhaustive({
              LoggedOut: loggedOutModel =>
                Match.value(nextRoute).pipe(
                  Match.tag('Home', 'Login', 'NotFound', loggedOutRoute => ({
                    model: modifyFields(loggedOutModel, {
                      route: () => loggedOutRoute,
                    }),
                  })),
                  Match.orElse(() => ({
                    model,
                    commands: [RedirectToLogin()],
                  })),
                ),
              LoggedIn: loggedInModel =>
                Match.value(nextRoute).pipe(
                  Match.tag(
                    'Dashboard',
                    'Settings',
                    'NotFound',
                    loggedInRoute => ({
                      model: modifyFields(loggedInModel, {
                        route: () => loggedInRoute,
                      }),
                    }),
                  ),
                  Match.orElse(() => ({
                    model,
                    commands: [RedirectToDashboard()],
                  })),
                ),
            }),
          )
        },

        FailedSaveSession: (model, { error }) => ({
          model,
          commands: [LogError({ entries: ['Failed to save session:', error] })],
        }),
        FailedClearSession: (model, { error }) => ({
          model,
          commands: [
            LogError({ entries: ['Failed to clear session:', error] }),
          ],
        }),
        CompletedNavigateInternal: model => ({ model }),
        CompletedRedirectToLogin: model => ({ model }),
        CompletedRedirectToDashboard: model => ({ model }),
        CompletedRedirectToHome: model => ({ model }),
        CompletedLoadExternal: model => ({ model }),
        CompletedLogError: model => ({ model }),
        SucceededSaveSession: model => ({ model }),
        SucceededClearSession: model => ({ model }),

        ...loggedOut.on<Model>({
          SucceededLogin: (_model, { session }) => ({
            model: LoggedInModel({
              route: ApplicationRoute.Dashboard(),
              session,
              loggedIn,
            }),
            commands: [SaveSession({ session }), RedirectToDashboard()],
          }),
        }),

        ...loggedIn.on<Model>({
          RequestedLogout: () => ({
            model: LoggedOutModel({
              route: ApplicationRoute.Home(),
              loggedOut,
            }),
            commands: [ClearSession(), RedirectToHome()],
          }),
        }),
      },

      commands: {
        SaveSession: ({ session }) =>
          Effect.gen(function* () {
            const encodedSession =
              yield* Schema.encodeEffect(SessionJsonString)(session)
            yield* store.set(SESSION_STORAGE_KEY, encodedSession)
            return Message.SucceededSaveSession()
          }).pipe(
            Effect.catch(error =>
              Effect.succeed(
                Message.FailedSaveSession({ error: String(error) }),
              ),
            ),
          ),

        ClearSession: () =>
          store.remove(SESSION_STORAGE_KEY).pipe(
            Effect.as(Message.SucceededClearSession()),
            Effect.catch(error =>
              Effect.succeed(
                Message.FailedClearSession({ error: String(error) }),
              ),
            ),
          ),

        LogError: ({ entries }) =>
          Console.error(...entries).pipe(
            Effect.as(Message.CompletedLogError()),
          ),

        NavigateInternal: ({ url: internalUrl }) =>
          pushUrl(internalUrl).pipe(
            Effect.as(Message.CompletedNavigateInternal()),
          ),

        LoadExternal: ({ href }) =>
          load(href).pipe(Effect.as(Message.CompletedLoadExternal())),

        RedirectToLogin: () =>
          replaceUrl(loginRouter()).pipe(
            Effect.as(Message.CompletedRedirectToLogin()),
          ),

        RedirectToDashboard: () =>
          replaceUrl(dashboardRouter()).pipe(
            Effect.as(Message.CompletedRedirectToDashboard()),
          ),

        RedirectToHome: () =>
          replaceUrl(homeRouter()).pipe(
            Effect.as(Message.CompletedRedirectToHome()),
          ),
      },

      view,
    }
  }),
)

const title = (model: Model): string =>
  Match.value(model.route).pipe(
    Match.tag('Home', () => 'Auth'),
    Match.orElse(({ _tag }) => `${_tag} | Auth`),
  )

const view = (model: Model, h: HtmlBuilder<Message>) => ({
  title: title(model),
  body: h.div(
    [h.Class('min-h-screen bg-gray-100')],
    [
      Match.value(model).pipe(
        Match.tagsExhaustive({
          LoggedOut: ({ route, loggedOut }) => loggedOut.view({ route }),
          LoggedIn: ({ route, session, loggedIn }) =>
            loggedIn.view({ route, session }),
        }),
      ),
    ],
  ),
})
