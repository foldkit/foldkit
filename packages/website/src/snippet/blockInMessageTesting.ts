import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'

import { InMessage, OutMessage } from './blockInMessageDefinition'
import { MessageComposerImplementation } from './blockInMessageImplementation'

export const submissionStory = Story.story(
  MessageComposerImplementation,
  Story.init('message'),
  Story.inMessage(InMessage.InformedOfDraftChanged({ text: '  Hello  ' })),
  Story.inMessage(InMessage.RequestedSubmit()),
  Story.expectOutMessage(OutMessage.Submitted({ text: 'Hello' })),
)

export const submissionScene = Scene.scene(
  MessageComposerImplementation,
  Scene.init('message'),
  Scene.type(Scene.label('Message'), '  Hello  '),
  Scene.inMessage(InMessage.RequestedSubmit()),
  Scene.expectOutMessage(OutMessage.Submitted({ text: 'Hello' })),
)
