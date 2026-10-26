import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { type Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { Url, toString as urlToString } from 'foldkit/url'

import {
  ApplicationRoute,
  aboutRouter,
  homeRouter,
  urlToApplicationRoute,
} from './route'

export const Model = Schema.Struct({
  route: ApplicationRoute,
  count: Schema.Number,
})

export const Message = defineMessageUnion({
  ClickedIncrement: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
})

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

const { makeFieldsStep, makeNoopStep } = ApplicationDefinition

export const ApplicationComposition = ApplicationDefinition.makeComposition()
type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>

export const init = ApplicationComposition.makeInit((url: Url) => ({
  model: { route: urlToApplicationRoute(url), count: 0 },
}))

const NavigateInternal = ApplicationDefinition.makeCommand('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
  handler: function* () {
    return ({ url }) =>
      pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal()))
  },
})

const LoadExternal = ApplicationDefinition.makeCommand('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  handler: function* () {
    return ({ href }) =>
      load(href).pipe(Effect.as(Message.CompletedLoadExternal()))
  },
})

export const EffectsLayer = Layer.mergeAll(
  NavigateInternal.layer,
  LoadExternal.layer,
)

export const update = ApplicationComposition.makeUpdate({
  ClickedIncrement: makeFieldsStep(() => ({
    count: count => count + 1,
  })),
  ClickedLink: (model, { request }) =>
    UrlRequest.match(request, {
      Internal: ({ url }) => ({
        model,
        commands: [NavigateInternal({ url: urlToString(url) })],
      }),
      External: ({ href }) => ({
        model,
        commands: [LoadExternal({ href })],
      }),
    }),
  ChangedUrl: makeFieldsStep.fromMessage(({ url }) => ({
    route: () => urlToApplicationRoute(url),
  })),
  CompletedNavigateInternal: makeNoopStep(),
  CompletedLoadExternal: makeNoopStep(),
})

const routeTitle = (route: typeof ApplicationRoute.Type): string =>
  ApplicationRoute.match(route, {
    Home: () => 'Home | Static Generation | Foldkit',
    About: () => 'About | Static Generation | Foldkit',
    NotFound: () => 'Not Found | Static Generation | Foldkit',
  })

const navigationView = (h: ApplicationViewBuilder): Html =>
  h.nav(
    [h.Class('flex gap-4')],
    [
      h.a([h.Href(homeRouter()), h.Class('underline')], ['Home']),
      h.a([h.Href(aboutRouter()), h.Class('underline')], ['About']),
    ],
  )

const pageView = (model: typeof Model.Type, h: ApplicationViewBuilder): Html =>
  ApplicationRoute.match(model.route, {
    Home: () =>
      h.section(
        [h.Class('grid gap-4')],
        [
          h.h1(
            [h.Id('page-title'), h.Class('text-4xl font-bold')],
            ['Statically generated home'],
          ),
          h.p(
            [],
            ['This route was rendered during the build and hydrated in place.'],
          ),
          h.button(
            [
              h.OnClick(Message.ClickedIncrement()),
              h.Class('w-fit bg-black px-4 py-2 text-white'),
            ],
            [`Count: ${model.count}`],
          ),
        ],
      ),
    About: () =>
      h.section(
        [h.Class('grid gap-4')],
        [
          h.h1(
            [h.Id('page-title'), h.Class('text-4xl font-bold')],
            ['Statically generated about page'],
          ),
          h.p(
            [],
            [
              'The same renderPage function produced this route in the same build.',
            ],
          ),
        ],
      ),
    NotFound: ({ path }) =>
      h.section(
        [h.Class('grid gap-4')],
        [
          h.h1(
            [h.Id('page-title'), h.Class('text-4xl font-bold')],
            ['Not found'],
          ),
          h.p([], [`No statically generated page exists for ${path}.`]),
        ],
      ),
  })

export const view = ApplicationComposition.makeView((model, h) => ({
  title: routeTitle(model.route),
  body: h.main(
    [h.Class('mx-auto grid min-h-screen max-w-3xl content-center gap-10 p-8')],
    [navigationView(h), pageView(model, h)],
  ),
}))

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
    EffectsLayer,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
