import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import { uiShowcaseViewSourceHref } from '../../link'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import {
  demoContainer,
  heading,
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { uiAnimationRouter } from '../../route'
import * as Snippet from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'
import {
  type DataAttributeEntry,
  type PropEntry,
  dataAttributeTable,
  propTable,
} from '../../view/docTable'
import type { Message } from './message'
import type { Model } from './model'
import * as Toast from './toast'

// TABLE OF CONTENTS

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const examplesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'examples',
  text: 'Examples',
}

const stylingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'styling',
  text: 'Styling',
}

const accessibilityHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'accessibility',
  text: 'Accessibility',
}

const apiReferenceHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'api-reference',
  text: 'API Reference',
}

const initConfigHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'init-config',
  text: 'InitConfig',
}

const showInputHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'show-input',
  text: 'ShowInput',
}

const viewConfigHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'view-config',
  text: 'ViewConfig',
}

const programmaticHelpersHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'programmatic-helpers',
  text: 'Programmatic Helpers',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  stylingHeader,
  accessibilityHeader,
  apiReferenceHeader,
  initConfigHeader,
  showInputHeader,
  viewConfigHeader,
  programmaticHelpersHeader,
]

// SECTION DATA

const initConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description: 'Unique ID for the toast container.',
  },
  {
    name: 'defaultDuration',
    type: 'Duration.Input',
    default: 'Duration.seconds(4)',
    description:
      'Auto-dismiss duration applied to any show() call that does not provide its own duration or pass sticky: true. Accepts any Effect Duration input; a bare number is interpreted as milliseconds.',
  },
]

const showInputProps: ReadonlyArray<PropEntry> = [
  {
    name: 'payload',
    type: 'A (your payload type)',
    description:
      'Content for this entry, in whatever shape you supplied to Toast.make(). The component never reads it; it flows through to your renderEntry callback.',
  },
  {
    name: 'variant',
    type: "'Info' | 'Success' | 'Warning' | 'Error'",
    default: "'Info'",
    description:
      'Semantic category. Maps to data-variant for styling and to role=status (Info, Success) or role=alert (Warning, Error) for accessibility. The only content-adjacent field the component owns. Everything else is in payload.',
  },
  {
    name: 'duration',
    type: 'Duration.Input',
    description:
      "Overrides the container's defaultDuration for this entry. Ignored when sticky: true.",
  },
  {
    name: 'sticky',
    type: 'boolean',
    default: 'false',
    description:
      'When true, the entry never auto-dismisses. The user must close it manually.',
  },
]

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'model',
    type: 'Toast.Model',
    description: 'The toast container state from your parent Model.',
  },
  {
    name: 'position',
    type: "'TopLeft' | 'TopCenter' | 'TopRight' | 'BottomLeft' | 'BottomCenter' | 'BottomRight'",
    description: 'Where the toast viewport is anchored on the screen.',
  },
  {
    name: 'toParentMessage',
    type: '(childMessage: Dismissed | HoveredEntry | LeftEntry) => ParentMessage',
    description:
      'Wraps the subset of Toast Messages that fire from DOM events in your parent Message type.',
  },
  {
    name: 'renderEntry',
    type: '(entry: typeof Toast.Entry.Type, handlers: { dismiss: ParentMessage }) => Html',
    description:
      "Renders each entry from its lifecycle fields (id, variant, transition) and its payload (your shape). The component wraps the return in an <li> with role, lifecycle handlers, and transition data attributes. Wire handlers.dismiss to a close button's OnClick.",
  },
  {
    name: 'ariaLabel',
    type: 'string',
    default: "'Notifications'",
    description: 'aria-label on the container region.',
  },
  {
    name: 'className',
    type: 'string',
    description: 'CSS class for the container <ol>.',
  },
  {
    name: 'entryClassName',
    type: 'string',
    description: 'CSS class applied to every <li> entry.',
  },
]

const programmaticHelpers: ReadonlyArray<PropEntry> = [
  {
    name: 'show',
    type: '(model: Model, input: ShowInput) => [Model, Commands]',
    description:
      'Adds a new toast entry. Call this from any parent update handler that needs to surface a notification. Returns the next model plus commands for the enter animation and the auto-dismiss timer.',
  },
  {
    name: 'dismiss',
    type: '(model: Model, entryId: string) => [Model, Commands]',
    description:
      'Begins dismissing a specific entry. Safe to call for an entry that is already leaving or has been removed.',
  },
  {
    name: 'dismissAll',
    type: '(model: Model) => [Model, Commands]',
    description: 'Begins dismissing every currently-visible entry.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-variant',
    condition:
      'Present on each entry, with the variant value (Info, Success, Warning, Error). Use for per-variant CSS.',
  },
  {
    attribute: 'data-enter',
    condition: 'Present on an entry while its enter animation runs.',
  },
  {
    attribute: 'data-leave',
    condition: 'Present on an entry while its leave animation runs.',
  },
  {
    attribute: 'data-closed',
    condition:
      'Present on an entry at the closed extreme of its enter or leave animation. Pair with data-enter or data-leave to drive the starting and ending CSS states.',
  },
  {
    attribute: 'data-transition',
    condition: 'Present on an entry while either animation runs.',
  },
]

