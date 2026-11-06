import { Story } from 'foldkit'

export const receiveCurrentFrame = Story.steps(
  Story.messageWith((model: Model) =>
    Message.ReceivedFrame({
      sessionId: model.sessionId,
      frame: nextFrame,
    }),
  ),
)
