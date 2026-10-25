import { messageWith, steps } from 'foldkit/story'

export const receiveCurrentFrame = steps(
  messageWith((model: typeof Model.Type) =>
    Message.ReceivedFrame({
      sessionId: model.sessionId,
      frame: nextFrame,
    }),
  ),
)
