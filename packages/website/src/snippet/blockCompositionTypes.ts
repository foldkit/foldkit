import { Option } from 'effect'
import { Block, Runtime } from 'foldkit'

import { ApplicationComposition } from './composition'
import { Model } from './model'

type ApplicationCompositionMessage = typeof ApplicationComposition.Message.Type

type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>

export const statusView = (model: Model, h: ApplicationViewBuilder) =>
  h.output([], [model.status])

export const reportCrash = ({
  error,
  message,
}: Runtime.CrashContext<Model, ApplicationCompositionMessage>) => {
  reportError(error, {
    message: Option.getOrUndefined(message),
  })
}
