import { Command, Subscription, click, role } from 'foldkit/scene'

click(role('button', { name: 'Save' }))
Command.keepPending(SaveDocument({ documentId }))

click(role('textbox', { name: 'Title' }))
Subscription.emit(
  ApplicationBlock.subscriptions.documentFeed,
  Message.ReceivedDocumentUpdate({ documentId, revision }),
)

Command.resolve(
  SaveDocument({ documentId }),
  Message.SucceededSaveDocument({ documentId, revision }),
)
