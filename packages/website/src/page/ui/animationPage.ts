import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div, pre } from '../../html'
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
import {
  patternsOutMessageRouter,
  uiDialogRouter,
  uiPopoverRouter,
} from '../../route'
import * as Snippet from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'
import {
  type DataAttributeEntry,
  type PropEntry,
  dataAttributeTable,
  propTable,
} from '../../view/docTable'
import * as Animation from './animation'
import type { Message } from './message'
import type { Model } from './model'

// TABLE OF CONTENTS

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const whyHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'why',
  text: 'Why Does This Exist?',
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
  lifecycleHeader,
  stylingHeader,
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
    description: 'Unique ID for the animation instance.',
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
    type: 'Animation.Model',
    description: 'The animation state from your parent Model.',
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
    description: 'CSS class for the animation wrapper.',
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
      'Emitted when the leave animation begins. Your update function should provide Animation.defaultLeaveCommand(model) to detect animation settlement.',
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
      pageTitle('ui/animation', 'Animation'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        "Animation is a CSS animation lifecycle coordinator that manages enter/leave phases via a state machine and data attributes. If you're coming from imperative animation libraries (GSAP, Framer Motion, ",
        inlineCode('element.animate()'),
        '), it will feel inverted: those libraries let you say "do this now" and give you a callback when it\'s done, while Foldkit is declarative. You dispatch Messages describing what happened, Animation turns the lifecycle into a sequence of more Messages, and your update function reacts at each step. The payoff is that every animation state transition is in your Model, observable in DevTools, testable without a DOM, and can\'t run outside your update loop.',
      ),
      para(
        'Concretely, Animation uses the ',
        link(patternsOutMessageRouter(), 'OutMessage'),
        ' pattern: your update function handles ',
        inlineCode('StartedLeaveAnimating'),
        ' (to provide settlement detection) and ',
        inlineCode('TransitionedOut'),
        " (to unmount content). It's used internally by Dialog, Menu, Popover, Listbox, and Combobox when ",
        inlineCode('isAnimated'),
        ' is true, and works with both CSS transitions and CSS keyframe animations.',
      ),
      heading(whyHeader.level, whyHeader.id, whyHeader.text),
      para(
        'CSS animations only play when an element enters the DOM with one state and changes to another. If an element mounts with its final styles, the browser has no "before" state and nothing animates. Reliably coordinating enter and leave phases takes three pieces of machinery that are easy to get wrong.',
      ),
      para(
        'First, enter animations need a closed state that sticks for one frame before being removed, so the browser commits it to the DOM and then sees a change. Animation handles this with a double-',
        inlineCode('requestAnimationFrame'),
        ' sequence: one frame to apply ',
        inlineCode('data-closed'),
        ', another to remove it and trigger the CSS animation.',
      ),
      para(
        'Second, ',
        inlineCode('transitionend'),
        ' and ',
        inlineCode('animationend'),
        " don't automatically flow into your update function. You could subscribe to them yourself, but that means wiring a subscription per element, filtering by selector, and managing its lifecycle alongside the state machine. Without that coordinator, there's no reliable way to know when a leave animation has finished, and therefore no way to reliably unmount content after it does. Animation emits ",
        inlineCode('TransitionedOut'),
        ' as the bridge: your update provides ',
        inlineCode('defaultLeaveCommand'),
        ', it waits for the element’s animations to settle, and Animation tells you when the leave is complete.',
      ),
      para(
        'Third, animating ',
        inlineCode('height: auto'),
        " isn't possible with pure CSS: ",
        inlineCode('auto'),
        ' is not an animatable value, so height transitions normally require JavaScript DOM measurement. ',
        inlineCode('animateSize: true'),
        ' sidesteps this by wrapping content in a CSS grid that animates ',
        inlineCode('grid-template-rows'),
        ' from ',
        inlineCode('0fr'),
        ' to ',
        inlineCode('1fr'),
        '. The structure works but requires specific DOM nesting that Animation provides for you.',
      ),
      para(
        'Every component in the library that needs enter/leave animations (Dialog, Menu, Popover, Listbox, Combobox) uses Animation internally rather than reinventing this coordination. If you need the same for your own content, Animation gives you the same machinery.',
      ),
      infoCallout(
        'See it in an app',
        'Check out how Animation is wired up in a ',
        link(uiShowcaseViewSourceHref('animation'), 'real Foldkit app'),
        '.',
      ),
      heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
      para(
        'Send ',
        inlineCode('Animation.Showed()'),
        ' to start the enter animation and ',
        inlineCode('Animation.Hid()'),
        ' to start the leave animation. Style with Tailwind data-attribute selectors like ',
        inlineCode('data-[closed]:opacity-0'),
        '.',
      ),
      demoContainer(
        ...Animation.animationDemo(model.animationDemo, toParentMessage),
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiAnimationBasicHighlighted)],
          [],
        ),
        Snippet.uiAnimationBasicRaw,
        'Copy animation example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(lifecycleHeader.level, lifecycleHeader.id, lifecycleHeader.text),
      para(
        "Animation drives the enter phase to completion on its own. The leave phase hands control back to the parent halfway through so the parent can decide how settlement is detected. For example, Foldkit's ",
        link(uiDialogRouter(), 'Dialog'),
        ' just waits for CSS, while its ',
        link(uiPopoverRouter(), 'Popover'),
        ' races CSS against the anchor button scrolling off-screen. The asymmetry exists because leave detection varies by consumer, while enter detection does not.',
      ),
      pre(
        [
          Class(
            'mb-4 mx-auto w-fit max-w-full text-[#403d4a] dark:text-[#E0DEE6] text-sm p-4 overflow-x-auto rounded-lg bg-gray-100 dark:bg-[#1c1a20] border border-gray-200 dark:border-gray-700/50',
          ),
        ],
        [
          'ENTER  (Animation drives to completion on its own)\n' +
            '\n' +
            '         Showed()\n' +
            '            |\n' +
            '            ↓\n' +
            '   +-----------------+\n' +
            '   |   EnterStart    |\n' +
            '   +--------+--------+\n' +
            '            | rAF × 2\n' +
            '            ↓\n' +
            '   +-----------------+\n' +
            '   | EnterAnimating  |\n' +
            '   +--------+--------+\n' +
            '            | EndedAnimation (internal)\n' +
            '            ↓\n' +
            '   +-----------------+\n' +
            '   |      Idle       |\n' +
            '   +-----------------+\n' +
            '\n' +
            '\n' +
            'LEAVE  (Animation hands settlement detection to the parent)\n' +
            '\n' +
            '         Hid()\n' +
            '            |\n' +
            '            ↓\n' +
            '   +-----------------+\n' +
            '   |   LeaveStart    |\n' +
            '   +--------+--------+\n' +
            '            | rAF × 2\n' +
            '            ↓\n' +
            '   +-----------------+  ← emits StartedLeaveAnimating\n' +
            '   | LeaveAnimating  |    parent supplies leave Command\n' +
            '   +--------+--------+\n' +
            '            | leave Command dispatches EndedAnimation\n' +
            '            ↓\n' +
            '   +-----------------+  ← emits TransitionedOut\n' +
            '   |      Idle       |    parent handles post-animation cleanup\n' +
            '   +-----------------+',
        ],
      ),
      para(
        'The double-rAF timing (one frame to set the start state, another to trigger the animation) ensures browsers flush layout between phases so the CSS animation actually plays.',
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'Animation is headless. It only manages data attributes. You can style the lifecycle with either CSS transitions or CSS keyframe animations; the state machine advances once every animation on the element has settled.',
      ),
      para(
        'For CSS transitions, use data-attribute selectors like ',
        inlineCode('data-[closed]:opacity-0 data-[closed]:scale-95'),
        ' together with a ',
        inlineCode('transition'),
        ' property on the element. For CSS keyframe animations, apply an ',
        inlineCode('animation'),
        ' shorthand scoped to ',
        inlineCode('data-[enter]'),
        ' or ',
        inlineCode('data-[leave]'),
        '. The state machine waits for every animation on the element to settle, whether they fire ',
        inlineCode('transitionend'),
        ', ',
        inlineCode('animationend'),
        ', or both.',
      ),
      para(
        'Leave animations must be finite. ',
        inlineCode('animation-iteration-count: infinite'),
        ' never fires ',
        inlineCode('animationend'),
        ', which leaves the state machine in ',
        inlineCode('LeaveAnimating'),
        ' forever and the element in the DOM. Reserve infinite animations for decorative or ambient effects that don’t gate a leave phase.',
      ),
      para(
        'The ',
        inlineCode('animateSize'),
        ' option uses CSS grid (',
        inlineCode('grid-template-rows: 0fr'),
        ' → ',
        inlineCode('1fr'),
        ') for smooth height animation without JavaScript measurement.',
      ),
      dataAttributeTable(dataAttributes),
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
        inlineCode('Animation.init()'),
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
        inlineCode('Animation.view()'),
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
        inlineCode('Animation.update()'),
        '. Handle these in your parent update function.',
      ),
      propTable(outMessageProps),
    ],
  )
