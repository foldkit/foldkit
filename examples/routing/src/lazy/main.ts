import { Option, Schema } from 'effect'
import { Runtime, Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { modifyFields } from 'foldkit/struct'

import { Message, Model } from './contracts'
import { shell } from './shell'

export { Message, Model } from './contracts'

export const init = () => ({
  model: {
    requested: Option.none<Runtime.CompositionIdentity>(),
    accepted: Option.none<Runtime.CompositionIdentity>(),
    requestCount: 0,
    count: 0,
    failure: Option.none<string>(),
  },
})

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedReports: () => {
      const requestCount = model.requestCount + 1
      return {
        model: modifyFields(model, {
          requestCount: () => requestCount,
          requested: () =>
            Option.some(
              Runtime.CompositionIdentity.make({
                buildId: 'RoutingLazyExample',
                key: 'Reports',
                requestId: String(requestCount),
              }),
            ),
          failure: () => Option.none(),
        }),
      }
    },
    ClickedHome: () => ({
      model: modifyFields(model, {
        requested: () => Option.none(),
        accepted: () => Option.none(),
      }),
    }),
    CompletedLoadComposition: ({ identity }) => {
      if (
        Option.isSome(model.requested) &&
        Schema.toEquivalence(Runtime.CompositionIdentity)(
          model.requested.value,
          identity,
        )
      ) {
        return {
          model: modifyFields(model, {
            accepted: () => Option.some(identity),
            requested: () => Option.none(),
          }),
        }
      }
      return { model }
    },
    FailedLoadComposition: ({ identity, reason }) => {
      if (
        Option.isSome(model.requested) &&
        Schema.toEquivalence(Runtime.CompositionIdentity)(
          model.requested.value,
          identity,
        )
      ) {
        return {
          model: modifyFields(model, {
            requested: () => Option.none(),
            failure: () => Option.some(reason),
          }),
        }
      }
      return { model }
    },
    ClickedIncrement: () => ({
      model: modifyFields(model, { count: count => count + 1 }),
    }),
  })

export const view = (model: Model, h: HtmlBuilder<Message>) => ({
  title: 'Lazy routing | Foldkit',
  body: shell(h, [
    h.h1([], ['Home']),
    h.button(
      [h.OnClick(Message.ClickedReports())],
      [Option.isSome(model.requested) ? 'Loading reports' : 'Open reports'],
    ),
    ...Option.match(model.failure, {
      onNone: () => [],
      onSome: reason => [h.p([], [reason])],
    }),
  ]),
})
