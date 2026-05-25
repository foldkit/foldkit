import { clsx } from 'clsx'
import { Array, Option } from 'effect'
import { type Html, html } from 'foldkit/html'

import { Icon } from '../icon'
import { type TableOfContentsEntry } from '../main'
import {
  ChangedActiveSection,
  ClickedMobileTableOfContentsLink,
  type Message,
  ToggledMobileTableOfContents,
} from '../message'

const tableOfContentsEntryView = (
  entry: TableOfContentsEntry,
  isActive: boolean,
): Html => {
  const h = html<Message>()

  return h.keyed('li')(
    entry.id,
    [
      h.Class(
        clsx({
          'ml-3': entry.level === 'h3',
          'ml-6': entry.level === 'h4',
        }),
      ),
    ],
    [
      h.a(
        [
          h.Href(`#${entry.id}`),
          h.OnClick(ChangedActiveSection({ sectionId: entry.id })),
          h.Class(
            clsx('transition block', {
              'text-accent-600 dark:text-accent-400 underline': isActive,
              'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white':
                !isActive,
            }),
          ),
          ...(isActive ? [h.AriaCurrent('location')] : []),
        ],
        [entry.text],
      ),
    ],
  )
}

export const tableOfContentsView = (
  entries: ReadonlyArray<TableOfContentsEntry>,
  maybeActiveSectionId: Option.Option<string>,
) => {
  const h = html<Message>()

  return h.aside(
    [
      h.Class(
        'hidden xl:block sticky top-[var(--header-height)] min-w-64 w-fit h-[calc(100vh-var(--header-height))] shrink-0 overflow-y-auto border-l border-gray-300 dark:border-gray-800 p-4',
      ),
    ],
    [
      h.h3(
        [
          h.AriaHidden(true),
          h.Class(
            'text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-2',
          ),
        ],
        ['On This Page'],
      ),
      h.nav(
        [h.AriaLabel('Table of contents')],
        [
          h.ul(
            [h.Class('space-y-2 text-sm')],
            Array.map(entries, entry =>
              tableOfContentsEntryView(
                entry,
                Option.exists(
                  maybeActiveSectionId,
                  activeSectionId => activeSectionId === entry.id,
                ),
              ),
            ),
          ),
        ],
      ),
    ],
  )
}

export const mobileTableOfContentsView = (
  entries: ReadonlyArray<TableOfContentsEntry>,
  maybeActiveSectionId: Option.Option<string>,
  isOpen: boolean,
) => {
  const h = html<Message>()

  const firstEntryText = Array.head(entries).pipe(
    Option.match({
      onNone: () => '',
      onSome: ({ text }) => text,
    }),
  )

  const activeSectionText = Option.match(maybeActiveSectionId, {
    onNone: () => firstEntryText,
    onSome: activeSectionId =>
      Option.match(
        Array.findFirst(entries, ({ id }) => id === activeSectionId),
        {
          onNone: () => firstEntryText,
          onSome: ({ text }) => text,
        },
      ),
  })

  return h.details(
    [
      h.Id('mobile-table-of-contents'),
      h.Open(isOpen),
      h.OnToggle(open => ToggledMobileTableOfContents({ isOpen: open })),
      h.Class(
        'group xl:hidden fixed top-[var(--header-height)] left-0 right-0 md:left-64 z-40 bg-cream dark:bg-gray-900 border-b border-gray-300 dark:border-gray-800',
      ),
    ],
    [
      h.summary(
        [
          h.Class(
            'flex items-center justify-between px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden group-open:border-b group-open:border-gray-300 dark:group-open:border-gray-800',
          ),
        ],
        [
          h.div(
            [h.Class('flex items-center gap-2 min-w-0')],
            [
              h.span(
                [
                  h.Class(
                    'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0',
                  ),
                ],
                ['On this page'],
              ),
              h.span(
                [h.Class('text-sm text-gray-900 dark:text-white truncate')],
                [activeSectionText],
              ),
            ],
          ),
          h.span(
            [
              h.Class(
                'text-gray-500 dark:text-gray-400 shrink-0 ml-2 transition-transform group-open:rotate-180',
              ),
            ],
            [Icon.chevronDown('w-4 h-4')],
          ),
        ],
      ),
      h.nav(
        [
          h.AriaLabel('Table of contents'),
          h.Class('max-h-[50vh] overflow-y-auto'),
        ],
        [
          h.ul(
            [h.Class('text-sm divide-y divide-gray-300 dark:divide-gray-800')],
            Array.map(entries, ({ level, id, text }) => {
              const isActive = Option.match(maybeActiveSectionId, {
                onNone: () => false,
                onSome: activeSectionId => activeSectionId === id,
              })

              return h.keyed('li')(
                id,
                [],
                [
                  h.a(
                    [
                      h.Href(`#${id}`),
                      h.OnClick(
                        ClickedMobileTableOfContentsLink({
                          sectionId: id,
                        }),
                      ),
                      h.Class(
                        clsx(
                          'transition flex items-center justify-between py-3 px-4',
                          {
                            'pl-8': level === 'h3',
                            'pl-12': level === 'h4',
                            'text-accent-600 dark:text-accent-400': isActive,
                            'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white':
                              !isActive,
                          },
                        ),
                      ),
                      ...(isActive ? [h.AriaCurrent('location')] : []),
                    ],
                    [
                      text,
                      isActive
                        ? Icon.check(
                            'w-4 h-4 text-accent-600 dark:text-accent-400',
                          )
                        : h.empty,
                    ],
                  ),
                ],
              )
            }),
          ),
        ],
      ),
    ],
  )
}
