import { Document, Html, HtmlBuilder } from 'foldkit/html'

import { Message } from '../message'
import { Model } from '../model'
import { Home, Room } from '../page'
import { AppRoute } from '../route'

const routeTitle = (route: Model['route']): string =>
  AppRoute.match(route, {
    Home: () => 'Typing Game',
    Room: ({ roomId }) => `Room ${roomId} | Typing Game`,
    NotFound: () => 'Not Found | Typing Game',
  })

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const content = AppRoute.match(model.route, {
    Home: () =>
      h.submodel({
        slotId: 'home',
        model: model.home,
        view: Home.view,
        toParentMessage: message => Message.GotHomeMessage({ message }),
      }),
    Room: ({ roomId }) =>
      h.submodel({
        slotId: 'room',
        model: model.room,
        view: Room.view,
        viewInputs: { roomId },
        toParentMessage: message => Message.GotRoomMessage({ message }),
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
}

const notFound = (
  { path }: typeof AppRoute.NotFound.Type,
  h: HtmlBuilder<Message>,
): Html =>
  h.section(
    [h.Class('max-w-4xl')],
    [
      h.h1([h.Class('mb-6 uppercase')], ['404 - Not Found']),
      h.p([h.Class('mb-6')], [`The path "${path}" was not found.`]),
      h.div([], ['> Enter to go home']),
    ],
  )
