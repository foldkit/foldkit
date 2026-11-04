import { ApplicationComposition, CatalogBinding } from './composition.js'

export const refreshCatalog = CatalogBinding.requestRevalidationOrLoad()
export const update = ApplicationComposition.makeUpdate({
  ClickedRefresh: refreshCatalog,
})
