import { Message as OwnerMessage } from '../block'
import * as Owner from '../block'

export const toReadResult = () => OwnerMessage.CompletedRead()
export const toNamespacedReadResult = () => Owner.Message.CompletedRead()
