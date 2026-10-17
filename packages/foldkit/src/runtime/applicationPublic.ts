import { makeApplication, makeElement } from './application.js'
import { makeDefine } from './applicationAuthoring.js'

export type { Application, Element, PendingApplication } from './application.js'
export type {
  Composition,
  Definition,
  ViewBuilderFor,
} from './applicationAuthoring.js'

/**
 * Defines a passive Application authoring value with contextual Model and
 * Message types. Use `import { defineApplication } from 'foldkit'` or
 * `import { define } from 'foldkit/application'`. Establish its graph with
 * makeComposition, then complete it with makeApplication or makeElement.
 *
 * Definition and completion perform configuration validation. Runtime.run or
 * Runtime.embed constructs the selected Layers and starts effects later.
 */
export const define = makeDefine({
  makeApplication,
  makeElement,
})
