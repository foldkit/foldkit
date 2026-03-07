import type { Html } from 'foldkit/html'

import { Class, div, p } from '../html'
import type { TableOfContentsEntry } from '../main'
import {
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../prose'

const theArchitectureProblemHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-architecture-problem',
  text: 'The Architecture Problem',
}

const powerThroughConstraintsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'power-through-constraints',
  text: 'Power Through Constraints',
}

const readableByDesignHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'readable-by-design',
  text: 'Readable by Design',
}

const buildYourProductHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'build-your-product',
  text: 'Build Your Product, Not Your Architecture',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  theArchitectureProblemHeader,
  powerThroughConstraintsHeader,
  readableByDesignHeader,
  buildYourProductHeader,
]

export const view = (): Html =>
  div(
    [],
    [
      pageTitle('manifesto', 'Manifesto'),
      tableOfContentsEntryToHeader(theArchitectureProblemHeader),
      para(
        'Most frontend frameworks solve rendering and leave the rest to you. Where does state live? How do side effects work? How are errors handled? Those are your problems. The framework doesn\u2019t have an opinion.',
      ),
      para(
        'The consequence is predictable. Every team builds a custom architecture from whatever libraries and patterns seem right at the time. State scatters across hooks, contexts, stores, and URL params. Side effects hide in callbacks, middleware, and dependency arrays. Conventions vary project to project, and the accepted best practices shift every couple of years.',
      ),
      para(
        'This is why large, well-architected React codebases are vanishingly rare. Building and maintaining a large React application requires that one or two Staff-level people have a strong, bespoke architectural vision, make that vision clear to all contributors, and enforce alignment to it over years. This is not the norm.',
      ),
      para(
        'React isn\u2019t bad. It\u2019s great. It\u2019s also insufficient.',
      ),
      para(
        'What if the framework itself was the architecture? What if there were no decisions to make? Not because someone took them away, but because the right answer was the only answer. What if you never had to ask, "Which state management library do we use?" or "How do we wire streams into our UI?" and instead asked, "How do we model this domain? How should this feature behave?" What if architecture was solved, and the only questions left were about your product?',
      ),
      para('That\u2019s Foldkit.'),
      tableOfContentsEntryToHeader(powerThroughConstraintsHeader),
      para(
        'Every Foldkit app has the same architecture. Not by convention. By design.',
      ),
      para(
        'State lives in the Model. Events are Messages. Every state change flows through update. Side effects are managed by Commands. Ongoing streams are Subscriptions. This isn\u2019t a recommendation. It\u2019s the only path. You can\u2019t scatter state across components because there are no component-local state hooks. You can\u2019t hide side effects in the view because the view is a pure function.',
      ),
      para(
        'This might sound limiting. It\u2019s the opposite. When architectural decisions are off the table, development gets more interesting. The questions shift from plumbing to modeling. Not "Where do we put this side effect?" but "What Commands does this Message produce?" Not "How do we manage loading states across components?" but "What does our Model look like when data is loading, loaded, or failed?"',
      ),
      para(
        'You spend your time in the domain, the layer where your app is actually different from every other app, instead of the accidental complexity of wiring libraries together.',
      ),
      tableOfContentsEntryToHeader(readableByDesignHeader),
      para(
        'Any developer can walk into any Foldkit app and immediately know where to look. All state is in the Model. All events are Messages. All transitions are in update. All side effects are managed by Commands. This isn\u2019t a claim about team discipline or code review. It\u2019s a structural guarantee. The architecture makes it impossible to organize your app in a way that\u2019s opaque to a new reader.',
      ),
      para(
        'No other TypeScript framework can make this claim. Most frameworks are readable if the team is disciplined. Foldkit apps are readable by construction.',
      ),
      para(
        'The same property that makes Foldkit apps legible to new developers makes them legible to AI. When patterns are predictable and explicit (one state tree, one update loop, typed everything), AI assistants produce reliable code without constant correction. This isn\u2019t a feature designed for AI. It\u2019s a natural consequence of the architecture.',
      ),
      tableOfContentsEntryToHeader(buildYourProductHeader),
      para(
        'Frontend development should be about solving domain problems, not architectural ones. The years spent debating state management, choosing libraries, and enforcing conventions are years not spent on your product.',
      ),
      para(
        'Foldkit models the frontend so you can model your domain. State, events, transitions, effects, streams. All accounted for. All typed. All in one place.',
      ),
      para(
        'The architecture is solved. The only questions left are about your product. Now go build something cool.',
      ),
      div(
        [Class('mb-4')],
        [p([], ['See you on GitHub,']), p([], ['Devin Jameson'])],
      ),
    ],
  )
