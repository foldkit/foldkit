import { messageWith, steps } from 'foldkit/story'

export const receiveCurrentFrame = steps(
  messageWith((model: Model) =>
    Message.ReceivedFrame({
      sessionId: model.sessionId,
      frame: nextFrame,
    }),
  ),
)
