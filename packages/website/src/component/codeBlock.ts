import { clsx } from 'clsx'
import { Option } from 'effect'
import { Html, inertHtml as ih } from 'foldkit/html'

const PagefindIgnore = ih.DataAttribute('pagefind-ignore', '')

export type RenderCopyButton = (
  config: Readonly<{
    id: string
    text: string
    ariaLabel: string
    positionClass: string
  }>,
) => Html

const DEFAULT_COPY_BUTTON_POSITION_CLASS = 'top-2 right-2'

type ViewOptions = Readonly<{
  className?: string
  maybeLanguage?: Option.Option<string>
  copyButtonPositionClass?: string
}>

export const view = (
  id: string,
  code: string,
  ariaLabel: string,
  renderCopyButton: RenderCopyButton,
  {
    className,
    maybeLanguage = Option.none(),
    copyButtonPositionClass = DEFAULT_COPY_BUTTON_POSITION_CLASS,
  }: ViewOptions = {},
) => {
  const languageAttribute = Option.match(maybeLanguage, {
    onNone: () => [],
    onSome: language => [ih.DataAttribute('language', language)],
  })

  const content = ih.pre(
    [
      ...languageAttribute,
      ih.Class('text-sm p-4 pr-14 overflow-x-auto !rounded-none !border-none'),
    ],
    [code],
  )

  return ih.div(
    [
      PagefindIgnore,
      ih.Class(
        clsx(
          'code-surface relative min-w-0 rounded-lg border border-gray-200 dark:border-gray-700/50',
          className,
        ),
      ),
    ],
    [
      content,
      renderCopyButton({
        id,
        text: code,
        ariaLabel,
        positionClass: copyButtonPositionClass,
      }),
    ],
  )
}

export const highlightedView = (
  id: string,
  content: Html,
  rawCode: string,
  ariaLabel: string,
  renderCopyButton: RenderCopyButton,
  className?: string,
) =>
  ih.div(
    [PagefindIgnore, ih.Class(clsx('relative min-w-0 mt-6', className))],
    [
      content,
      renderCopyButton({
        id,
        text: rawCode,
        ariaLabel,
        positionClass: DEFAULT_COPY_BUTTON_POSITION_CLASS,
      }),
    ],
  )

/**
 * `highlightedView` bound to a page-supplied copy-button renderer, for a
 * page rendered inside a Submodel. Bind once at the top of the view and the
 * call sites below it are unchanged.
 */
export const highlightedViewFor =
  (renderCopyButton: RenderCopyButton) =>
  (
    id: string,
    content: Html,
    rawCode: string,
    ariaLabel: string,
    className?: string,
  ): Html =>
    highlightedView(
      id,
      content,
      rawCode,
      ariaLabel,
      renderCopyButton,
      className,
    )
