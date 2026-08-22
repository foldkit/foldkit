import { Array, Effect, Match as M, Option, Schema as S } from 'effect'
import { Command, Runtime, Update } from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import {
  File,
  FileTreeEntry,
  fileTree,
  findEntry,
  formatFileSize,
} from './fileTree'
import { People } from './page'
import {
  AppRoute,
  PeopleRoute,
  filesIndexRouter,
  filesRouter,
  homeRouter,
  nestedRouter,
  peopleRouter,
  urlToAppRoute,
} from './route'

export {
  AppRoute,
  FilesIndexRoute,
  FilesRoute,
  HomeRoute,
  NestedRoute,
  NotFoundRoute,
  PeopleRoute,
  PersonRoute,
} from './route'

// MODEL

export const Model = S.Struct({
  route: AppRoute,
  peoplePage: People.Model,
})

export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  GotPeopleMessage: { message: People.Message },
})

export type Message = typeof Message.Type

// INIT

export const init: Runtime.RoutingApplicationInit<Model, Message> = (
  url: Url,
) => {
  const route = urlToAppRoute(url)

  const initialPeopleRoute = M.value(route).pipe(
    M.tag('People', peopleRoute => peopleRoute),
    M.orElse(() => PeopleRoute({ searchText: Option.none() })),
  )

  const peopleInitResult = People.init(initialPeopleRoute)
  const commands = Command.mapMessages(
    peopleInitResult.commands ?? [],
    childMessage => Message.GotPeopleMessage({ message: childMessage }),
  )

  return Array.match(commands, {
    onEmpty: () => ({ model: { route, peoplePage: peopleInitResult.model } }),
    onNonEmpty: commands => ({
      model: { route, peoplePage: peopleInitResult.model },
      commands,
    }),
  })
}

// COMMAND

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: S.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: S.String },
  messages: [Message.CompletedLoadExternal],
  execute: ({ href }) =>
    load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const foldPeopleEntry = <Input>(
  update: (peoplePage: People.Model, input: Input) => People.UpdateReturn,
): Update.Fold<Model, Message, Input> =>
  Update.foldChild({
    update,
    read: model => Option.some(model.peoplePage),
    write: (model, nextPeoplePage) =>
      evo(model, { peoplePage: () => nextPeoplePage }),
    toParentMessage: message => Message.GotPeopleMessage({ message }),
  })

const foldPeople = foldPeopleEntry(People.update)

const foldPeopleRouteChanged = foldPeopleEntry(People.informRouteChanged)

const setRoute =
  (nextRoute: AppRoute): Update.Step<Model, Message> =>
  model => ({ model: evo(model, { route: () => nextRoute }) })

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),

    ClickedLink: ({ request }) =>
      M.value(request).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
          Internal: ({ url }) => ({
            model,
            commands: [NavigateInternal({ url: urlToString(url) })],
          }),
          External: ({ href }) => ({
            model,
            commands: [LoadExternal({ href })],
          }),
        }),
      ),

    ChangedUrl: ({ url }) => {
      const nextRoute = urlToAppRoute(url)

      const routeSteps = M.value(nextRoute).pipe(
        M.withReturnType<ReadonlyArray<Update.Step<Model, Message>>>(),
        M.tag('People', peopleRoute => [foldPeopleRouteChanged(peopleRoute)]),
        M.orElse(() => []),
      )

      return Update.combine(model, [setRoute(nextRoute), ...routeSteps])
    },

    GotPeopleMessage: ({ message }) => foldPeople(model, message),
  })

// VIEW

const navigationView = (
  currentRoute: AppRoute,
  h: HtmlBuilder<Message>,
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

const homeView = (h: HtmlBuilder<Message>): Html =>
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

const nestedView = (h: HtmlBuilder<Message>): Html =>
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

const personView = (personId: number, h: HtmlBuilder<Message>): Html => {
  const person = People.findPerson(personId)

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
  h: HtmlBuilder<Message>,
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
          M.value(entry).pipe(
            M.tagsExhaustive({
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
  h: HtmlBuilder<Message>,
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

const fileDetailView = (file: File, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('bg-gray-50 border border-gray-200 rounded-lg p-6')],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-800 mb-2')], [file.name]),
      h.p([h.Class('text-gray-600')], [formatFileSize(file.sizeInBytes)]),
    ],
  )

const missingEntryView = (
  path: Array.NonEmptyReadonlyArray<string>,
  h: HtmlBuilder<Message>,
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

const filesIndexView = (h: HtmlBuilder<Message>): Html =>
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
  h: HtmlBuilder<Message>,
): Html => {
  const maybeEntry = findEntry(path)

  const content = Option.match(maybeEntry, {
    onNone: () => missingEntryView(path, h),
    onSome: entry =>
      M.value(entry).pipe(
        M.tagsExhaustive({
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

const notFoundView = (path: string, h: HtmlBuilder<Message>): Html =>
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
  M.value(route).pipe(
    M.tag('Home', () => 'Routing'),
    M.tag('Person', ({ personId }) => `Person ${personId} | Routing`),
    M.tag('FilesIndex', () => 'Files | Routing'),
    M.tag(
      'Files',
      ({ path }) => `${Array.lastNonEmpty(path)} | Files | Routing`,
    ),
    M.orElse(({ _tag }) => `${_tag} | Routing`),
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const routeContent = M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: () => homeView(h),
      Nested: () => nestedView(h),
      People: () =>
        h.submodel({
          slotId: 'people',
          model: model.peoplePage,
          view: People.view,
          toParentMessage: message => Message.GotPeopleMessage({ message }),
        }),
      Person: ({ personId }) => personView(personId, h),
      FilesIndex: () => filesIndexView(h),
      Files: ({ path }) => filesView(path, h),
      NotFound: ({ path }) => notFoundView(path, h),
    }),
  )

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
