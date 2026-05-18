---
'foldkit': patch
---

Disable clearing history while time-travel is paused. The devtools overlay hides the "Clear history" button until you resume, and the underlying store treats clear as a no-op when paused. Previously, clearing while paused wiped the message entries the paused snapshot was being replayed from, leaving the runtime stuck on a historical state with no path back to live.
