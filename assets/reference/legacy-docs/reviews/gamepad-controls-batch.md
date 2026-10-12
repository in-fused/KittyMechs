# Gamepad controls: bounded acceptance

Independent source review found no blocking issue in separate keyboard/gamepad maps, same-device conflict swaps, per-device reset, held-action cleanup, fixed stick axes or menu selector refresh. HUD/prompts now obtain current bindings, and Ping/held RouteMap use EnhancedInput. The generated-config save allowlist is limited to the three existing preference classes.

Editor44 built successfully. Reviewed `Artifacts/Validation/Runtime/20260927-045959-272-b3655c21618c4fadbf93eaf063f83569-Input.GamepadRemap`: native Success, zero errors, one warning and launcher acceptance. The receipt/events establish actual simulated EnhancedInput firing into a target, shield/map activation, cessation after rebuilding while keys remained held, ordinary keyboard movement and subsequent release, device-independent Jump/Signature swapping, rejection of reserved/axis/wrong-device inputs, signature activation on the former jump button, and real jump/landing on the remapped and restored-default buttons.

The run records 14 simulated input events and reaches its final stage. Config reload reports logical key `Game` and the exact isolated `User/Saved/Config/WindowsEditor/Game.ini` destination. Executed assertions force-reload the native saved layer, clear/reload CDO maps, and verify a newly spawned unpossessed pawn inherits the changed bindings. The retained final config contains empty custom maps because the later independent-default resets succeeded; it is not a retained snapshot of the intermediate remap. Persistence acceptance relies on the passing disk/reload/new-instance assertions and recorded destination, not on claiming the final empty file contains the remap.

Earlier runs remain distinct failures:

- `20260927-044829-589-d6d5a97ad17749018797584bff5d86ea-Input.GamepadRemap`: pre-map isolation guard incorrectly treated UE5.8's logical `Game` key as a filename. The correction resolves and verifies the actual branch destination.
- `20260927-045538-493-ef4e6766ca784032b5a09ef03cd12260-Input.GamepadRemap`: real input stages passed, but no generated config was written. The narrow three-section production save allowlist corrected this persistence issue.
- `20260927-045744-627-89a85c13123d443d8b906fc798a6e4ea-Input.GamepadRemap`: reload assertion failed despite file creation. A stale compiled reload-key initialization was suspected, but its cause is not proven. The fresh Editor44 run records matching key/path and passes; the earlier failure is not relabelled.

Accept this isolated standalone PIE input/persistence result. The fixture freezes one original enemy, creates/repositions one high-health stationary weapon target and spawns one unpossessed inheritance-check pawn; it does not teleport or heal the player. This is not a physical-controller test, rendered selector/HUD acceptance, natural combat test, cross-process restart proof or network/packaged validation. Package13 is a separate gate.
