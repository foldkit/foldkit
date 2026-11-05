import { Option } from 'effect'

import {
  makeBinding,
  makeCommandsStep,
  makeFieldsStep,
  makeOutMessageFold,
} from '../block'
import { HomeBlock } from '../blocks'
import { LoadPlayground } from '../command'
import { ApplicationRoute } from '../route'

const foldHomeOutMessage = makeOutMessageFold(HomeBlock, {
  SelectedPlaygroundExample: ({ exampleSlug }) =>
    makeCommandsStep(() => [LoadPlayground({ exampleSlug })]),
  UpdatedNewsletterEmail: ({ value }) =>
    makeFieldsStep(() => ({
      newsletterEmail: () => value,
    })),
})

export const MaybeHomeBinding = makeBinding(HomeBlock, {
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
