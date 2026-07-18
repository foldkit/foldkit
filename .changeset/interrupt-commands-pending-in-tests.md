---
'foldkit': patch
---

Allow Interrupt Commands to stay pending across Messages in Story and Scene, matching the existing exemption for keyed Commands. A story can now keep sending Messages (for example further keystrokes) while a cancellation is in flight, resolving the Interrupt when the test is ready. Interrupt Commands must still be resolved by the end of the test.
