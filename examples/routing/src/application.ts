import { Array, Effect, Match, Option, Schema, pipe } from 'effect'
import { Block, Command, Dom } from 'foldkit'
import type { Send } from 'foldkit/block'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { Transition } from 'foldkit/route'
import { taggedStruct } from 'foldkit/schema'
import { Url, toString as urlToString } from 'foldkit/url'

import { findPerson } from './domain/person'
import { People } from './page/people/people'
import {
  ApplicationRoute,
  filesIndexRouter,
  filesRouter,
  homeRouter,
  nestedRouter,
  peopleRouter,
  urlToApplicationRoute,
} from './route'

export const Model = Schema.Struct({
  route: ApplicationRoute,
  peoplePage: People,
})
export type Model = typeof Model.Type

const NavigationShortcut = Schema.Literals(['GH', 'GP', 'GF', 'GN'])
type NavigationShortcut = typeof NavigationShortcut.Type

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  EnteredNavigationShortcut: { shortcut: NavigationShortcut },
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

export class Application extends Block<Application, Readonly<{ url: Url }>>()(
  'Application',
  {
    Model,
    Message,
    Command: [NavigateInternal, LoadExternal],
  },
) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { url }) {
    const route = urlToApplicationRoute(url)

    const initialPeopleRoute = Match.value(route).pipe(
      Match.tag('People', peopleRoute => peopleRoute),
      Match.orElse(() =>
        ApplicationRoute.People({ searchText: Option.none() }),
      ),
    )

    const peoplePage = yield* new People('peoplePage', {
      route: initialPeopleRoute,
    })

    return {
      model: { route, peoplePage },

      stream: navigationShortcutPresses,

      update: {
        CompletedNavigateInternal: model => ({ model }),
        CompletedLoadExternal: model => ({ model }),

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

          const transition = Transition.make(model.route, nextRoute)
          const peopleMessages = Transition.matchOrElse<ReadonlyArray<Send>>()(
            transition,
            'People',
            {
              Entered: peopleRoute => [
                model.peoplePage.send(
                  People.Message.InformedOfRouteChange({ route: peopleRoute }),
                ),
              ],
              Stayed: ({ nextRoute: nextPeopleRoute }) => [
                model.peoplePage.send(
                  People.Message.InformedOfRouteChange({
                    route: nextPeopleRoute,
                  }),
                ),
              ],
            },
            () => [],
          )

          return {
            model: { ...model, route: nextRoute },
            messages: peopleMessages,
          }
        },

        EnteredNavigationShortcut: (model, { shortcut }) => ({
          model,
          commands: [
            NavigateInternal({ url: navigationUrlByShortcut[shortcut]() }),
          ],
        }),
      },

      commands: {
        NavigateInternal: ({ url: internalUrl }) =>
          pushUrl(internalUrl).pipe(
            Effect.as(Message.CompletedNavigateInternal()),
          ),
        LoadExternal: ({ href }) =>
          load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
      },

      view,
    }
  }),
)

const navigationUrlByShortcut: Readonly<
  Record<NavigationShortcut, () => string>
> = {
  GH: homeRouter,
  GP: () => peopleRouter({ searchText: Option.none() }),
  GF: filesIndexRouter,
  GN: nestedRouter,
}

const navigationShortcutPresses = Dom.streamFromKeyBindings({
  bindings: [
    {
      keys: ['G', 'H'],
      mapEvent: () => Message.EnteredNavigationShortcut({ shortcut: 'GH' }),
    },
    {
      keys: ['G', 'P'],
      mapEvent: () => Message.EnteredNavigationShortcut({ shortcut: 'GP' }),
    },
    {
      keys: ['G', 'F'],
      mapEvent: () => Message.EnteredNavigationShortcut({ shortcut: 'GF' }),
    },
    {
      keys: ['G', 'N'],
      mapEvent: () => Message.EnteredNavigationShortcut({ shortcut: 'GN' }),
    },
  ],
})

// FILE TREE

type Directory = Readonly<{
  _tag: 'Directory'
  name: string
  entries: ReadonlyArray<FileTreeEntry>
}>
type FileTreeEntry = File | Directory

const File = taggedStruct('File', {
  name: Schema.String,
  sizeInBytes: Schema.Number,
})
type File = typeof File.Type

const Directory = taggedStruct('Directory', {
  name: Schema.String,
  entries: Schema.Array(
    Schema.suspend((): Schema.Codec<FileTreeEntry> => FileTreeEntry),
  ),
})

