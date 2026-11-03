import { Option } from 'effect'

import { ApplicationDefinition } from './application/definition'
import { DetailsBlock } from './details'
import { SearchBlock } from './search'

const foldSearchOutMessage = ApplicationDefinition.makeOutMessageFold(
  SearchBlock,
  {
    SelectedResult: ({ resultId }, { modelBeforeUpdate }) =>
      Option.isSome(modelBeforeUpdate.maybeDetails)
        ? MaybeDetailsBinding.informResultChanged({ resultId })
        : MaybeDetailsBinding.requestOpen({ resultId }),
  },
)

export const SearchBinding = ApplicationDefinition.makeBinding(SearchBlock, {
  field: 'search',
}).withOutMessagePolicy({ fold: foldSearchOutMessage })

export const MaybeDetailsBinding = ApplicationDefinition.makeBinding(
  DetailsBlock,
  {
    field: 'maybeDetails',
  },
)

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [SearchBinding, MaybeDetailsBinding],
})
