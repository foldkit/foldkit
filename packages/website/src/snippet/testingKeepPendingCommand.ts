import { Scene } from 'foldkit'

Scene.click(Scene.role('button', { name: 'Save' }))
Scene.Command.keepPending(SaveDocument({ documentId }))

Scene.click(Scene.role('textbox', { name: 'Title' }))
Scene.Subscription.emit(
  ApplicationBlock.subscriptions.documentFeed,
  Message.ReceivedDocumentUpdate({ documentId, revision }),
)

Scene.Command.resolve(
  SaveDocument({ documentId }),
  Message.SucceededSaveDocument({ documentId, revision }),
)
