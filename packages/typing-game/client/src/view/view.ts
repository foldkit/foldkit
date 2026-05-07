import { Match as M } from 'effect'
import { Document, Html, mapMessage } from 'foldkit/html'

import { GotHomeMessage, GotRoomMessage } from '../message'
import { Model } from '../model'
import { Home, Room } from '../page'
import { NotFoundRoute } from '../route'
import {
  Class,
  Href,
  a,
  div,
  footer,
  h1,
  keyed,
  main,
  p,
  section,
  span,
} from './html'

const routeTitle = (route: Model['route']): string =>
  M.value(route).pipe(
    M.tagsExhaustive({
      Home: () => 'Typing Game',
      Room: ({ roomId }) => `Room ${roomId} — Typing Game`,
      NotFound: () => 'Not Found — Typing Game',
    }),
  )

export const view = (model: Model): Document => {
  const content = M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: () =>
        mapMessage((message: Home.Message.Message) =>
          GotHomeMessage({ message }),
        )(Home.view(model.home)),
      Room: Room.view(model.room, message => GotRoomMessage({ message })),
      NotFound: notFound,
    }),
  )

  const footerElement = footer(
    [Class('mt-auto pt-8')],
    [
      'Made with ',
      span([Class('text-terminal-red')], ['♥']),
      ' with ',
      a(
        [
          Href('https://foldkit.dev/example-apps/typing-terminal'),
          Class('underline'),
        ],
        ['Foldkit'],
      ),
      ' and ',
      a([Href('https://effect.website'), Class('underline')], ['Effect']),
      '.',
    ],
  )

  return {
    title: routeTitle(model.route),
    body: div(
      [Class('min-h-screen flex flex-col p-16')],
      [
        main(
          [Class('flex-1 flex flex-col')],
          [keyed('div')(model.route._tag, [], [content])],
        ),
        footerElement,
      ],
    ),
  }
}

const notFound = ({ path }: NotFoundRoute): Html =>
  section(
    [Class('max-w-4xl')],
    [
      h1([Class('mb-6 uppercase')], ['404 - Not Found']),
      p([Class('mb-6')], [`The path "${path}" was not found.`]),
      div([], ['> Enter to go home']),
    ],
  )
