import { Option } from 'effect'

import { AttachmentsComposition } from './composition'

export const init = AttachmentsComposition.makeInit(() => ({
  model: {
    maybeResume: Option.none(),
    additionalFiles: [],
  },
}))
