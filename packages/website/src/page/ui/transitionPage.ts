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
import { patternsOutMessageRouter } from '../../route'
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
import * as Transition from './transition'

// TABLE OF CONTENTS

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const whyHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'why',
  text: 'Why Transition?',
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

const lifecycleHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'lifecycle',
  text: 'Lifecycle',
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

const viewConfigHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'view-config',
  text: 'ViewConfig',
}

const outMessagesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'out-messages',
  text: 'OutMessages',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  whyHeader,
  examplesHeader,
  stylingHeader,
  lifecycleHeader,
  apiReferenceHeader,
  initConfigHeader,
  viewConfigHeader,
  outMessagesHeader,
]

// SECTION DATA

const initConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description: 'Unique ID for the transition instance.',
  },
  {
    name: 'isShowing',
    type: 'boolean',
    default: 'false',
    description: 'Initial visibility state.',
  },
]

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'model',
    type: 'Transition.Model',
    description: 'The transition state from your parent Model.',
  },
  {
    name: 'content',
    type: 'Html',
    description: 'The content to animate in and out.',
  },
  {
    name: 'animateSize',
    type: 'boolean',
    default: 'false',
    description:
      'Animates height collapse/expand using CSS grid. When true, the element stays in the DOM with grid-template-rows transitioning between 0fr and 1fr.',
  },
  {
    name: 'className',
    type: 'string',
    description: 'CSS class for the transition wrapper.',
  },
  {
    name: 'attributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description: 'Additional attributes for the wrapper.',
  },
  {
    name: 'element',
    type: 'TagName',
    default: "'div'",
    description: 'The HTML element for the wrapper.',
  },
]

