import { Option } from 'effect'
import { Html } from 'foldkit/html'

import {
  ApplicationComposition,
  type ApplicationViewBuilder,
  HomeBinding,
  RoomBinding,
} from '../composition'
import { Model } from '../model'
import { ApplicationRoute } from '../route'
import type { NotFoundRoute } from '../route'

const routeTitle = (route: Model['route']): string =>
  ApplicationRoute.match(route, {
    Home: () => 'Typing Game',
    Room: ({ roomId }) => `Room ${roomId} | Typing Game`,
    NotFound: () => 'Not Found | Typing Game',
  })

export const view = ApplicationComposition.makeView((model, h) => {
  const content = ApplicationRoute.match(model.route, {
    Home: () =>
      h.block(
        HomeBinding.embedView({
          slotId: 'home',
          model: model.home,
        }),
      ),
    Room: ({ roomId }) =>
      Option.match(model.maybeRoomInstance, {
        onNone: () => h.empty,
        onSome: roomInstance =>
          roomInstance.roomId === roomId
            ? h.block(
                RoomBinding.embedView({
                  key: roomId,
                  slotId: 'room',
                  model: roomInstance.model,
                  viewInputs: { roomId },
                }),
              )
            : h.empty,
      }),
    NotFound: route => notFound(route, h),
  })

  const footerElement = h.footer(
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

  return {
    title: routeTitle(model.route),
    body: h.div(
      [h.Class('min-h-screen flex flex-col p-16')],
      [h.main([h.Class('flex-1 flex flex-col')], [content]), footerElement],
    ),
  }
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
