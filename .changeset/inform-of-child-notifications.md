---
'foldkit': minor
'@foldkit/ui': minor
'create-foldkit-app': patch
---

**Breaking:** Generate `informOfX` from `InMessage.InformedOfX`, retaining the preposition at the parent call site. Rename calls such as `ChildBinding.informRouteChange(payload)` to `ChildBinding.informOfRouteChange(payload)`. `RequestedX` still generates `requestX`. InMessage tags, payloads, defaults, synchronous routing, and output requirements are unchanged; the former generated method names are removed.

UI's explicit notification operations follow the same convention: Calendar and DatePicker expose `informOfMinDateChanged`, `informOfMaxDateChanged`, `informOfDisabledDatesChanged`, and `informOfDisabledDaysOfWeekChanged`; Tooltip exposes `informOfShowDelayChanged`; VirtualList exposes `informOfItemsChanged` and `informOfHistoryPrepended`. Their arguments and behavior are unchanged, and the former spellings are removed. Slider's generated range notification is `informOfRangeChange`.

Update active examples, scaffold guidance, skills, and migration documentation to use the new spellings. Workspace now names partial save and move responses explicitly and informs its Notification Center of issue comments and assignments rather than wrapping both in generic activity.
