import { clsx } from 'clsx'
import { Console, Effect, Match, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Block, Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, load, pushUrl, replaceUrl } from 'foldkit/navigation'
import { taggedStruct } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import { Button } from '@foldkit/ui'

import { notFoundView } from './domain/notFoundView'
import {
  SESSION_STORAGE_KEY,
  Session,
  SessionJsonString,
} from './domain/session'
import { LoggedOut } from './page/loggedOut/loggedOut'
import {
  ApplicationRoute,
  LoggedInRoute,
  LoggedOutRoute,
  dashboardRouter,
  homeRouter,
  loginRouter,
  settingsRouter,
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
  ClickedLogout: {},
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
            model: LoggedInModel({ route: loggedInRoute, session }),
            start: [],
          })),
          Match.orElse(() => ({
            model: LoggedInModel({
              route: ApplicationRoute.Dashboard(),
              session,
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

        ClickedLogout: () => ({
          model: LoggedOutModel({
            route: ApplicationRoute.Home(),
            loggedOut,
          }),
          commands: [ClearSession(), RedirectToHome()],
        }),

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
            }),
            commands: [SaveSession({ session }), RedirectToDashboard()],
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

type ApplicationViewBuilder = HtmlBuilder<Message>

const view = (model: Model, h: ApplicationViewBuilder) => ({
  title: title(model),
  body: h.div(
    [h.Class('min-h-screen bg-gray-100')],
    [
      Match.value(model).pipe(
        Match.tagsExhaustive({
          LoggedOut: ({ route, loggedOut }) => loggedOut.view({ route }),
          LoggedIn: ({ route, session }) => loggedInView(route, session, h),
        }),
      ),
    ],
  ),
})

const loggedInView = (
  route: LoggedInRoute,
  session: Session,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [h.Class('min-h-screen')],
    [
      navigationView(session, route._tag, h),
      h.main(
        [h.Class('py-8')],
        [
          Match.value(route).pipe(
            Match.tagsExhaustive({
              Dashboard: () => dashboardView(session, h),
              Settings: () => settingsView(session, h),
              NotFound: ({ path }) =>
                notFoundView(path, dashboardRouter(), 'Go to Dashboard', h),
            }),
          ),
        ],
      ),
    ],
  )

const navLinkClassName = (isActive: boolean) =>
  clsx('hover:bg-blue-600 font-medium px-3 py-1 rounded transition', {
    'bg-blue-700 bg-opacity-50': isActive,
  })

const navigationView = (
  session: Session,
  currentRouteTag: string,
  h: ApplicationViewBuilder,
): Html =>
  h.nav(
    [h.Class('bg-blue-500 text-white p-4')],
    [
      h.div(
        [h.Class('max-w-4xl mx-auto flex justify-between items-center')],
        [
          h.ul(
            [h.Class('flex gap-6 list-none')],
            [
              h.li(
                [],
                [
                  h.a(
                    [
                      h.Href(dashboardRouter()),
                      h.Class(
                        navLinkClassName(currentRouteTag === 'Dashboard'),
                      ),
                    ],
                    ['Dashboard'],
                  ),
                ],
              ),
              h.li(
                [],
                [
                  h.a(
                    [
                      h.Href(settingsRouter()),
                      h.Class(navLinkClassName(currentRouteTag === 'Settings')),
                    ],
                    ['Settings'],
                  ),
                ],
              ),
            ],
          ),
          h.div([h.Class('text-sm')], [`Signed in as ${session.email}`]),
        ],
      ),
    ],
  )

const statCard = (
  title: string,
  value: string,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [h.Class('bg-white rounded-lg shadow-md p-6')],
    [
      h.h2(
        [h.Class('text-sm font-medium text-gray-500 uppercase mb-1')],
        [title],
      ),
      h.p([h.Class('text-3xl font-bold text-gray-800')], [value]),
    ],
  )

const dashboardView = (session: Session, h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('max-w-4xl mx-auto px-4')],
    [
      h.h1(
        [h.Class('text-4xl font-bold text-gray-800 mb-6')],
        [`Welcome back, ${session.name}!`],
      ),
      h.p([h.Class('text-lg text-gray-600 mb-8')], ['Here is your dashboard.']),
      h.div(
        [h.Class('grid grid-cols-1 md:grid-cols-3 gap-6')],
        [
          statCard('Total Sessions', '42', h),
          statCard('Active Projects', '7', h),
          statCard('Tasks Completed', '128', h),
        ],
      ),
    ],
  )

const infoRow = (
  label: string,
  value: string,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [
      h.Class(
        'flex justify-between items-center py-2 border-b border-gray-100',
      ),
    ],
    [
      h.p([h.Class('text-gray-600')], [label]),
      h.p([h.Class('font-medium text-gray-800')], [value]),
    ],
  )

const settingsView = (session: Session, h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('max-w-4xl mx-auto px-4')],
    [
      h.h1([h.Class('text-4xl font-bold text-gray-800 mb-6')], ['Settings']),
      h.div(
        [h.Class('bg-white rounded-lg shadow-md p-6 mb-6')],
        [
          h.h2(
            [h.Class('text-xl font-semibold text-gray-800 mb-4')],
            ['Account Information'],
          ),
          h.div(
            [h.Class('space-y-4')],
            [
              infoRow('User ID', session.userId, h),
              infoRow('Email', session.email, h),
              infoRow('Name', session.name, h),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('bg-white rounded-lg shadow-md p-6')],
        [
          h.h2(
            [h.Class('text-xl font-semibold text-gray-800 mb-4')],
            ['Actions'],
          ),
          Button.view(
            {
              onClick: Message.ClickedLogout(),
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      'px-6 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition cursor-pointer',
                    ),
                  ],
                  ['Sign Out'],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  )
