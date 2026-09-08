import { Option, Record } from 'effect'
import { Html, inertHtml as ih } from 'foldkit/html'

import { type CodeBlock } from '../component'
import type { RenderHeadingLink } from '../prose'

// SLOTS

/**
 * Live demos a page embeds, keyed by the names on its `::Demo{name}` islands.
 * A record over the page's declared names rather than a string-keyed map, so a
 * missing or misspelled key is a type error where the page builds it instead of
 * a demo that silently renders nothing.
 */
export type Demos<Name extends string> = Readonly<globalThis.Record<Name, Html>>

/**
 * Wraps one `:::Faq` island's rendered children in the page's collapsible shell.
 * The page supplies this because the open state and the toggle Message belong to
 * the page's own Model, which the shared island views cannot reach.
 */
export type RenderFaq = (
  id: string,
  question: string,
  content: ReadonlyArray<Html>,
) => Html

/** What a page contributes to its own markdown beyond the prose itself. */
export type Slots<DemoName extends string> = Readonly<{
  demos: Demos<DemoName>
  renderFaq?: RenderFaq
  /**
   * Controls the page does not own but its markdown renders: the SnippetCopy
   * Submodel button and the heading copy-link. The boundary that owns those
   * behaviors constructs the renderers. A page embedded with `h.submodel`
   * receives them from its parent through `viewInputs`, so each control keeps
   * dispatching through its actual owner rather than the page's boundary.
   */
  renderCopyButton: CodeBlock.RenderCopyButton
  renderHeadingLink: RenderHeadingLink
}>

/**
 * Resolves a `::Demo` island to the demo the page built for it. {@link Slots}
 * makes a page supply every name it declares, so a page cannot leave one of its
 * own demos out. A name the markdown invents anyway renders nothing, which the
 * `::Demo` registration test is there to catch.
 */
export const resolveDemo = (slots: Slots<string>, name: string): Html =>
  Option.getOrElse(Record.get(slots.demos, name), () => ih.empty)

/**
 * Renders a `:::Faq` island. Without a page-supplied shell the question becomes
 * a bold line above its answer, matching what the page itself renders for an id
 * its Model does not track.
 */
export const renderFaqSection = (
  slots: Slots<string>,
  id: string,
  question: string,
  content: ReadonlyArray<Html>,
): Html =>
  slots.renderFaq === undefined
    ? ih.div([], [ih.p([ih.Class('font-bold')], [question]), ...content])
    : slots.renderFaq(id, question, content)
