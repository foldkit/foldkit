import type { ButtonViewBuilder } from './builder'

export const renderButton = (h: ButtonViewBuilder) =>
  h.button([h.Attribute('onclick', 'save()')])
