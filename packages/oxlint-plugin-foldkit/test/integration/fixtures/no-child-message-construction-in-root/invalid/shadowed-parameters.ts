import { ApplicationComposition } from './rootApplication'

type Parameters<Value> = Value

type PretendRootHtmlBuilder = Parameters<
  Parameters<typeof ApplicationComposition.makeView>[0]
>[1]

export const pretendRootView = (h: PretendRootHtmlBuilder) =>
  h.button([
    h.OnClick(ApplicationComposition.Message.ClickedFromShadowedParameters()),
  ])
