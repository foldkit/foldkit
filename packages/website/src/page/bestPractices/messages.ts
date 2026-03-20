import type { Html } from 'foldkit/html'

import { Class, div, li, ul } from '../../html'
import type { TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { patternsOutMessageRouter } from '../../route'

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

export const view = (): Html =>
  div(
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
        link(patternsOutMessageRouter(), 'OutMessage'),
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
      ul(
        [Class('list-disc mb-4 space-y-1 font-mono text-sm')],
        [
          li([], ['ClickedAddToCart']),
          li([], ['ChangedSearchInput']),
          li([], ['ReceivedUserData']),
        ],
      ),
      tableOfContentsEntryToHeader(avoidTheseHeader),
      ul(
        [Class('list-disc mb-6 space-y-1 font-mono text-sm')],
        [
          li([], ['SetCartItems']),
          li([], ['UpdateSearchText']),
          li([], ['MutateUserState']),
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
        inlineCode('CompletedButtonFocus'),
        '. When scroll is locked, use ',
        inlineCode('CompletedScrollLock'),
        '. When an internal navigation finishes, use ',
        inlineCode('CompletedInternalNavigation'),
        '.',
      ),
      para(
        'Notice that this is the opposite of how you name Commands. Commands have two names: the function name (camelCase: ',
        inlineCode('lockScroll'),
        ', ',
        inlineCode('focusButton'),
        ', ',
        inlineCode('showModal'),
        ') and the Command ',
        inlineCode('name'),
        ' field (PascalCase: ',
        inlineCode('LockScroll'),
        ', ',
        inlineCode('FocusButton'),
        ', ',
        inlineCode('ShowModal'),
        '). Both read as present-tense instructions because Commands are imperative. The resulting Message flips the order because it\u2019s a fact, not an instruction: ',
        inlineCode('CompletedScrollLock'),
        ', ',
        inlineCode('CompletedButtonFocus'),
        ', ',
        inlineCode('CompletedDialogShow'),
        '. Object-first naming also puts the distinguishing word earlier \u2014 instead of scanning past ',
        inlineCode('CompletedFocus*'),
        ' three times to find ',
        inlineCode('CompletedFocusButton'),
        ' as distinct from ',
        inlineCode('CompletedFocusItems'),
        ', you see ',
        inlineCode('CompletedButtonFocus'),
        ' and ',
        inlineCode('CompletedItemsFocus'),
        ' where the second word immediately tells you what was affected.',
      ),
      para(
        'This turns the DevTools timeline from a wall of identical ',
        inlineCode('NoOp'),
        ' entries into a readable narrative: ',
        inlineCode('Opened'),
        ' \u2192 ',
        inlineCode('CompletedItemsFocus'),
        ', ',
        inlineCode('CompletedScrollLock'),
        ', ',
        inlineCode('CompletedInertSetup'),
        '. Every line tells you what happened in your application.',
      ),
      para(
        'Command names are often more specific than the Messages they produce. Several Commands \u2014 ',
        inlineCode('NavigateInternal'),
        ', ',
        inlineCode('RedirectToLogin'),
        ', ',
        inlineCode('ReplaceSearchUrl'),
        ' \u2014 all produce ',
        inlineCode('CompletedInternalNavigation'),
        '. The Message is intentionally generic because update handles all internal navigations the same way. The Command name preserves the context that the Message discards: not just that a navigation happened, but why.',
      ),
    ],
  )
