import type { Block } from 'foldkit'

import { ApplicationBlock, makeStep } from './definition'
import { Message } from './message'
import {
  EDITION_RADIO_GROUP_ID,
  EditionRadioGroupBlock,
  HARDCOVER_EDITION,
} from './model'
import { stepMachine } from './transition'

export const EditionRadioGroupBinding = ApplicationBlock.makeBinding(
  EditionRadioGroupBlock,
  {
    field: 'editionRadioGroup',
    init: { contextToArgs: () => [{ id: EDITION_RADIO_GROUP_ID }] },
  },
).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(EditionRadioGroupBlock, {
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

export const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [EditionRadioGroupBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
