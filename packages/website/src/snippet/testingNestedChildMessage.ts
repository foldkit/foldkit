import { Story } from 'foldkit'

import { FileDrop } from '@foldkit/ui'

import { ResumeDropBinding } from './blocks/attachments/composition'
import { AttachmentsBinding } from './composition'

const resume = new globalThis.File(['pdf-bytes'], 'resume.pdf', {
  type: 'application/pdf',
})

export const droppedResume = Story.messageIn(
  [AttachmentsBinding, ResumeDropBinding],
  FileDrop.FileDropBlock.Message.DroppedFiles({ files: [resume] }),
)
