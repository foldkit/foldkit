import { inMessage, init, story } from 'foldkit/story'
import type { TestBlock } from 'foldkit/story'

import {
  InMessage,
  Message,
  Model,
  subject,
} from './unified-inmessages.accepted.js'

declare const counter: TestBlock<typeof subject>
const model = Model.make({ count: 0 })
const missingInputContext = { ...subject, updateContext: ['local'] }
const requestedSet = InMessage.RequestedSet({ value: 1 })
const completedSave = Message.CompletedSave({ value: 1 })

// @ts-expect-error A contextual InMessage step needs its own dispatch Context.
story(missingInputContext, init(), inMessage(requestedSet))
// @ts-expect-error The acquired input update retains its numeric Context.
counter.inMessageUpdate(model, requestedSet, 'wrong')
// @ts-expect-error Local facts cannot be delivered through the input entry point.
counter.inMessageUpdate(model, completedSave, 2)
// @ts-expect-error InMessages cannot be delivered through the local update entry point.
counter.update(model, requestedSet, 'local')

// @ts-expect-error A curried local update retains its string Context.
counter.update(completedSave)(model, 1)
// @ts-expect-error A curried local update retains the exact Message payload.
counter.update({ _tag: 'CompletedSave', value: 'wrong' })(model, 'local')
