import { Array, Effect, Option, Schema, Stream } from 'effect'
import { Block, Command, Dom, Url } from 'foldkit'
import type { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'

import * as Shared from '@typing-game/shared'

import { Home, homeCapturesKeyboard } from './page/home'
import { Room, roomCapturesKeyboard } from './page/room/room'
import { ApplicationRoute, roomRouter, urlToApplicationRoute } from './route'

export const Model = Schema.Struct({
  route: ApplicationRoute,
  home: Home,
  maybeRoom: Schema.Option(Room),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  CompletedNavigateToRoom: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url.Url },
  PressedKey: { key: Schema.String },
})
export type Message = typeof Message.Type

export const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
})

export const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
})

export const NavigateToRoom = Command.define('NavigateToRoom', {
  args: { roomId: Schema.String },
  messages: [Message.CompletedNavigateToRoom],
})

export type ApplicationArgs = Readonly<{ url: Url.Url }>

export class Application extends Block<Application, ApplicationArgs>()(
  'Application',
  {
    Model,
    Message,
    Command: [NavigateInternal, LoadExternal, NavigateToRoom],
  },
) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { url }) {
    const home = yield* new Home('home')
    const room = yield* Room.each('room', { isRestoring: true })

    const roomForRoute = (
      route: ApplicationRoute,
      maybeRoom: Option.Option<Room>,
    ): Option.Option<Room> =>
      ApplicationRoute.matchOrElse(
        route,
        {
          Room: ({ roomId }) =>
            Option.orElse(
              Option.filter(maybeRoom, ({ id }) => id === roomId),
              () => Option.some(room(roomId)),
            ),
        },
        () => Option.none(),
      )

    const enterJoinedRoom = (
      model: Model,
      roomId: string,
      player: Shared.Player,
    ) => {
      if (ApplicationRoute.guards.Home(model.route)) {
        const joinedRoom = room(roomId, { isRestoring: false })

        return {
          model: modifyFields(model, {
            maybeRoom: () => Option.some(joinedRoom),
          }),
          commands: [NavigateToRoom({ roomId })],
          messages: [joinedRoom.send(Room.Message.InformedOfJoin({ player }))],
        }
      } else {
        return { model }
      }
    }

    const route = urlToApplicationRoute(url)

    return {
      model: {
        route,
        home,
        maybeRoom: roomForRoute(route, Option.none()),
      },

      update: {
        ClickedLink: (model, { request }) =>
          UrlRequest.match(request, {
            Internal: ({ url }) => ({
              model,
              commands: [NavigateInternal({ url: Url.toString(url) })],
            }),
            External: ({ href }) => ({
              model,
              commands: [LoadExternal({ href })],
            }),
          }),
        ChangedUrl: (model, { url }) => {
          const nextRoute = urlToApplicationRoute(url)

          return {
            model: modifyFields(model, {
              route: () => nextRoute,
              maybeRoom: maybeRoom => roomForRoute(nextRoute, maybeRoom),
            }),
          }
        },
        PressedKey: (model, { key }) => ({
          model,
          messages: deliverPressedKey(model, key),
        }),
        CompletedNavigateInternal: model => ({ model }),
        CompletedLoadExternal: model => ({ model }),
        CompletedNavigateToRoom: model => ({ model }),
        ...home.on({
          CreatedRoom: (model, { roomId, player }) =>
            enterJoinedRoom(model, roomId, player),
          JoinedRoom: (model, { roomId, player }) =>
            enterJoinedRoom(model, roomId, player),
        }),
      },

      commands: {
        NavigateInternal: ({ url }) =>
          pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
        LoadExternal: ({ href }) =>
          load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
        NavigateToRoom: ({ roomId }) =>
          pushUrl(roomRouter({ roomId })).pipe(
            Effect.as(Message.CompletedNavigateToRoom()),
          ),
      },

      subscriptions: {
        keyPresses: {
          dependencies: isCapturingKeyboard,
          stream: (isCapturing: boolean) =>
            isCapturing ? capturedKeyDownStream : Stream.empty,
        },
      },

      view,
    }
  }),
)

const activeRoom = (model: Model): Option.Option<Room> =>
  Option.filter(
    model.maybeRoom,
    room =>
      ApplicationRoute.guards.Room(model.route) &&
      model.route.roomId === room.id,
  )

const isCapturingKeyboard = (model: Model): boolean =>
  ApplicationRoute.matchOrElse(
    model.route,
    {
      Home: () => homeCapturesKeyboard(model.home.model),
      Room: () =>
        Option.exists(activeRoom(model), room =>
          roomCapturesKeyboard(room.model),
        ),
    },
    () => false,
  )

const deliverPressedKey = (model: Model, key: string) =>
  ApplicationRoute.matchOrElse(
    model.route,
    {
      Home: () => [model.home.send(Home.Message.PressedKey({ key }))],
      Room: () =>
        Array.map(Option.toArray(activeRoom(model)), room =>
          room.send(Room.Message.PressedKey({ key })),
        ),
    },
    () => [],
  )

const capturedKeyDownStream: Stream.Stream<Message> =
  Dom.streamFromEventFilterMapPreventDefault({
    target: document,
    type: 'keydown',
    filterMapEvent: ({ key }) => Option.some(Message.PressedKey({ key })),
  })

type ApplicationViewBuilder = HtmlBuilder<Message>
type NotFoundRoute = typeof ApplicationRoute.NotFound.Type

const routeTitle = (route: ApplicationRoute): string =>
  ApplicationRoute.match(route, {
    Home: () => 'Typing Game',
    Room: ({ roomId }) => `Room ${roomId} | Typing Game`,
    NotFound: () => 'Not Found | Typing Game',
  })

const notFound = ({ path }: NotFoundRoute, h: ApplicationViewBuilder): Html =>
  h.section(
    [h.Class('max-w-4xl')],
    [
      h.h1([h.Class('mb-6 uppercase')], ['404 - Not Found']),
      h.p([h.Class('mb-6')], [`The path "${path}" was not found.`]),
      h.div([], ['> Enter to go home']),
    ],
  )

const footer = (h: ApplicationViewBuilder): Html =>
  h.footer(
    [h.Class('mt-auto pt-8')],
    [
      'Made with ',
      h.span([h.Class('text-terminal-red')], ['♥']),
      ' with ',
      h.a(
        [
          h.Href('https://foldkit.dev/example-apps/typing-terminal'),
          h.Class('underline'),
        ],
        ['Foldkit'],
      ),
      ' and ',
      h.a([h.Href('https://effect.website'), h.Class('underline')], ['Effect']),
      '.',
    ],
  )

const view = (model: Model, h: ApplicationViewBuilder): Document => {
  const content = ApplicationRoute.match(model.route, {
    Home: () => model.home.view(),
    Room: () =>
      Option.match(activeRoom(model), {
        onNone: () => h.empty,
        onSome: room => room.view(),
      }),
    NotFound: route => notFound(route, h),
  })

  return {
    title: routeTitle(model.route),
    body: h.div(
      [h.Class('min-h-screen flex flex-col p-16')],
      [h.main([h.Class('flex-1 flex flex-col')], [content]), footer(h)],
    ),
  }
}
