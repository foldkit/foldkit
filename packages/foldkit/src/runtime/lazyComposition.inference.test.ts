import { Context, Effect, Layer, Option, Schema, Stream } from 'effect'
import { describe, it } from 'vitest'

import { type Document, type Html, type HtmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Subscription from '../subscription/subscription.js'
import {
  CompositionIdentity,
  type LazyCompositionConfig,
} from './lazyComposition.js'
import { makeApplication } from './makeApplication.js'
import { makeElement } from './makeElement.js'

class UndeclaredService extends Context.Service<UndeclaredService, string>()(
  'LazyUndeclaredService',
) {}
const Model = Schema.Struct({ accepted: Schema.Option(CompositionIdentity) })
type Model = typeof Model.Type
const Message = defineMessageUnion({ CompletedLoad: {}, FailedLoad: {} })
type Message = typeof Message.Type
const initialModel = Model.make({ accepted: Option.none() })
const update = (model: Model) => ({ model })
const view = (_model: Model, h: HtmlBuilder<Message>) => h.div([], ['Home'])
const documentView = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Home',
  body: view(model, h),
})
const lifecycle = {
  buildId: 'Build',
  keys: ['A'],
  requested: (_model: Model) => Option.none<CompositionIdentity>(),
  accepted: (model: Model) => model.accepted,
  isLifecycleMessage: Schema.is(
    Schema.Union([Message.CompletedLoad, Message.FailedLoad]),
  ),
  onLoaded: (_identity: CompositionIdentity) => Message.CompletedLoad(),
  onFailed: (_identity: CompositionIdentity, _reason: string) =>
    Message.FailedLoad(),
}
const loaderService: LazyCompositionConfig<
  Model,
  Message,
  UndeclaredService,
  never,
  Html
> = {
  ...lifecycle,
  load: () => UndeclaredService.pipe(Effect.as({ update, view })),
}
const commandService: LazyCompositionConfig<
  Model,
  Message,
  never,
  UndeclaredService,
  Html
> = {
  ...lifecycle,
  load: () =>
    Effect.succeed({
      view,
      update: (model: Model) => ({
        model,
        commands: [
          {
            name: 'ReadUndeclared',
            effect: UndeclaredService.pipe(Effect.as(Message.CompletedLoad())),
          },
        ],
      }),
    }),
}
const subscriptionService: LazyCompositionConfig<
  Model,
  Message,
  never,
  UndeclaredService,
  Html
> = {
  ...lifecycle,
  load: () =>
    Effect.succeed({
      update,
      view,
      subscriptions: Subscription.make<Model, Message, UndeclaredService>()(
        () => ({
          service: Subscription.persistent(
            Stream.fromEffect(
              UndeclaredService.pipe(Effect.as(Message.CompletedLoad())),
            ),
          ),
        }),
      ),
    }),
}
const applicationLoaderService: LazyCompositionConfig<
  Model,
  Message,
  UndeclaredService,
  never
> = {
  ...lifecycle,
  load: () => UndeclaredService.pipe(Effect.as({ update, view: documentView })),
}
const applicationCommandService: LazyCompositionConfig<
  Model,
  Message,
  never,
  UndeclaredService
> = {
  ...lifecycle,
  load: () =>
    commandService
      .load('A')
      .pipe(
        Effect.map(composition => ({ ...composition, view: documentView })),
      ),
}
const applicationSubscriptionService: LazyCompositionConfig<
  Model,
  Message,
  never,
  UndeclaredService
> = {
  ...lifecycle,
  load: () =>
    subscriptionService
      .load('A')
      .pipe(
        Effect.map(composition => ({ ...composition, view: documentView })),
      ),
}

describe('lazy composition service inference', () => {
  it('requires the root configuration to declare loader and implementation services', () => {
    if (false) {
      const elementBase = {
        Model,
        init: () => ({ model: initialModel }),
        update,
        view,
        container: document.createElement('div'),
      }
      const applicationBase = { ...elementBase, view: documentView }
      makeElement({
        ...elementBase,
        // @ts-expect-error loader services must be declared by the root resources Layer
        lazyComposition: loaderService,
      })
      makeElement({
        ...elementBase,
        // @ts-expect-error loaded Commands cannot invent undeclared root services
        lazyComposition: commandService,
      })
      makeElement({
        ...elementBase,
        // @ts-expect-error loaded Subscriptions cannot invent undeclared root services
        lazyComposition: subscriptionService,
      })
      makeApplication({
        ...applicationBase,
        // @ts-expect-error loader services must be declared by the root resources Layer
        lazyComposition: applicationLoaderService,
      })
      makeApplication({
        ...applicationBase,
        // @ts-expect-error loaded Commands cannot invent undeclared root services
        lazyComposition: applicationCommandService,
      })
      makeApplication({
        ...applicationBase,
        // @ts-expect-error loaded Subscriptions cannot invent undeclared root services
        lazyComposition: applicationSubscriptionService,
      })
      makeElement<Model, Message, UndeclaredService>({
        ...elementBase,
        resources: Layer.succeed(UndeclaredService, 'declared'),
        lazyComposition: loaderService,
      })
      makeElement<Model, Message, UndeclaredService>({
        ...elementBase,
        resources: Layer.succeed(UndeclaredService, 'declared'),
        lazyComposition: commandService,
      })
      makeElement<Model, Message, UndeclaredService>({
        ...elementBase,
        resources: Layer.succeed(UndeclaredService, 'declared'),
        lazyComposition: subscriptionService,
      })
      makeApplication<Model, Message, UndeclaredService>({
        ...applicationBase,
        resources: Layer.succeed(UndeclaredService, 'declared'),
        lazyComposition: applicationLoaderService,
      })
      makeApplication<Model, Message, UndeclaredService>({
        ...applicationBase,
        resources: Layer.succeed(UndeclaredService, 'declared'),
        lazyComposition: applicationCommandService,
      })
      makeApplication<Model, Message, UndeclaredService>({
        ...applicationBase,
        resources: Layer.succeed(UndeclaredService, 'declared'),
        lazyComposition: applicationSubscriptionService,
      })
    }
  })
})
