import { Command } from 'foldkit'

import { SaveDocument } from './commandHostContract'

export type SaveDocumentHandler = Command.HandlerOf<typeof SaveDocument>
