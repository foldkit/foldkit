import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const scopeHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'scope',
  text: 'Scope',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  scopeHeader,
]

export const view = (): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('core/preserve-scroll', 'Preserve Scroll'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Editing a file under Vite triggers a full page reload, which resets the window scroll back to the top. When you are working on something far down a long page, every save bounces you away from it.',
      ),
      para(
        'To keep your place, Foldkit captures ',
        inlineCode('window.scrollX'),
        ' and ',
        inlineCode('window.scrollY'),
        ' just before the reload and reapplies them once the restored view has rendered, so the page comes back where you left it.',
      ),
      para(
        'Restoration runs in dev mode (gated behind ',
        inlineCode('import.meta.hot'),
        '), so there is zero runtime cost in production builds. Set ',
        inlineCode('preserveScroll'),
        ' to ',
        inlineCode('false'),
        ' to disable it, for an app that drives its own scroll restoration.',
      ),
      tableOfContentsEntryToHeader(scopeHeader),
      para(
        'Only the window scroll offset is preserved. Scroll positions of nested ',
        inlineCode('overflow'),
        ' containers are not.',
      ),
      para(
        'Restoration applies to document-owning apps built with ',
        inlineCode('makeApplication'),
        '. An embedded ',
        inlineCode('makeElement'),
        ' app is scoped to its container and never touches the host page’s scroll, so it opts out on its own.',
      ),
      para(
        'The offset is reapplied as soon as the restored view renders. A page whose full height settles only after asynchronous layout, such as images without set dimensions or media that loads in below the fold, can land short of a deep offset.',
      ),
    ],
  )
}
