import { Option } from 'effect'

import {
  makeOutMessageFold,
  makeOptionalFieldBinding,
  makeRequiredFieldBinding,
  makeComposition,
} from './application/block'
import { DetailsBlock } from './details'
import { SearchBlock } from './search'

const foldSearchOutMessage = makeOutMessageFold(SearchBlock, {
  SelectedResult: ({ resultId }, { modelBeforeUpdate }) =>
    Option.isSome(modelBeforeUpdate.maybeDetails)
      ? MaybeDetailsBinding.informOfResultChanged({ resultId })
      : MaybeDetailsBinding.requestOpen({ resultId }),
})

export const SearchBinding = makeRequiredFieldBinding(SearchBlock, {
  field: 'search',
}).withOutMessagePolicy({ fold: foldSearchOutMessage })

export const MaybeDetailsBinding = makeOptionalFieldBinding(DetailsBlock, {
  field: 'maybeDetails',
})

export const ApplicationComposition = makeComposition({
  bindings: [SearchBinding, MaybeDetailsBinding],
})
