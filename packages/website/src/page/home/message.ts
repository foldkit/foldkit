import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Menu, Tabs } from '@foldkit/ui'

import { ExampleSlug } from '../example/meta'
import * as AsyncCounterDemo from './asyncCounterDemo'
import * as NotePlayerDemo from './notePlayerDemo'

// MESSAGE

export const Message = defineMessageUnion({
  GotDemoTabsMessage: { message: Tabs.Message },
  GotPlaygroundMenuMessage: { message: Menu.Message },
  GotAsyncCounterDemoMessage: { message: AsyncCounterDemo.Message },
  GotNotePlayerDemoMessage: { message: NotePlayerDemo.Message },
  UpdatedNewsletterEmail: { value: Schema.String },
})
export type Message = typeof Message.Type

// OUT MESSAGE

export const OutMessage = defineMessageUnion({
  SelectedPlaygroundExample: { exampleSlug: ExampleSlug },
  UpdatedNewsletterEmail: { value: Schema.String },
})
export type OutMessage = typeof OutMessage.Type
