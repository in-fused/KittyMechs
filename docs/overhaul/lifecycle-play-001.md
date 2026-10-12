# Ordinary lifecycle 001 — incomplete

Two normal UI/keyboard clients on build005 completed WEST RELAY (snapshot time55.9). The run deliberately left both pilots stationary after ordinary navigation, with no HP/death/input/state injection. It intended to observe all-down failure, a normal third late join and fresh E checkpoint retry.

The exposure did not produce failure within its 40-wall-second bound. At simulation time101.9667 the host at (0.686, 0.940, -38.385) and guest at (4.297, 0.940, -39.042) both had220HP; co-op remained active, attempt1. The run ended INCOMPLETE with `Bounded ordinary all-down exposure did not fail mission` and zero page errors. This establishes no late-join/retry behavior, and is not evidence that failure is broken: native enemy line of sight/engagement at those coordinates was never established.

Evidence is retained in `.sites-runtime/overhaul-20261009/lifecycle-001/`: evidence/progress JSON, failure PNG and both uncut WebMs. Do not silently increase the wait or force lethal state. The next bounded pilot policy must establish an actual exposed encounter through ordinary navigation and verify source LOS before relying on it. Native lifecycle assertions remain separate from ordinary-play acceptance.
