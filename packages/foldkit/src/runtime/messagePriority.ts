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
 *  whenever both share a frame.
 *
 *  Single-pass partition: walks the batch once and pushes each unwrapped
 *  message into either `highs` or `normals`, then concatenates. Avoids the
 *  four allocations of the previous filter/filter/appendAll/map chain. */
export const orderByPriority = <Message>(
  batch: ReadonlyArray<EnvelopedMessage<Message>>,
): ReadonlyArray<Message> => {
  const highs: Array<Message> = []
  const normals: Array<Message> = []
  for (const envelope of batch) {
    if (envelope.priority === 'High') {
      highs.push(envelope.message)
    } else {
      normals.push(envelope.message)
    }
  }
  if (Array.isReadonlyArrayEmpty(normals)) {
    return highs
  }
  if (Array.isReadonlyArrayEmpty(highs)) {
    return normals
  }
  for (const message of normals) {
    highs.push(message)
  }
  return highs
}
