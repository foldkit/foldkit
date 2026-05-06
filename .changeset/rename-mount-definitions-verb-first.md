---
'foldkit': minor
---

Rename Mount Definitions and their result Messages to verb-first imperatives, mirroring how Commands are named. Mount Definitions are imperative instructions to the runtime ("when this element mounts, do X"), so the verb leads. Result Messages mirror the new Definition name in past tense.

Mount renames per component:

- Tooltip: `TooltipAnchor` → `AnchorTooltip`
- Popover: `PopoverAnchor` → `AnchorPopover`; `PopoverBackdropPortal` → `PortalPopoverBackdrop`
- Menu: `MenuAnchor` → `AnchorMenu`; `MenuBackdropPortal` → `PortalMenuBackdrop`
- Listbox: `ListboxAnchor` → `AnchorListbox`; `ListboxBackdropPortal` → `PortalListboxBackdrop`
- Combobox: `ComboboxAnchor` → `AnchorCombobox`; `ComboboxAttachPreventBlur` → `AttachComboboxPreventBlur`; `ComboboxAttachSelectOnFocus` → `AttachComboboxSelectOnFocus`; `ComboboxBackdropPortal` → `PortalComboboxBackdrop`

Result Messages now disambiguate per component instead of sharing a generic name. For example, `CompletedAnchorMount` becomes `CompletedAnchorPopover`, `CompletedAnchorMenu`, `CompletedAnchorListbox`, etc., depending on the component. The same pattern applies to `CompletedBackdropPortal` (now `CompletedPortalPopoverBackdrop`, `CompletedPortalMenuBackdrop`, etc.) and the Combobox attach completions.

Scene tests that called `Scene.Mount.resolve(PopoverAnchor, CompletedAnchorMount())` should update to `Scene.Mount.resolve(AnchorPopover, CompletedAnchorPopover())`. The acknowledgement helper pattern is unchanged; only the names move.
