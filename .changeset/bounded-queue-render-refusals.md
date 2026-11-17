---
'foldkit': patch
---

Fix DOM updates being postponed indefinitely while a sustained stream of Messages exhausts the processing budget before each render opportunity.

Animation frames and asynchronous ViewTransition update callbacks share an allowance of three queue-related refusals. The next blocked opportunity processes the finite prefix of Messages already queued, including controlled-input changes, then commits plainly. A selected or pending ViewTransition can be skipped for this commit. Messages enqueued during catch-up wait for their posted task.

Catch-up is finite in Message count, not CPU time. A large or expensive prefix can occupy a long task, and the refusal bound does not guarantee a wall-clock or browser-paint deadline.
