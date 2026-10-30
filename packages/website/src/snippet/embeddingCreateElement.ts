import { Program } from 'foldkit'

import { Widget, WidgetLive } from './embeddingOutboundCommand'
import { Flags, ports } from './embeddingPorts'

export const createElement = (container: HTMLElement) =>
  Program.makeElement(Widget, {
    layer: WidgetLive,
    Flags,
    ports,
    container,
  })
