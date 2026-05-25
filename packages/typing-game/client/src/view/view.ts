import { Match as M } from 'effect'
import { Document, Html, html } from 'foldkit/html'

import { GotHomeMessage, GotRoomMessage, Message } from '../message'
import { Model } from '../model'
import { Home, Room } from '../page'
import { NotFoundRoute } from '../route'

const routeTitle = (route: Model['route']): string =>
  M.value(route).pipe(
    M.tagsExhaustive({
      Home: () => 'Typing Game',
      Room: ({ roomId }) => `Room ${roomId} — Typing Game`,
      NotFound: () => 'Not Found — Typing Game',
    }),
  )

export const view = (model: Model): Document => {
  const h = html<Message>()

  const content = M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: () =>
        h.submodel({
          slotId: 'home',
          model: model.home,
          view: Home.view,
          toParentMessage: message => GotHomeMessage({ message }),
        }),
      Room: ({ roomId }) =>
        h.submodel({
          slotId: 'room',
          model: model.room,
          view: Room.view,
          viewInputs: { roomId },
          toParentMessage: message => GotRoomMessage({ message }),
        }),
      NotFound: notFound,
    }),
  )

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
      [
        h.main(
          [h.Class('flex-1 flex flex-col')],
          [h.keyed('div')(model.route._tag, [], [content])],
        ),
        footerElement,
      ],
    ),
  }
}

const notFound = ({ path }: NotFoundRoute): Html => {
  const h = html<Message>()

  return h.section(
    [h.Class('max-w-4xl')],
    [
      h.h1([h.Class('mb-6 uppercase')], ['404 - Not Found']),
      h.p([h.Class('mb-6')], [`The path "${path}" was not found.`]),
      h.div([], ['> Enter to go home']),
    ],
  )
}
