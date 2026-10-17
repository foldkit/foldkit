import { Option } from 'effect'

import { FileDrop } from '@foldkit/ui'

import { type Model } from './definition'

export const init = (): Model => ({
  resumeDrop: FileDrop.init({ id: 'attachments-resume' }),
  maybeResume: Option.none(),
  additionalFilesDrop: FileDrop.init({ id: 'attachments-additional' }),
  additionalFiles: [],
})