const outMessageProps: ReadonlyArray<PropEntry> = [
  {
    name: 'StartedLeaveAnimating',
    type: 'OutMessage',
    description:
      'Emitted when the leave animation begins. Your update function should provide Transition.defaultLeaveCommand(model) to detect transition end.',
  },
  {
    name: 'TransitionedOut',
    type: 'OutMessage',
    description:
      'Emitted when the leave animation finishes. Use this to unmount content or update your Model.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-closed',
    condition:
      'Present at the start of enter and during leave. Target this for your hidden state styles.',
  },
  { attribute: 'data-enter', condition: 'Present during the enter animation.' },
  { attribute: 'data-leave', condition: 'Present during the leave animation.' },
  {
    attribute: 'data-transition',
    condition: 'Present during any animation phase.',
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
      pageTitle('ui/transition', 'Transition'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A CSS transition coordinator that manages enter/leave animations via a state machine and data attributes. Transition uses the ',
        link(patternsOutMessageRouter(), 'OutMessage pattern'),
        ' — your update function handles ',
        inlineCode('StartedLeaveAnimating'),
        ' (to provide transition detection) and ',
        inlineCode('TransitionedOut'),
        ' (to unmount content). Used internally by Dialog, Menu, Popover, Listbox, and Combobox when ',
        inlineCode('isAnimated'),
        ' is true.',
      ),
      heading(whyHeader.level, whyHeader.id, whyHeader.text),
      para(
        'CSS transitions only play when a property changes — if an element mounts with its final styles, the browser has no "before" state to transition from and nothing animates. Reliably coordinating enter and leave animations takes three pieces of machinery that are easy to get wrong.',
      ),
      para(
        'First, enter animations need a closed state that sticks for one frame before being removed, so the browser commits it to the DOM and then sees a change. Transition handles this with a double-',
        inlineCode('requestAnimationFrame'),
        ' sequence — one frame to apply ',
        inlineCode('data-closed'),
        ', another to remove it and trigger the CSS transition.',
      ),
      para(
        'Second, ',
        inlineCode('transitionend'),
        " doesn't feed back into your update function. The Effect runtime has no listener for the browser event, so without a coordinator there's no way to know when a leave animation has actually finished — and therefore no way to reliably unmount content after it does. Transition emits ",
        inlineCode('TransitionedOut'),
        ' as the bridge: your update provides ',
        inlineCode('defaultLeaveCommand'),
        ', it listens for ',
        inlineCode('transitionend'),
        ', and Transition tells you when the leave is complete.',
      ),
      para(
        'Third, animating ',
        inlineCode('height: auto'),
        " isn't possible with pure CSS — ",
        inlineCode('auto'),
        ' is not an animatable value, so height transitions normally require JavaScript DOM measurement. ',
        inlineCode('animateSize: true'),
        ' sidesteps this by wrapping content in a CSS grid that animates ',
        inlineCode('grid-template-rows'),
        ' from ',
        inlineCode('0fr'),
        ' to ',
        inlineCode('1fr'),
        ' — a structure that works but requires specific DOM nesting that Transition provides for you.',
      ),
      para(
        'Every component in the library that needs enter/leave animations (Dialog, Menu, Popover, Listbox, Combobox) uses Transition internally rather than reinventing this coordination. If you need the same for your own content, Transition gives you the same machinery.',
      ),
      infoCallout(
        'See it in an app',
        'Check out how Transition is wired up in a ',
        link(uiShowcaseViewSourceHref('transition'), 'real Foldkit app'),
        '.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      para(
        'Send ',
        inlineCode('Transition.Showed()'),
        ' to start the enter animation and ',
        inlineCode('Transition.Hid()'),
        ' to start the leave animation. Style with Tailwind data-attribute selectors like ',
        inlineCode('data-[closed]:opacity-0'),
        '.',
      ),
      demoContainer(
        ...Transition.transitionDemo(model.transitionDemo, toParentMessage),
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiTransitionBasicHighlighted)],
          [],
        ),
        Snippet.uiTransitionBasicRaw,
        'Copy transition example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'Transition is headless — it only manages data attributes. Apply CSS transitions using selectors like ',
        inlineCode('data-[closed]:opacity-0 data-[closed]:scale-95'),
        '. The ',
        inlineCode('animateSize'),
        ' option uses CSS grid (',
        inlineCode('grid-template-rows: 0fr'),
        ' \u2192 ',
        inlineCode('1fr'),
        ') for smooth height animation without JavaScript measurement.',
      ),
      dataAttributeTable(dataAttributes),
      heading(lifecycleHeader.level, lifecycleHeader.id, lifecycleHeader.text),
      para(
        'The state machine follows this sequence: ',
        inlineCode('Idle'),
        ' \u2192 ',
        inlineCode('EnterStart'),
        ' (data-closed set) \u2192 rAF \u2192 ',
        inlineCode('EnterAnimating'),
        ' (data-closed removed, transition plays) \u2192 CSS transition ends \u2192 ',
        inlineCode('Idle'),
        '. For leaving: ',
        inlineCode('LeaveStart'),
        ' \u2192 rAF \u2192 ',
        inlineCode('LeaveAnimating'),
        ' (data-closed set, transition plays) \u2192 parent detects end \u2192 ',
        inlineCode('Idle'),
        '.',
      ),
      para(
        'The double-rAF timing (one frame to set the start state, another to trigger the animation) ensures browsers flush layout between phases so the CSS transition actually plays.',
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
      para(
        'Configuration object passed to ',
        inlineCode('Transition.init()'),
        '.',
      ),
      propTable(initConfigProps),
      heading(
        viewConfigHeader.level,
        viewConfigHeader.id,
        viewConfigHeader.text,
      ),
      para(
        'Configuration object passed to ',
        inlineCode('Transition.view()'),
        '.',
      ),
      propTable(viewConfigProps),
      heading(
        outMessagesHeader.level,
        outMessagesHeader.id,
        outMessagesHeader.text,
      ),
      para(
        'OutMessages emitted from ',
        inlineCode('Transition.update()'),
        '. Handle these in your parent update function.',
      ),
      propTable(outMessageProps),
    ],
  )
