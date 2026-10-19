import type { Attribute, HtmlBuilder } from 'foldkit/html'

type AccessibleNameConfig = Readonly<{
  ariaLabel: string | undefined
  ariaLabelledBy: string | undefined
  fallbackLabelId: string
}>

export const accessibleNameAttributes = <Message>(
  config: AccessibleNameConfig,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Attribute<Message>> => {
  if (config.ariaLabel !== undefined) {
    return [h.AriaLabel(config.ariaLabel)]
  } else if (config.ariaLabelledBy !== undefined) {
    return [h.AriaLabelledBy(config.ariaLabelledBy)]
  } else {
    return [h.AriaLabelledBy(config.fallbackLabelId)]
  }
}
