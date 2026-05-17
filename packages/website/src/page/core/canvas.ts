import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import {
  apiModuleRouter,
  coreSubscriptionsRouter,
  exampleDetailRouter,
} from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const shapesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'shapes',
  text: 'Shapes',
}

const animationAndInputHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'animation-and-input',
  text: 'Animation and input',
}

const fullApiSurfaceHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'full-api-surface',
  text: 'Full API surface',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  shapesHeader,
  animationAndInputHeader,
  fullApiSurfaceHeader,
]

const canvasApiHref = apiModuleRouter({ moduleSlug: 'canvas' })

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('core/canvas', 'Canvas'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'The ',
        inlineCode('Canvas'),
        ' module is a declarative 2D rendering surface. ',
        inlineCode('Canvas.view'),
        ' produces a ',
        inlineCode('<canvas>'),
        ' VNode whose pixels are a pure function of a ',
        inlineCode('shapes'),
        ' prop: same shapes, same pixels. Because the view function is pure and the runtime re-paints on every patch, DevTools time-travel reproduces past frames exactly.',
      ),
      para(
        'Reach for it for pixel art, board games, card games, 2D puzzlers, generative art, charts, and dataviz. The ',
        link(
          exampleDetailRouter({ exampleSlug: 'canvas-art' }),
          'canvas-art example',
        ),
        ' demonstrates the API end-to-end with a click-to-spawn bouncing-balls scene.',
      ),
      tableOfContentsEntryToHeader(shapesHeader),
      para(
        'A scene is a ',
        inlineCode('ReadonlyArray<Shape>'),
        '. Each ',
        inlineCode('Shape'),
        ' is a tagged variant: ',
        inlineCode('Rect'),
        ', ',
        inlineCode('Circle'),
        ', ',
        inlineCode('Path'),
        ', ',
        inlineCode('Text'),
        ', or ',
        inlineCode('Group'),
        '. ',
        inlineCode('Group'),
        ' wraps children in a 2D transform (',
        inlineCode('translate'),
        ', ',
        inlineCode('rotate'),
        ', ',
        inlineCode('scale'),
        ', ',
        inlineCode('opacity'),
        ') and composes recursively. ',
        inlineCode('Path'),
        ' is built from a sequence of ',
        inlineCode('PathInstruction'),
        ' values: ',
        inlineCode('MoveTo'),
        ', ',
        inlineCode('LineTo'),
        ', ',
        inlineCode('QuadTo'),
        ', ',
        inlineCode('BezierTo'),
        ', ',
        inlineCode('Close'),
        '.',
      ),
      tableOfContentsEntryToHeader(animationAndInputHeader),
      para(
        'For continuous animation, pair ',
        inlineCode('Canvas.view'),
        ' with ',
        link(
          `${coreSubscriptionsRouter()}#animation-frames`,
          'Subscription.animationFrame',
        ),
        ': a helper that emits a Message every ',
        inlineCode('requestAnimationFrame'),
        ' tick with the inter-frame delta in milliseconds. update advances the Model in response, and ',
        inlineCode('Canvas.view'),
        ' re-renders whenever the Model changes (Foldkit batches renders to one per frame).',
      ),
      para(
        'Pointer handlers are config args on ',
        inlineCode('Canvas.view'),
        ': ',
        inlineCode('onPointerDown'),
        ', ',
        inlineCode('onPointerMove'),
        ', ',
        inlineCode('onPointerUp'),
        '. Each receives a ',
        inlineCode('Point'),
        ' already translated into the canvas’s internal coordinate space (the ',
        inlineCode('width'),
        ' and ',
        inlineCode('height'),
        ' you passed), regardless of how the canvas is sized in CSS.',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippets.canvasBasicHighlighted)],
          [],
        ),
        Snippets.canvasBasicRaw,
        'Copy Canvas example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(fullApiSurfaceHeader),
      para(
        'The ',
        link(canvasApiHref, 'Canvas API reference'),
        ' lists every shape constructor, the ',
        inlineCode('PathInstruction'),
        ' variants, and ',
        inlineCode('Canvas.view'),
        ' with full signatures.',
      ),
    ],
  )
}
