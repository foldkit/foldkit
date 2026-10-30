import { Block } from 'foldkit'
import type { CalendarDate } from 'foldkit/calendar'
import type { HtmlBuilder } from 'foldkit/html'
import type { Url } from 'foldkit/url'

import type { CodeBlock } from '../../component'
import type { RenderHeadingLink } from '../../prose'
import type { Page } from './domain/domain'
import { Message } from './message'
import { Model } from './model'
import { FetchVirtualListChatHistory } from './virtualListChat'

export type UiArgs = Readonly<{ today: CalendarDate }>

/** What the Ui Block renders: a documentation page, or the chat demo the
 *  Foldkit 0.167 release post embeds. */
export type UiView = Page | 'Release0167ChatDemo'

export type UiViewInput = Readonly<{
  page: UiView
  url: Url
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>

export class Ui extends Block<Ui, UiArgs, UiViewInput>()('Ui', {
  Model,
  Message,
  Command: [FetchVirtualListChatHistory],
}) {}

export type UiViewBuilder = HtmlBuilder<Message, unknown>
