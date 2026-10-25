import { Effect, Option } from 'effect'
import { load } from 'foldkit/navigation'

import { ApplicationDefinition } from '../definition'
import { Message } from '../message'
import { HomeBlock } from '../page'
import { ExampleSlug } from '../page/example/meta'
import { ApplicationRoute, playgroundRouter } from '../route'

export const LoadPlayground = ApplicationDefinition.makeCommand(
  'LoadPlayground',
  {
    args: { exampleSlug: ExampleSlug },
    messages: [Message.CompletedLoadPlayground],
    handler: function* () {
      return ({ exampleSlug }) =>
        load(playgroundRouter({ exampleSlug })).pipe(
          Effect.as(Message.CompletedLoadPlayground()),
        )
    },
  },
)

const foldHomeOutMessage = ApplicationDefinition.makeOutMessageFold(HomeBlock, {
  SelectedPlaygroundExample: ({ exampleSlug }) =>
    ApplicationDefinition.makeCommandsStep(() => [
      LoadPlayground({ exampleSlug }),
    ]),
  UpdatedNewsletterEmail: ({ value }) =>
    ApplicationDefinition.makeFieldsStep(() => ({
      newsletterEmail: () => value,
    })),
})

export const HomeBinding = ApplicationDefinition.makeBinding(HomeBlock, {
  field: 'maybeHome',
  init: {
    contextToArgs: ({ route }) =>
      Option.liftPredicate(route, ApplicationRoute.guards.Home).pipe(
        Option.as([]),
      ),
  },
}).withOutMessagePolicy({
  fold: foldHomeOutMessage,
})
