// ❌ Assign an emitting result to a return type that discards its OutMessage.
import type { Update } from 'foldkit'

import { ChildBlock } from './child'

type ChildModel = typeof ChildBlock.Model.Type
type ChildMessage = typeof ChildBlock.Message.Type
type ChildOutMessage = typeof ChildBlock.OutMessage.Type

declare const childUpdate: Update.ReturnWithOutMessage<
  ChildModel,
  ChildMessage,
  ChildOutMessage
>

const plainChildUpdate: Update.Return<ChildModel, ChildMessage> = childUpdate