const FileTreeEntry = Schema.Union([File, Directory])

const fileTree: ReadonlyArray<FileTreeEntry> = [
  Directory({
    name: 'documents',
    entries: [
      File({ name: 'resume.pdf', sizeInBytes: 48_230 }),
      Directory({
        name: 'taxes',
        entries: [
          File({ name: '2024.pdf', sizeInBytes: 182_400 }),
          File({ name: '2025.pdf', sizeInBytes: 196_812 }),
        ],
      }),
    ],
  }),
  Directory({
    name: 'photos',
    entries: [
      Directory({
        name: 'vacation',
        entries: [
          File({ name: 'beach.jpg', sizeInBytes: 2_348_100 }),
          File({ name: 'sunset.jpg', sizeInBytes: 1_982_450 }),
        ],
      }),
    ],
  }),
  File({ name: 'notes.txt', sizeInBytes: 1_204 }),
]

const findDirectoryEntries = (
  entries: ReadonlyArray<FileTreeEntry>,
  name: string,
): Option.Option<ReadonlyArray<FileTreeEntry>> =>
  pipe(
    Array.findFirst(entries, entry => entry.name === name),
    Option.flatMap(entry =>
      Match.value(entry).pipe(
        Match.tagsExhaustive({
          File: () => Option.none(),
          Directory: directory => Option.some(directory.entries),
        }),
      ),
    ),
  )

const findEntry = (
  path: Array.NonEmptyReadonlyArray<string>,
): Option.Option<FileTreeEntry> => {
  const [parentSegments, entryName] = Array.unappend(path)

  return pipe(
    parentSegments,
    Array.reduce(Option.some(fileTree), (maybeEntries, segment) =>
      Option.flatMap(maybeEntries, entries =>
        findDirectoryEntries(entries, segment),
      ),
    ),
    Option.flatMap(entries =>
      Array.findFirst(entries, entry => entry.name === entryName),
    ),
  )
}

const BYTES_PER_KILOBYTE = 1024
const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE * 1024

const formatFileSize = (sizeInBytes: number): string => {
  if (sizeInBytes >= BYTES_PER_MEGABYTE) {
    return `${(sizeInBytes / BYTES_PER_MEGABYTE).toFixed(1)} MB`
  } else if (sizeInBytes >= BYTES_PER_KILOBYTE) {
    return `${(sizeInBytes / BYTES_PER_KILOBYTE).toFixed(1)} KB`
  } else {
    return `${sizeInBytes} B`
  }
}

// VIEW

type ApplicationViewBuilder = HtmlBuilder<Message>

