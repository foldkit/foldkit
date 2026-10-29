import { ApplicationComposition } from './composition'
import type { Model } from './model'

export const initialModel: Model = { uploadId: 0, uploads: [] }

export const init = ApplicationComposition.makeInit(() => ({
  model: initialModel,
}))
