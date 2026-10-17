import { Option } from 'effect'

import { AttachmentsComposition } from './composition'
import { update } from './update'
import { view } from './view'

export const block = AttachmentsComposition.makeBlock({
  init: AttachmentsComposition.makeInit(() => ({
    model: {
      maybeResume: Option.none(),
      additionalFiles: [],
    },
  })),
  update,
  view,
})
