import { Scene, Story } from 'foldkit'

import {
  InMessage,
  MessageComposerBlock,
  OutMessage,
} from './blockInMessageDefinition'
import { layer } from './blockInMessageImplementation'

export const submissionStory = Story.story(
  { block: MessageComposerBlock, layer },
  Story.init('message'),
  Story.inMessage(InMessage.InformedOfDraftChanged({ text: '  Hello  ' })),
  Story.inMessage(InMessage.RequestedSubmit()),
  Story.expectOutMessage(OutMessage.Submitted({ text: 'Hello' })),
)

export const submissionScene = Scene.scene(
  { block: MessageComposerBlock, layer },
  Scene.init('message'),
  Scene.type(Scene.label('Message'), '  Hello  '),
  Scene.inMessage(InMessage.RequestedSubmit()),
  Scene.expectOutMessage(OutMessage.Submitted({ text: 'Hello' })),
)
