# Shared HTML definitions evidence: 2026-11-07

This directory retains the complete isolated #1585 shared-definition and overlapping #1575 direct-constructor experiment. It contains all 72 ordinary Runtime samples, functional preflight logs, input and cleanup receipts, host snapshots, driver files, runnable recipes and the isolated candidate patch.

The exact artifact result is a 12,779-byte raw reduction in both benchmark variants. The ordinary Runtime batch demonstrated neither a regression nor a speedup. Duplicate-baseline variation exceeded the paired median deltas; without a predeclared equivalence threshold or interval, the batch does not prove equivalence or exclude smaller effects.

The recipes preserve their original frozen absolute paths as execution evidence. Relocating them requires retargeting the workspace root while preserving each twin's self-contained Foldkit and plugin links. The candidate patch is evidence only and has not been applied to shared production source.
