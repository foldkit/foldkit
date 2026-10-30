import clsx from 'clsx'
import { Effect } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { Button } from '@foldkit/ui'

const Message = defineMessageUnion({
  ClickedExport: {},
})
type Message = typeof Message.Type

const OutMessage = defineMessageUnion({
  ClickedExport: {},
})

export class Header extends Block<Header>()('Header', {
  Message,
  OutMessage,
}) {}

export const HeaderLive = Header.make(
  Effect.fn(function* () {
    return {
      update: {
        ClickedExport: model => ({
          model,
          outMessage: OutMessage.ClickedExport(),
        }),
      },

      view: (_model, h) => headerView(h),
    }
  }),
)

type HeaderViewBuilder = HtmlBuilder<Message>

const downloadIcon = (className: string, h: HeaderViewBuilder): Html =>
  h.svg(
    [
      h.AriaHidden(true),
      h.Class(className),
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.Fill('none'),
      h.ViewBox('0 0 24 24'),
      h.StrokeWidth('1.5'),
      h.Stroke('currentColor'),
    ],
    [
      h.path([
        h.StrokeLinecap('round'),
        h.StrokeLinejoin('round'),
        h.D(
          'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3',
        ),
      ]),
    ],
  )

const secondaryButtonStyle =
  'px-3 py-1.5 rounded text-sm bg-gray-800 text-gray-200 transition motion-reduce:transition-none'

const headerView = (h: HeaderViewBuilder): Html =>
  h.div(
    [
      h.Class(
        'flex items-center justify-between px-4 py-3 border-b border-gray-800',
      ),
    ],
    [
      h.div(
        [h.Class('flex flex-col')],
        [
          h.h1(
            [h.Class('text-lg font-bold tracking-tight leading-none mb-1')],
            ['PixelForge'],
          ),
          h.div(
            [
              h.Class(
                'flex items-center gap-1 text-xs text-gray-400 leading-none',
              ),
            ],
            [
              h.a(
                [
                  h.Href('https://foldkit.dev'),
                  h.Class('hover:text-gray-200 transition'),
                ],
                ['Built with Foldkit'],
              ),
              h.span([], ['/']),
              h.a(
                [
                  h.Href(
                    'https://github.com/foldkit/foldkit/tree/main/examples/pixel-art',
                  ),
                  h.Class('hover:text-gray-200 transition'),
                ],
                ['Source on GitHub'],
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex items-center gap-4')],
        [
          Button.view(
            {
              onClick: Message.ClickedExport(),
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      clsx(
                        secondaryButtonStyle,
                        'flex items-center gap-2 hover:bg-gray-700 cursor-pointer',
                      ),
                    ),
                  ],
                  [downloadIcon('w-4 h-4', h), h.span([], ['Export PNG'])],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  )
