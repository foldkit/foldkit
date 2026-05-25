import clsx from 'clsx'
import { Array, Match as M, Number, Option } from 'effect'
import { File, Submodel, Ui } from 'foldkit'
import { type Html, html } from 'foldkit/html'

import { Attachments } from '../step'

const BYTES_PER_KB = 1024
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB

const formatFileSize = (bytes: number): string =>
  M.value(bytes).pipe(
    M.when(Number.isLessThan(BYTES_PER_KB), () => `${bytes} B`),
    M.when(
      Number.isLessThan(BYTES_PER_MB),
      () => `${(bytes / BYTES_PER_KB).toFixed(1)} KB`,
    ),
    M.orElse(() => `${(bytes / BYTES_PER_MB).toFixed(1)} MB`),
  )

const dropZoneClassName =
  'block cursor-pointer rounded-lg border-2 border-dashed px-4 py-6 text-center transition border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50 data-[drag-over]:border-indigo-500 data-[drag-over]:bg-indigo-50'

const fileKey = (file: File.File): string =>
  `${File.name(file)}:${File.size(file)}:${file.lastModified}`

const resumeView = (resume: File.File): Html => {
  const h = html<Attachments.Message>()

  return h.keyed('div')(
    'resume-filled',
    [
      h.Class(
        'flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3',
      ),
    ],
    [
      h.div(
        [h.Class('flex items-center gap-3')],
        [
          h.span([h.Class('text-lg')], ['📄']),
          h.div(
            [],
            [
              h.p(
                [h.Class('text-sm font-medium text-gray-900')],
                [File.name(resume)],
              ),
              h.p(
                [h.Class('text-xs text-gray-500')],
                [formatFileSize(File.size(resume))],
              ),
            ],
          ),
        ],
      ),
      h.button(
        [
          h.Type('button'),
          h.OnClick(Attachments.RemovedResume()),
          h.Class(
            'text-sm text-gray-400 hover:text-red-500 transition cursor-pointer',
          ),
        ],
        ['Remove'],
      ),
    ],
  )
}

const additionalFileView = (file: File.File, fileIndex: number): Html => {
  const h = html<Attachments.Message>()

  return h.keyed('div')(
    fileKey(file),
    [
      h.Class(
        'flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2',
      ),
    ],
    [
      h.div(
        [h.Class('flex items-center gap-2')],
        [
          h.span([h.Class('text-sm')], ['📎']),
          h.span([h.Class('text-sm text-gray-700')], [File.name(file)]),
          h.span(
            [h.Class('text-xs text-gray-400')],
            [formatFileSize(File.size(file))],
          ),
        ],
      ),
      h.button(
        [
          h.Type('button'),
          h.OnClick(Attachments.RemovedAdditionalFile({ fileIndex })),
          h.Class(
            'text-xs text-gray-400 hover:text-red-500 transition cursor-pointer',
          ),
        ],
        ['Remove'],
      ),
    ],
  )
}

export const attachmentsView = Submodel.defineView<
  Attachments.Model,
  Attachments.Message
>((model): Html => {
  const h = html<Attachments.Message>()
  const { resumeDrop, maybeResume, additionalFilesDrop, additionalFiles } =
    model

  const resumeSection = h.div(
    [h.Class('space-y-2')],
    [
      h.h3([h.Class('text-sm font-medium text-gray-700')], ['Resume (PDF)']),
      Option.match(maybeResume, {
        onNone: () =>
          h.submodel({
            slotId: resumeDrop.id,
            model: resumeDrop,
            view: Ui.FileDrop.view,
            viewInputs: {
              accept: ['application/pdf', '.doc', '.docx'],
              toView: attributes =>
                h.keyed('label')(
                  'resume-empty',
                  [
                    ...attributes.root,
                    h.Class(clsx(dropZoneClassName, 'py-6')),
                  ],
                  [
                    h.p(
                      [h.Class('text-sm text-gray-600')],
                      ['Drop your resume or click to upload'],
                    ),
                    h.p(
                      [h.Class('text-xs text-gray-400 mt-1')],
                      ['PDF, DOC, or DOCX up to 10MB'],
                    ),
                    h.input(attributes.input),
                  ],
                ),
            },
            toParentMessage: message =>
              Attachments.GotResumeDropMessage({ message }),
          }),
        onSome: resumeView,
      }),
    ],
  )

  const additionalSection = h.div(
    [h.Class('space-y-2')],
    [
      h.h3(
        [h.Class('text-sm font-medium text-gray-700')],
        ['Additional Files (optional)'],
      ),
      h.submodel({
        slotId: additionalFilesDrop.id,
        model: additionalFilesDrop,
        view: Ui.FileDrop.view,
        viewInputs: {
          multiple: true,
          toView: attributes =>
            h.label(
              [...attributes.root, h.Class(clsx(dropZoneClassName, 'py-8'))],
              [
                h.p(
                  [h.Class('text-sm text-gray-500')],
                  ['Drag and drop files here, or click to browse'],
                ),
                h.p(
                  [h.Class('text-xs text-gray-400 mt-1')],
                  ['Cover letters, certifications, portfolios, etc.'],
                ),
                h.input(attributes.input),
              ],
            ),
        },
        toParentMessage: message =>
          Attachments.GotAdditionalFilesDropMessage({ message }),
      }),
      ...Array.match(additionalFiles, {
        onEmpty: () => [],
        onNonEmpty: files => [
          h.div([h.Class('space-y-2')], files.map(additionalFileView)),
        ],
      }),
    ],
  )

  return h.div([h.Class('space-y-6')], [resumeSection, additionalSection])
})
