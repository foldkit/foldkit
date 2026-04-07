import type { Html } from 'foldkit/html'

import { div } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { pageTitle, para, tableOfContentsEntryToHeader } from '../../prose'
import type { Message } from './message'
import type { Model } from './model'
import * as Transition from './transition'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
]

export const view = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [],
    [
      pageTitle('ui/transition', 'Transition'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A headless transition component that coordinates CSS enter/leave animations via data attributes. Controls the animation lifecycle with a state machine — the parent sends Showed/Hidden messages, and the component manages the double-rAF timing, transition detection, and cleanup.',
      ),
      ...Transition.transitionDemo(
        model.transitionDemo,
        model.isTransitionDemoShowing,
        toParentMessage,
      ),
    ],
  )
