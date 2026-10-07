import { clsx } from 'clsx'
import { HashMap, HashSet, Option, Predicate } from 'effect'
import { Mount } from 'foldkit'
import { type HtmlBuilder } from 'foldkit/html'

import { Disclosure } from '@foldkit/ui'

import { type CodeBlock } from '../component'
import { Message } from './message'
import { type Model, SnippetSize } from './model'
import {
  COLLAPSED_PREVIEW_HEIGHT_PX,
  MINIMUM_EXPANSION_HEIGHT_PX,
  MeasureSnippetHeight,
} from './mount'

const CODE_LINE_HEIGHT_PX = 24
const CODE_VERTICAL_PADDING_PX = 32

const isEstimatedToOverflow = (rawCode: string): boolean =>
  rawCode.split('\n').length * CODE_LINE_HEIGHT_PX + CODE_VERTICAL_PADDING_PX >
  COLLAPSED_PREVIEW_HEIGHT_PX + MINIMUM_EXPANSION_HEIGHT_PX

const isMeasuredToOverflow = (model: Model, id: string, rawCode: string) =>
  Option.match(HashMap.get(model.snippetSizes, id), {
    onNone: () => isEstimatedToOverflow(rawCode),
    onSome: snippetSize =>
      SnippetSize.match(snippetSize, {
        Fits: () => false,
        Overflows: () => true,
      }),
  })

export const renderer =
  <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    renderCopyButton: CodeBlock.RenderCopyButton,
    h: HtmlBuilder<ParentMessage>,
  ): CodeBlock.RenderSnippet =>
  ({ id, title, content, rawCode, copyAriaLabel, className }) => {
    const isOpen = HashSet.has(model.openSnippetIds, id)
    const isCollapsible = isMeasuredToOverflow(model, id, rawCode)
    const hasTitle = Predicate.isNotUndefined(title)
    const titleId = `${id}-title`
    const mountedContent = h.div(
      [
        h.OnMount(
          Mount.mapMessage(
            MeasureSnippetHeight({ snippetId: id }),
            toParentMessage,
          ),
        ),
        h.Class('snippet-code-content min-w-0'),
      ],
      [content],
    )
    const copyButton = renderCopyButton({
      id,
      text: rawCode,
      ariaLabel: copyAriaLabel,
      positionClass: 'top-2 right-2',
      variant: hasTitle ? 'Header' : 'Overlay',
    })
    const titleBar = hasTitle
      ? [
          h.figcaption(
            [
              h.Class(
                'flex items-center gap-2 border-b border-gray-200 bg-[var(--code-background)] py-1 pr-2 pl-4 text-sm font-medium text-gray-700 dark:border-gray-700/50 dark:text-gray-300',
              ),
            ],
            [
              h.span([h.Id(titleId), h.Class('min-w-0 flex-1 py-1')], [title]),
              copyButton,
            ],
          ),
        ]
      : []
    const overlayCopyButton = hasTitle ? [] : [copyButton]
    const shell = hasTitle ? h.figure : h.div
    const shellAttributes = [
      h.DataAttribute('pagefind-ignore', ''),
      ...(hasTitle ? [h.AriaLabelledBy(titleId)] : []),
      h.Class(
        clsx(
          'code-surface relative mt-6 min-w-0 overflow-clip rounded-lg border border-gray-200 dark:border-gray-700/50',
          className,
        ),
      ),
    ]

    if (!isCollapsible) {
      return shell(shellAttributes, [
        ...titleBar,
        mountedContent,
        ...overlayCopyButton,
      ])
    }

    return Disclosure.view(
      {
        id,
        isOpen,
        onToggle: nextIsOpen =>
          toParentMessage(
            Message.ToggledSnippet({ snippetId: id, isOpen: nextIsOpen }),
          ),
        toView: ({ button, panel, animatePanel }) =>
          shell(shellAttributes, [
            ...titleBar,
            h.div(
              [
                h.DataAttribute('snippet-disclosure-layout', ''),
                h.Class('relative'),
              ],
              [
                animatePanel(
                  h.div([...panel, h.Class('pb-12')], [mountedContent]),
                  {
                    peek: `${COLLAPSED_PREVIEW_HEIGHT_PX}px`,
                  },
                ),
                ...overlayCopyButton,
                h.div([
                  h.AriaHidden(true),
                  h.Class(
                    clsx(
                      'pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--code-background)] via-[var(--code-background)]/85 to-transparent',
                      isOpen && 'hidden',
                    ),
                  ),
                ]),
                h.div(
                  [
                    h.Class(
                      'pointer-events-none inset-x-0 sticky bottom-0 z-10 flex h-0 -translate-y-3 items-start justify-center',
                    ),
                  ],
                  [
                    h.button(
                      [
                        ...button,
                        h.Class(
                          'pointer-events-auto -translate-y-full cursor-pointer whitespace-nowrap rounded-full border border-gray-300 bg-[var(--code-background)] px-3.5 py-1.5 text-sm font-normal text-gray-700 shadow-sm transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus-visible:outline-accent-400',
                        ),
                      ],
                      [isOpen ? 'Hide code' : 'Show code'],
                    ),
                  ],
                ),
              ],
            ),
          ]),
      },
      h,
    )
  }
