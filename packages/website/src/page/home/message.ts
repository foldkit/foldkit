import { defineMessageUnion } from 'foldkit/message'

import { ExampleSlug } from '../example/meta'
import * as AsyncCounterDemo from './asyncCounterDemo'
import { DemoTabs } from './demoTab'
import * as NotePlayerDemo from './notePlayerDemo'
import { PlaygroundMenu } from './playgroundMenu'

export const Message = defineMessageUnion({
  GotDemoTabsMessage: { message: DemoTabs.Message },
  GotPlaygroundMenuMessage: { message: PlaygroundMenu.Message },
  GotAsyncCounterDemoMessage: { message: AsyncCounterDemo.Message },
  GotNotePlayerDemoMessage: { message: NotePlayerDemo.Message },
})
export type Message = typeof Message.Type

// OUT MESSAGE

export const OutMessage = defineMessageUnion({
  SelectedPlaygroundExample: { exampleSlug: ExampleSlug },
})
export type OutMessage = typeof OutMessage.Type
