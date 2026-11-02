import { slotDocPage } from '../../../markdown'
import raw from './content.md'

export const BlockPageContent = slotDocPage<'message-routing-under-hood'>(
  raw,
  'core/block',
)
