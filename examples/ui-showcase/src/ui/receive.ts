import { MobileMenuDialogBinding, UiComposition } from './composition'

export const receive = UiComposition.makeReceive({
  RequestedOpenMobileMenu: MobileMenuDialogBinding.requestOpen(),
  RequestedCloseMobileMenu: MobileMenuDialogBinding.requestClose(),
})
