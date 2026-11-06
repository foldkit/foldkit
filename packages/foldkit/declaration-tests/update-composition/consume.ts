import { Effect } from 'effect'
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import {
  ApplicationBlock,
  Message,
  editedChild,
  layer,
  makeUpdate,
} from './accepted.js'

export const acquiredCalls = Story.withBlock(
  { block: ApplicationBlock, layer },
  block => {
    const applicationInit = block.init()
    const renamed = block.update(
      applicationInit.model,
      Message.UpdatedTitle({ title: 'Relocated' }),
    )
    return block.update(Message.CompletedSaveDraft())(renamed.model).model.title
  },
)
export const relocatedChildDelivery = editedChild

type Expect<Condition extends true> = Condition
export type NoExtraServices = Expect<
  [Effect.Services<typeof acquiredCalls>] extends [never] ? true : false
>

export const rename = makeUpdate.on(['UpdatedTitle'])(
  (model, { title }, { before }) => ({
    model: modifyFields(model, { title: () => `${before.title}:${title}` }),
  }),
)
