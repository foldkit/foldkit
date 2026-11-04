import { Option } from 'effect'

import { HomeBlock } from '../blocks'
import { LoadPlayground } from '../command'
import {
  ApplicationBlock,
  makeCommandsStep,
  makeFieldsStep,
} from '../definition'
import { ApplicationRoute } from '../route'

const foldHomeOutMessage = ApplicationBlock.makeOutMessageFold(HomeBlock, {
  SelectedPlaygroundExample: ({ exampleSlug }) =>
    makeCommandsStep(() => [LoadPlayground({ exampleSlug })]),
  UpdatedNewsletterEmail: ({ value }) =>
    makeFieldsStep(() => ({
      newsletterEmail: () => value,
    })),
})

export const MaybeHomeBinding = ApplicationBlock.makeBinding(HomeBlock, {
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
