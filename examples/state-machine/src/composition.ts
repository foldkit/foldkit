import type { Block } from 'foldkit'

import {
  makeComposition,
  makeOutMessageFold,
  makeRequiredFieldBinding,
  makeStep,
} from './block'
import { Message } from './message'
import {
  EDITION_RADIO_GROUP_ID,
  EditionRadioGroupBlock,
  HARDCOVER_EDITION,
} from './model'
import { stepMachine } from './transition'

export const EditionRadioGroupBinding = makeRequiredFieldBinding(
  EditionRadioGroupBlock,
  {
    field: 'editionRadioGroup',
    init: { contextToArgs: () => [{ id: EDITION_RADIO_GROUP_ID }] },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(EditionRadioGroupBlock, {
    Selected: ({ value }) =>
      makeStep(
        stepMachine(
          Message.SelectedEdition({
            isShippingRequired: value === HARDCOVER_EDITION,
          }),
        ),
      ),
  }),
})

export const ApplicationComposition = makeComposition({
  bindings: [EditionRadioGroupBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
