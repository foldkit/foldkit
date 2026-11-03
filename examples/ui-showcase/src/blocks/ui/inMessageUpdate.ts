import { MobileMenuDialogBinding, UiComposition } from './composition'

export const inMessageUpdate = UiComposition.makeInMessageUpdate({
  RequestedOpenMobileMenu: MobileMenuDialogBinding.requestOpen(),
  RequestedCloseMobileMenu: MobileMenuDialogBinding.requestClose(),
})
