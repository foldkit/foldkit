import { Array, Match, Option } from 'effect'
import { Html } from 'foldkit/html'

import { ApplicationComposition, PeoplePageBinding } from './composition'
import type { ApplicationViewBuilder } from './composition'
import {
  type File,
  type FileTreeEntry,
  fileTree,
  findEntry,
  formatFileSize,
} from './fileTree'
import { type Model } from './model'
import { findPerson } from './page/people/model'
import {
  ApplicationRoute,
  filesIndexRouter,
  filesRouter,
  homeRouter,
  nestedRouter,
  peopleRouter,
} from './route'

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

export const view = ApplicationComposition.makeView((model, h) => {
  const routeContent = ApplicationRoute.match(model.route, {
    Home: () => homeView(h),
    Nested: () => nestedView(h),
    People: () =>
      h.block(
        PeoplePageBinding.embedView({
          slotId: 'people',
          model: model.peoplePage,
        }),
      ),
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
})
