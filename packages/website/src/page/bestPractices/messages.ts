import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { coreSubmodelRouter } from '../../route'

const messagesAsEventsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'messages-as-events',
  text: 'Messages as Events',
}

const goodMessageNamesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'good-message-names',
  text: 'Good Message Names',
}

const avoidTheseHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'avoid-these',
  text: 'Avoid These',
}

const everyMessageCarriesMeaningHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'every-message-carries-meaning',
  text: 'Every Message Carries Meaning',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  messagesAsEventsHeader,
  goodMessageNamesHeader,
  avoidTheseHeader,
  everyMessageCarriesMeaningHeader,
]

export const view = (): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('best-practices/messages', 'Messages'),
      tableOfContentsEntryToHeader(messagesAsEventsHeader),
      para(
        'Messages describe ',
        'what happened',
        ', not ',
        'what to do',
        '. Name them as verb-first, past-tense events where the prefix acts as a category marker: ',
        inlineCode('Clicked*'),
        ' for button presses, ',
        inlineCode('Updated*'),
        ' for input changes, ',
        inlineCode('Succeeded*'),
        '/',
        inlineCode('Failed*'),
        ' for Command results that can meaningfully fail, ',
        inlineCode('Completed*'),
        ' for fire-and-forget Command acknowledgments, ',
        inlineCode('Got*'),
        ' for child module results via the ',
        link(`${coreSubmodelRouter()}#surfacing-facts`, 'OutMessage'),
        ' pattern. For example, ',
        inlineCode('ClickedFormSubmit'),
        ' and ',
        inlineCode('RemovedCartItem'),
        ' rather than imperative Commands like ',
        inlineCode('SubmitForm'),
        ' or ',
        inlineCode('RemoveFromCart'),
        '.',
      ),
      tableOfContentsEntryToHeader(goodMessageNamesHeader),
      h.ul(
        [h.Class('list-disc mb-4 space-y-1 font-mono text-sm')],
        [
          h.li([], ['ClickedAddToCart']),
          h.li([], ['ChangedSearchInput']),
          h.li([], ['ReceivedUserData']),
        ],
      ),
      tableOfContentsEntryToHeader(avoidTheseHeader),
      h.ul(
        [h.Class('list-disc mb-6 space-y-1 font-mono text-sm')],
        [
          h.li([], ['SetCartItems']),
          h.li([], ['UpdateSearchText']),
          h.li([], ['MutateUserState']),
        ],
      ),
      para(
        'The ',
        inlineCode('update'),
        ' function decides how to handle a Message. The Message itself is just a fact about what occurred.',
      ),
      tableOfContentsEntryToHeader(everyMessageCarriesMeaningHeader),
      para(
        'Never use a generic ',
        inlineCode('NoOp'),
        ' Message. Every Message should describe what happened, even for fire-and-forget Commands where the update function is a no-op. For example, when a focus Command completes, use ',
        inlineCode('CompletedFocusButton'),
        '. When scroll is locked, use ',
        inlineCode('CompletedLockScroll'),
        '. When an internal navigation finishes, use ',
        inlineCode('CompletedNavigateInternal'),
        '.',
      ),
      para(
        'Notice that this mirrors how you name Commands. Commands have two names: the function name (camelCase: ',
        inlineCode('lockScroll'),
        ', ',
        inlineCode('focusButton'),
        ', ',
        inlineCode('showDialog'),
        ') and the Command ',
        inlineCode('name'),
        ' field (PascalCase: ',
        inlineCode('LockScroll'),
        ', ',
        inlineCode('FocusButton'),
        ', ',
        inlineCode('ShowDialog'),
        '). Both are verb-first imperatives: instructions to the runtime. The resulting Message keeps the same verb-first order with a prefix: ',
        inlineCode('CompletedLockScroll'),
        ', ',
        inlineCode('CompletedFocusButton'),
        ', ',
        inlineCode('CompletedShowDialog'),
        '. Verb-first naming aligns with Command names, making Command→Message pairs instantly recognizable: Command ',
        inlineCode('FocusButton'),
        ' → Message ',
        inlineCode('CompletedFocusButton'),
        ', Command ',
        inlineCode('LockScroll'),
        ' → Message ',
        inlineCode('CompletedLockScroll'),
        '.',
      ),
      para(
        'This turns the DevTools timeline from a wall of identical ',
        inlineCode('NoOp'),
        ' entries into a readable narrative: ',
        inlineCode('Opened'),
        ' → ',
        inlineCode('CompletedFocusItems'),
        ', ',
        inlineCode('CompletedLockScroll'),
        ', ',
        inlineCode('CompletedInertOthers'),
        '. Every line tells you what happened in your application.',
      ),
      para(
        'Command names are often more specific than the Messages they produce. Several Commands (',
        inlineCode('NavigateInternal'),
        ', ',
        inlineCode('RedirectToLogin'),
        ', ',
        inlineCode('ReplaceSearchUrl'),
        ') all produce ',
        inlineCode('CompletedNavigateInternal'),
        '. The Message is intentionally generic because update handles all internal navigations the same way. The Command name preserves the context that the Message discards: not just that a navigation happened, but why.',
      ),
    ],
  )
}
