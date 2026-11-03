import { Effect } from 'effect'

import { ApplicationBlock } from './published/packages/foldkit/declaration-tests/update-composition/block.js'
import { makeUpdate } from './published/packages/foldkit/declaration-tests/update-composition/composition.js'
import { Message } from './published/packages/foldkit/declaration-tests/update-composition/definition.js'
import { withBlock } from './published/packages/foldkit/src/story/public.js'
import { modifyFields } from './published/packages/foldkit/src/struct/index.js'

export const acquiredCalls = withBlock(ApplicationBlock, block => {
  const applicationInit = block.init()
  const nextTitle = block.update(
    applicationInit.model,
    Message.UpdatedTitle({ title: 'Relocated' }),
  )
  const completed = block.update(Message.CompletedSaveDraft())(nextTitle.model)

  return completed.model.title
})

export type AcquiredCallRequirements = Effect.Services<typeof acquiredCalls>

export const rename = makeUpdate.on(['UpdatedTitle'])(
  (model, { title }, { before }) => ({
    model: modifyFields(model, { title: () => `${before.title}:${title}` }),
  }),
)

makeUpdate.on(['UpdatedTitle'])((model, message) => {
  // @ts-expect-error Relocated declarations retain the exact payload.
  const text = message.text

  return { model: modifyFields(model, { title: () => String(text) }) }
})

// @ts-expect-error A completed update still requires a handler record.
makeUpdate((model, _message) => ({ model }))