// VIEW

export const view = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
  copiedSnippets: CopiedSnippets,
): Html =>
  div(
    [],
    [
      pageTitle('ui/toast', 'Toast'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A stack of transient notifications anchored to a corner of the viewport. Each entry has its own enter and leave animation, its own auto-dismiss timer, and its own hover-to-pause behavior. One container lives at the app root; entries are added dynamically via ',
        inlineCode('Toast.show'),
        '.',
      ),
      para(
        'Toast is parameterized on a user-provided payload schema. The component owns only lifecycle and a11y fields: id, variant (drives ARIA role), transition, dismiss timer, hover state. Everything else lives in your payload and is rendered by your ',
        inlineCode('renderEntry'),
        ' callback. ',
        inlineCode('Ui.Toast.make(PayloadSchema)'),
        ' returns a module with ',
        inlineCode('Model'),
        ', ',
        inlineCode('show'),
        ', ',
        inlineCode('view'),
        ', and the rest bound to your payload type.',
      ),
      infoCallout(
        'See it in an app',
        'Check out how Toast is wired up in a ',
        link(uiShowcaseViewSourceHref('toast'), 'real Foldkit app'),
        '.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      para(
        'Click a variant to push a toast onto the stack. Hover a toast to pause its auto-dismiss; move away and the timer restarts.',
      ),
      demoContainer(...Toast.demo(model.toastDemo, toParentMessage)),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippet.uiToastBasicHighlighted)], []),
        Snippet.uiToastBasicRaw,
        'Copy toast example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'Toast is headless. The container gets ',
        inlineCode('position: fixed'),
        ' and flex-column layout from the component (so entries stack correctly for each ',
        inlineCode('position'),
        '); every other visual decision lives in your ',
        inlineCode('renderEntry'),
        ' callback and your ',
        inlineCode('entryClassName'),
        '. Use ',
        inlineCode('data-variant'),
        ' on the entry to drive per-variant styling.',
      ),
      para(
        'Each entry’s enter/leave animations flow through the ',
        link(uiAnimationRouter(), 'Animation'),
        ' module. Style with CSS transitions or CSS keyframe animations. Animation advances once every animation on the element has settled.',
      ),
      dataAttributeTable(dataAttributes),
      heading(
        accessibilityHeader.level,
        accessibilityHeader.id,
        accessibilityHeader.text,
      ),
      para(
        'The container is a ',
        inlineCode('role="region"'),
        ' with ',
        inlineCode('aria-live="polite"'),
        ', always rendered (even when empty) so screen readers observe the live region from page load. Individual entries receive ',
        inlineCode('role="status"'),
        ' for Info and Success variants, ',
        inlineCode('role="alert"'),
        ' for Warning and Error. Auto-dismiss pauses on pointer hover.',
      ),
      heading(
        apiReferenceHeader.level,
        apiReferenceHeader.id,
        apiReferenceHeader.text,
      ),
      heading(
        initConfigHeader.level,
        initConfigHeader.id,
        initConfigHeader.text,
      ),
      para('Configuration object passed to ', inlineCode('Toast.init()'), '.'),
      propTable(initConfigProps),
      heading(showInputHeader.level, showInputHeader.id, showInputHeader.text),
      para('Input shape for ', inlineCode('Toast.show(model, input)'), '.'),
      propTable(showInputProps),
      heading(
        viewConfigHeader.level,
        viewConfigHeader.id,
        viewConfigHeader.text,
      ),
      para('Configuration object passed to ', inlineCode('Toast.view()'), '.'),
      propTable(viewConfigProps),
      heading(
        programmaticHelpersHeader.level,
        programmaticHelpersHeader.id,
        programmaticHelpersHeader.text,
      ),
      para(
        'Helper functions for driving toasts from parent update handlers, returning ',
        inlineCode('[Model, Commands]'),
        '.',
      ),
      propTable(programmaticHelpers),
    ],
  )
