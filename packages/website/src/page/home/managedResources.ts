import { Option } from 'effect'
import { ManagedResource } from 'foldkit'

import { Message } from './message'
import { type Model } from './model'
import * as NotePlayerDemo from './notePlayerDemo'

// MANAGED RESOURCE

const notePlayerDemoManagedResources = ManagedResource.lift(
  NotePlayerDemo.managedResources,
)<Model, Message>({
  toChildModel: model => Option.some(model.notePlayerDemo),
  toParentMessage: message => Message.GotNotePlayerDemoMessage({ message }),
})

export const managedResources = ManagedResource.aggregate<Model, Message>()(
  notePlayerDemoManagedResources,
)

export type ManagedResourceServices = ManagedResource.ServicesOf<
  typeof managedResources
>
