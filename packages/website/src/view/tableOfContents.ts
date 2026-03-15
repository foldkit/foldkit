import { clsx } from 'clsx'
import { Array, Option } from 'effect'
import { Html, createKeyedLazy } from 'foldkit/html'

import {
  AriaCurrent,
  AriaHidden,
  AriaLabel,
  Class,
  Href,
  Id,
  OnClick,
  OnToggle,
  Open,
  a,
  aside,
  details,
  div,
  empty,
  h3,
  keyed,
  nav,
  span,
  summary,
  ul,
} from '../html'
import { Icon } from '../icon'
import { type TableOfContentsEntry } from '../main'
import {
  ChangedActiveSection,
  ClickedMobileTableOfContentsLink,
  ToggledMobileTableOfContents,
} from '../message'

const tableOfContentsEntryView = (
  level: TableOfContentsEntry['level'],
  id: string,
  text: string,
  isActive: boolean,
): Html =>
  keyed('li')(
    id,
    [
      Class(
        clsx({
          'ml-3': level === 'h3',
          'ml-6': level === 'h4',
        }),
      ),
    ],
    [
      a(
        [
          Href(`#${id}`),
          OnClick(ChangedActiveSection({ sectionId: id })),
          Class(
            clsx('transition block', {
              'text-accent-600 dark:text-accent-400 underline': isActive,
              'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white':
                !isActive,
            }),
          ),
          ...(isActive ? [AriaCurrent('location')] : []),
        ],
        [text],
      ),
    ],
  )

const lazyTableOfContentsEntry = createKeyedLazy()

export const tableOfContentsView = (
  entries: ReadonlyArray<TableOfContentsEntry>,
  maybeActiveSectionId: Option.Option<string>,
) =>
  aside(
    [
      Class(
        'hidden xl:block sticky top-[var(--header-height)] min-w-64 w-fit h-[calc(100vh-var(--header-height))] shrink-0 overflow-y-auto border-l border-gray-300 dark:border-gray-800 p-4',
      ),
    ],
    [
      h3(
        [
          AriaHidden(true),
          Class(
            'text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-2',
          ),
        ],
        ['On This Page'],
      ),
      nav(
        [AriaLabel('Table of contents')],
        [
          ul(
            [Class('space-y-2 text-sm')],
            Array.map(entries, ({ level, id, text }) => {
              const isActive = Option.exists(
                maybeActiveSectionId,
                activeSectionId => activeSectionId === id,
              )

              return lazyTableOfContentsEntry(id, tableOfContentsEntryView, [
                level,
                id,
                text,
                isActive,
              ])
            }),
          ),
        ],
      ),
    ],
  )

export const mobileTableOfContentsView = (
  entries: ReadonlyArray<TableOfContentsEntry>,
  maybeActiveSectionId: Option.Option<string>,
  isOpen: boolean,
) => {
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

  return details(
    [
      Id('mobile-table-of-contents'),
      Open(isOpen),
      OnToggle(open => ToggledMobileTableOfContents({ isOpen: open })),
      Class(
        'group xl:hidden fixed top-[var(--header-height)] left-0 right-0 md:left-64 z-40 bg-cream dark:bg-gray-900 border-b border-gray-300 dark:border-gray-800',
      ),
    ],
    [
      summary(
        [
          Class(
            'flex items-center justify-between px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden group-open:border-b group-open:border-gray-300 dark:group-open:border-gray-800',
          ),
        ],
        [
          div(
            [Class('flex items-center gap-2 min-w-0')],
            [
              span(
                [
                  Class(
                    'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0',
                  ),
                ],
                ['On this page'],
              ),
              span(
                [Class('text-sm text-gray-900 dark:text-white truncate')],
                [activeSectionText],
              ),
            ],
          ),
          span(
            [
              Class(
                'text-gray-500 dark:text-gray-400 shrink-0 ml-2 transition-transform group-open:rotate-180',
              ),
            ],
            [Icon.chevronDown('w-4 h-4')],
          ),
        ],
      ),
      nav(
        [AriaLabel('Table of contents'), Class('max-h-[50vh] overflow-y-auto')],
        [
          ul(
            [Class('text-sm divide-y divide-gray-300 dark:divide-gray-800')],
            Array.map(entries, ({ level, id, text }) => {
              const isActive = Option.match(maybeActiveSectionId, {
                onNone: () => false,
                onSome: activeSectionId => activeSectionId === id,
              })

              return keyed('li')(
                id,
                [],
                [
                  a(
                    [
                      Href(`#${id}`),
                      OnClick(
                        ClickedMobileTableOfContentsLink({
                          sectionId: id,
                        }),
                      ),
                      Class(
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
                      ...(isActive ? [AriaCurrent('location')] : []),
                    ],
                    [
                      text,
                      isActive
                        ? Icon.check(
                            'w-4 h-4 text-accent-600 dark:text-accent-400',
                          )
                        : empty,
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
