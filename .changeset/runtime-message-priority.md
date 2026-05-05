---
'foldkit': patch
---

Prioritize input-derived Messages over chain-derived Messages so user input lands ahead of streamed work. Within each Message-processing batch, the runtime now drains all input-derived Messages (view dispatch, navigation, subscription events, managed-resource events, external dispatchers) before any Command result. Keeps tab clicks, key presses, and other interactions feeling native even when a high-rate stream is running. FIFO order is preserved within each priority class.
