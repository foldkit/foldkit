import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
  warningCallout,
} from '../../prose'
import {
  coreCommandsRouter,
  coreSubmodelRouter,
  coreSubscriptionsRouter,
  exampleDetailRouter,
  routingAndNavigationRouter,
} from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const childHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-child',
  text: 'The Child',
}

const parentHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-parent',
  text: 'The Parent',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  childHeader,
  parentHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('patterns/informing-submodels', 'Informing Submodels'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A Submodel owns its state and describes its state transitions in its own ',
        inlineCode('update'),
        '. However, sometimes it has to respond to changes outside its boundary, like the URL changing or a server push it folds into its state. It owns none of these, and they never reach its ',
        inlineCode('update'),
        ' on their own. So how does a Submodel respond to these changes without leaking into its parent?',
      ),
      para(
        'The Submodel closes that gap by exposing a helper the parent calls when the change happens. The helper runs the change through the Submodel’s own ',
        inlineCode('update'),
        ', so the Submodel derives its new state and returns any Commands the change calls for. The parent only needs to know that one named entry point, not the Submodel’s internal Messages, so the Submodel keeps full control of how it responds.',
      ),
      para(
        'Conventionally, that helper is an ',
        inlineCode('inform*'),
        ' helper: the parent informs the child of a change it doesn’t own, and the child decides what that means for its state.',
      ),
      para(
        'The rest of this page works the ',
        inlineCode('inform*'),
        ' pattern through routing, its most common case. The example is a ',
        inlineCode('/people'),
        ' page whose People Submodel holds a search input, a results list, and a list of recent searches. The Submodel does not own the route, so it exposes an ',
        inlineCode('informRouteChanged'),
        ' helper, and the parent delegates to that helper on every URL change that resolves to a People route.',
      ),
      infoCallout(
        'Prerequisite',
        'This page builds on the ',
        link(coreSubmodelRouter(), 'Submodels'),
        ' pattern. Read that first if the ',
        inlineCode('Got*Message'),
        ' wrapping convention is unfamiliar.',
      ),
      tableOfContentsEntryToHeader(childHeader),
      para(
        'People declares ',
        inlineCode('ChangedRoute'),
        ' alongside its other Messages. It carries a ',
        inlineCode('PeopleRoute'),
        ': the slice of the App route People handles, not the whole ',
        inlineCode('AppRoute'),
        '.',
      ),
      para(
        'People handles ',
        inlineCode('ChangedRoute'),
        ' in ',
        inlineCode('update'),
        ' like any other Message. It reads the new params out of the route, sets the search input to match, records the search in its history, and returns a ',
        inlineCode('FetchPeople'),
        ' Command so the results match the new query.',
      ),
      para(
        inlineCode('ChangedRoute'),
        ' itself stays internal. Rather than import and dispatch it, the parent calls ',
        inlineCode('informRouteChanged'),
        ', a helper that runs ',
        inlineCode('update(model, ChangedRoute({ route }))'),
        '. The People Submodel can change how it handles a route change without the parent knowing.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.informingSubmodelsChildHighlighted),
          ],
          [],
        ),
        Snippets.informingSubmodelsChildRaw,
        'Copy child code to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      warningCallout(
        'Not an OutMessage',
        inlineCode('ChangedRoute'),
        ' flows from parent to child. It is a normal child Message that the parent triggers through ',
        inlineCode('informRouteChanged'),
        ', not a fact the child surfaces upward. The ',
        link(`${coreSubmodelRouter()}#surfacing-facts`, 'OutMessage'),
        ' pattern goes the other way.',
      ),
      tableOfContentsEntryToHeader(parentHeader),
      para(
        'The parent’s ',
        inlineCode('ChangedUrl'),
        ' handler resolves the URL into a route, stores it on ',
        inlineCode('model.route'),
        ', then branches on the route tag. When the new route is one a Submodel handles, the parent calls that Submodel’s ',
        inlineCode('informRouteChanged'),
        ' and lifts the result the way it lifts any child update: the next child Model goes into its slice, and the child Commands map into ',
        inlineCode('GotPeopleMessage'),
        '. The ',
        inlineCode('ChangedUrl'),
        ' branch and the ',
        inlineCode('GotPeopleMessage'),
        ' branch read almost the same, because both just run People’s ',
        inlineCode('update'),
        ' and lift what comes back.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.informingSubmodelsParentHighlighted),
          ],
          [],
        ),
        Snippets.informingSubmodelsParentRaw,
        'Copy parent code to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      infoCallout(
        'Multiple Submodels',
        'When several Submodels each handle different routes, give ',
        inlineCode('ChangedUrl'),
        ' one ',
        inlineCode('M.tag'),
        ' arm per Submodel. Each arm calls the ',
        inlineCode('informRouteChanged'),
        ' helper of the Submodel that handles that route.',
      ),
      warningCallout(
        'Cold loads',
        inlineCode('informRouteChanged'),
        ' only runs when the URL changes, and a cold load is not a change. The parent’s ',
        inlineCode('init'),
        ' parses the initial URL and calls the Submodel’s ',
        inlineCode('init(route)'),
        ', which seeds the route-derived state and returns the boot Commands the route calls for. See ',
        link(
          `${routingAndNavigationRouter()}#cold-loads`,
          'Cold Loads and the Initial Route',
        ),
        '.',
      ),
      para(
        'The ',
        link(
          exampleDetailRouter({ exampleSlug: 'routing' }),
          'Routing example',
        ),
        ' has the full implementation: a controlled search input, an async-fetched results list, and a recent-searches list, all kept in step with the URL. The ',
        link(routingAndNavigationRouter(), 'Routing & Navigation'),
        ' guide covers the route parser the parent uses to turn URLs into the routes this page assumes.',
      ),
      para(
        'Routing is the common case, but not the only one. Whether a change reaches the parent through the router, a ',
        link(coreSubscriptionsRouter(), 'Subscription'),
        ', or a ',
        link(coreCommandsRouter(), 'Command'),
        ', a Submodel that has to respond to it exposes the same kind of helper. The question is always the same: does the Submodel own the value, or only need to hear that it changed?',
      ),
    ],
  )
}
