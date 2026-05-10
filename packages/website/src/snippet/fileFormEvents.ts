import { File } from 'foldkit'
import { html } from 'foldkit/html'

const h = html<Message>()

const resumePicker = (model: Model) =>
  h.input([
    h.Key('resume-input'),
    h.Type('file'),
    h.Accept('application/pdf'),
    h.OnFileChange(files => SelectedResume({ files })),
  ])

const attachmentsDropZone = (model: Model) =>
  h.div(
    [
      h.Key('attachments-drop-zone'),
      h.Class(
        model.isDraggingOver
          ? 'border-2 border-dashed border-accent-500 bg-accent-50'
          : 'border-2 border-dashed border-gray-300',
      ),
      h.OnDragEnter(StartedDragOver()),
      h.OnDragLeave(StoppedDragOver()),
      h.AllowDrop(),
      h.OnDropFiles(files => DroppedAttachments({ files })),
    ],
    ['Drop files here, or use the Browse button below.'],
  )
