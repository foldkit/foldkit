import { Array } from 'effect'

export type Priority = 'High' | 'Normal'

export type EnvelopedMessage<Message> = Readonly<{
  priority: Priority
  message: Message
}>

/** Reorders a batch of EnvelopedMessages so all `High` envelopes appear
 *  before any `Normal` envelope, preserving FIFO order within each priority
 *  class. The runtime calls this on each `Queue.takeAll` batch so user input
 *  (view dispatch, navigation, subscription events, managed-resource events,
 *  external dispatchers) lands ahead of chain-derived work (Command results)
 *  whenever both share a frame. */
export const orderByPriority = <Message>(
  batch: ReadonlyArray<EnvelopedMessage<Message>>,
): ReadonlyArray<Message> => {
  const highs = Array.filter(batch, envelope => envelope.priority === 'High')
  const normals = Array.filter(
    batch,
    envelope => envelope.priority === 'Normal',
  )
  return Array.map(
    Array.appendAll(highs, normals),
    envelope => envelope.message,
  )
}
