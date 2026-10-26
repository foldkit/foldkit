import { Option } from 'effect'

import { LoadPlayground } from '../command'
import { ApplicationDefinition } from '../definition'
import { HomeBlock } from '../page'
import { ApplicationRoute } from '../route'

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