const navigationView = (
  currentRoute: ApplicationRoute,
  h: ApplicationViewBuilder,
): Html => {
  const navLinkClassName = (isActive: boolean) =>
    `hover:bg-blue-600 font-medium px-3 py-1 rounded transition ${isActive ? 'bg-blue-700 bg-opacity-50' : ''}`

  return h.nav(
    [h.Class('bg-blue-500 text-white p-4 mb-6')],
    [
      h.ul(
        [h.Class('max-w-4xl mx-auto flex gap-6 list-none')],
        [
          h.li(
            [],
            [
              h.a(
                [
                  h.Href(homeRouter()),
                  h.Class(navLinkClassName(currentRoute._tag === 'Home')),
                ],
                ['Home'],
              ),
            ],
          ),
          h.li(
            [],
            [
              h.a(
                [
                  h.Href(peopleRouter({ searchText: Option.none() })),
                  h.Class(
                    navLinkClassName(
                      currentRoute._tag === 'People' ||
                        currentRoute._tag === 'Person',
                    ),
                  ),
                ],
                ['People'],
              ),
            ],
          ),
          h.li(
            [],
            [
              h.a(
                [
                  h.Href(filesIndexRouter()),
                  h.Class(
                    navLinkClassName(
                      currentRoute._tag === 'FilesIndex' ||
                        currentRoute._tag === 'Files',
                    ),
                  ),
                ],
                ['Files'],
              ),
            ],
          ),
          h.li(
            [],
            [
              h.a(
                [
                  h.Href(nestedRouter()),
                  h.Class(navLinkClassName(currentRoute._tag === 'Nested')),
                ],
                ['Nested'],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const homeView = (h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('max-w-4xl mx-auto px-4')],
    [
      h.h1(
        [h.Class('text-4xl font-bold text-gray-800 mb-6')],
        ['Welcome Home'],
      ),
      h.p(
        [h.Class('text-lg text-gray-600 mb-4')],
        [
          'This is a routing example built with foldkit. Navigate using the links above to see different routes in action.',
        ],
      ),
      h.p([h.Class('text-gray-600')]),
    ],
  )

const nestedView = (h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('max-w-4xl mx-auto px-4')],
    [
      h.h1(
        [h.Class('text-4xl font-bold text-gray-800 mb-6')],
        ['Very Nested Route!'],
      ),
      h.p(
        [h.Class('text-lg text-gray-600')],
        ['You found the deeply nested route at /nested/route/is/very/nested'],
      ),
    ],
  )

const personView = (personId: number, h: ApplicationViewBuilder): Html => {
  const person = findPerson(personId)

  return Option.match(person, {
    onNone: () =>
      h.div(
        [h.Class('max-w-4xl mx-auto px-4')],
        [
          h.h2(
            [h.Class('text-4xl font-bold text-red-600 mb-6')],
            ['Person Not Found'],
          ),
          h.p(
            [h.Class('text-lg text-gray-600 mb-4')],
            [`No person found with ID: ${personId}`],
          ),
          h.a(
            [
              h.Href(peopleRouter({ searchText: Option.none() })),
              h.Class('text-blue-500 hover:underline'),
            ],
            ['← Back to People'],
          ),
        ],
      ),

    onSome: person =>
      h.div(
        [h.Class('max-w-4xl mx-auto px-4')],
        [
          h.a(
            [
              h.Href(peopleRouter({ searchText: Option.none() })),
              h.Class('text-blue-500 hover:underline mb-4 inline-block'),
            ],
            ['← Back to People'],
          ),

          h.article(
            [],
            [
              h.h2(
                [h.Class('text-4xl font-bold text-gray-800 mb-6')],
                [person.name],
              ),

              h.div(
                [h.Class('bg-gray-50 border border-gray-200 rounded-lg p-6')],
                [
                  h.div(
                    [h.Class('grid grid-cols-2 gap-4')],
                    [
                      h.div(
                        [],
                        [
                          h.h2(
                            [
                              h.Class(
                                'text-sm font-medium text-gray-500 uppercase tracking-wide',
                              ),
                            ],
                            ['ID'],
                          ),
                          h.p(
                            [h.Class('text-lg text-gray-900 mt-1')],
                            [String(person.id)],
                          ),
                        ],
                      ),
                      h.div(
                        [],
                        [
                          h.h2(
                            [
                              h.Class(
                                'text-sm font-medium text-gray-500 uppercase tracking-wide',
                              ),
                            ],
                            ['Role'],
                          ),
                          h.p(
                            [h.Class('text-lg text-gray-900 mt-1')],
                            [person.role],
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
  })
}

const entryCountLabel = (count: number): string =>
  count === 1 ? '1 item' : `${count} items`

const entryListView = (
  parentPath: ReadonlyArray<string>,
  entries: ReadonlyArray<FileTreeEntry>,
  h: ApplicationViewBuilder,
): Html =>
  h.ul(
    [h.Class('divide-y divide-gray-200 border border-gray-200 rounded-lg')],
    Array.map(entries, entry =>
      h.keyed('li')(
        entry.name,
        [h.Class('flex items-center justify-between px-4 py-3')],
        [
          h.a(
            [
              h.Href(
                filesRouter({ path: Array.append(parentPath, entry.name) }),
              ),
              h.Class('text-blue-500 hover:underline'),
            ],
            [entry.name],
          ),
          Match.value(entry).pipe(
            Match.tagsExhaustive({
              File: file =>
                h.span(
                  [h.Class('text-sm text-gray-500')],
                  [formatFileSize(file.sizeInBytes)],
                ),
              Directory: directory =>
                h.span(
                  [h.Class('text-sm text-gray-500')],
                  [entryCountLabel(directory.entries.length)],
                ),
            }),
          ),
        ],
      ),
    ),
  )

const breadcrumbView = (
  path: Array.NonEmptyReadonlyArray<string>,
  h: ApplicationViewBuilder,
): Html => {
  const lastSegmentIndex = path.length - 1

  return h.nav(
    [
      h.AriaLabel('Breadcrumb'),
      h.Class('flex flex-wrap items-center gap-2 mb-6 text-sm'),
    ],
    [
      h.a(
        [h.Href(filesIndexRouter()), h.Class('text-blue-500 hover:underline')],
        ['Files'],
      ),
      ...Array.map(path, (segment, index) => {
        const crumbPath = Array.append(Array.take(path, index), segment)
        const isCurrentSegment = index === lastSegmentIndex

        return h.keyed('span')(
          Array.join(crumbPath, '/'),
          [h.Class('flex items-center gap-2')],
          [
            h.span([h.Class('text-gray-400')], ['/']),
            isCurrentSegment
              ? h.span([h.Class('font-medium text-gray-800')], [segment])
              : h.a(
                  [
                    h.Href(filesRouter({ path: crumbPath })),
                    h.Class('text-blue-500 hover:underline'),
                  ],
                  [segment],
                ),
          ],
        )
      }),
    ],
  )
}

const fileDetailView = (file: File, h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('bg-gray-50 border border-gray-200 rounded-lg p-6')],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-800 mb-2')], [file.name]),
      h.p([h.Class('text-gray-600')], [formatFileSize(file.sizeInBytes)]),
    ],
  )

const missingEntryView = (
  path: Array.NonEmptyReadonlyArray<string>,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [],
    [
      h.h2([h.Class('text-4xl font-bold text-red-600 mb-6')], ['Nothing Here']),
      h.p(
        [h.Class('text-lg text-gray-600 mb-4')],
        [`No file or directory at "${Array.join(path, '/')}".`],
      ),
      h.a(
        [h.Href(filesIndexRouter()), h.Class('text-blue-500 hover:underline')],
        ['← Back to Files'],
      ),
    ],
  )

const filesIndexView = (h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('max-w-4xl mx-auto px-4')],
    [
      h.h1([h.Class('text-4xl font-bold text-gray-800 mb-6')], ['Files']),
      h.p(
        [h.Class('text-lg text-gray-600 mb-6')],
        [
          'Every path under /files parses into a single route that captures the remaining segments with rest.',
        ],
      ),
      entryListView([], fileTree, h),
    ],
  )

const filesView = (
  path: Array.NonEmptyReadonlyArray<string>,
  h: ApplicationViewBuilder,
): Html => {
  const maybeEntry = findEntry(path)

  const content = Option.match(maybeEntry, {
    onNone: () => missingEntryView(path, h),
    onSome: entry =>
      Match.value(entry).pipe(
        Match.tagsExhaustive({
          File: file => fileDetailView(file, h),
          Directory: directory => entryListView(path, directory.entries, h),
        }),
      ),
  })

  return h.div(
    [h.Class('max-w-4xl mx-auto px-4')],
    [breadcrumbView(path, h), content],
  )
}

const notFoundView = (path: string, h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('max-w-4xl mx-auto px-4')],
    [
      h.h1(
        [h.Class('text-4xl font-bold text-red-600 mb-6')],
        ['404 - Page Not Found'],
      ),
      h.p(
        [h.Class('text-lg text-gray-600 mb-4')],
        [`The path "${path}" was not found.`],
      ),
      h.a(
        [h.Href(homeRouter()), h.Class('text-blue-500 hover:underline')],
        ['← Go Home'],
      ),
    ],
  )

const routeTitle = (route: Model['route']): string =>
  Match.value(route).pipe(
    Match.tag('Home', () => 'Routing'),
    Match.tag('Person', ({ personId }) => `Person ${personId} | Routing`),
    Match.tag('FilesIndex', () => 'Files | Routing'),
    Match.tag(
      'Files',
      ({ path }) => `${Array.lastNonEmpty(path)} | Files | Routing`,
    ),
    Match.orElse(({ _tag }) => `${_tag} | Routing`),
  )

const view = (model: Model, h: ApplicationViewBuilder) => {
  const routeContent = ApplicationRoute.match(model.route, {
    Home: () => homeView(h),
    Nested: () => nestedView(h),
    People: () => model.peoplePage.view(),
    Person: ({ personId }) => personView(personId, h),
    FilesIndex: () => filesIndexView(h),
    Files: ({ path }) => filesView(path, h),
    NotFound: ({ path }) => notFoundView(path, h),
  })

  return {
    title: routeTitle(model.route),
    body: h.div(
      [h.Class('min-h-screen bg-gray-100')],
      [
        h.header([], [navigationView(model.route, h)]),
        h.main([h.Class('py-8')], [routeContent]),
      ],
    ),
  }
}
