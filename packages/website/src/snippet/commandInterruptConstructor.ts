import { Message as UploadMessage, UploadFile } from './commandInterruptKey'
import {
  Message as CounterMessage,
  WaitBeforeReset,
} from './commandInterruptible'

export const CancelWaitBeforeReset = WaitBeforeReset.Interrupt(outcome =>
  CounterMessage.CompletedCancelWaitBeforeReset({ outcome }),
)

export const CancelUploadFile = (uploadId: number) =>
  UploadFile.Interrupt({ uploadId }, outcome =>
    UploadMessage.CompletedCancelUploadFile({ uploadId, outcome }),
  )
