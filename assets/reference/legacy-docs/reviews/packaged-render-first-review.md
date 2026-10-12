# First live-world packaged render: independent review

Reviewed 2026-09-26 by the independent critic. Disposition: **technical render smoke accepted; opening-view readability requires revision before M0 presentation acceptance.** This is not final art, gameplay, network, or performance approval.

## Evidence

- Package build: `Artifacts/Validation/package-02.log`, ending in `BUILD SUCCESSFUL` and AutomationTool exit code 0.
- Render run: `Artifacts/Validation/RenderSmoke/20260926-182214-556-0efd16afb0c2463bb048c10e46b6ef56/` (`render-smoke.png`, `acceptance.json`, `render.log`, and the isolated engine receipt).
- The actual PNG was visually inspected at 1920 × 1080. Its SHA-256 was independently recomputed: `9EADA88E8FD055DD59D5DCEED18D0901A70D7795EBC06B683808ABB21F57CBF9`, matching the wrapper receipt.
- Packaged executable SHA-256 recorded by the wrapper: `55ACDD66CBE859D7D8EBB6BAF509DE65BBA17A4E44EAECB992C8C6DD8031410E`.
- Receipt reports D3D11, capture after 5.033 world seconds / 5.067 wall seconds, and graceful exit after 10.008 world seconds / 10.043 wall seconds. The request log records controller tick 291; the receipt's 577 ticks describe the exit point, not the capture warmup. Process exit code was 0.
- The checked log patterns found no material-usage warnings. The wrapper decoded the image and observed 49 sampled colors; this alone is only a technical image check. Visual inspection supplies the separate world-content judgment below.

## Visual judgment

The earlier all-black world symptom is absent in this run: the graybox pawn, pale ground, shadows, and HUD are clearly rendered. This establishes a working live-world capture after genuine world time advances. It does not isolate the original cause, because lighting/material changes and the capture timing changed together.

The opening camera faces a very large, almost black upper-district wall that occupies most of the upper image. The view offers little visible navigable space beyond the foreground, and neither coast nor connected ramps establishes a clear first route. Tiny relay labels on dark geometry do not replace visible route landmarks. This fails the intended M0 opening-view readability even though the renderer is functioning.

Reorient the actual spawn/controller camera toward the first relay and open lower-coast route, then repeat the same live-world capture. Check skylight capture and ambient contribution separately: additional fill may reveal surface shape, but cannot solve the obstructed framing by itself. Acceptance should show an obvious accessible direction, a recognizable objective landmark, readable separation between ground and structures, and the player's normal camera rather than a special presentation camera.

HUD bars and colors read, but the mission line, relay labels, and control labels are small at 1080p. Review text size and hierarchy in the actual game view; the current screenshot does not establish accessibility or comfortable reading at normal viewing distance.

The pawn remains the expected graybox representation. Imported Pounce/Bastion art is still disabled pending separate animation, orientation, and fit evidence; this screenshot is not evidence of an asset-import regression.

## Limits

This bounded, stationary, offscreen standalone run proves a rendered packaged frame, isolated output paths, and graceful completion of the diagnostic. It proves no player-input response, traversal, combat, complete mission, multiplayer behavior, frame-rate target, or sustained runtime stability. Controller tick counts divided by elapsed time must not be presented as a GPU/performance benchmark. No M2 or AAA visual-quality claim is supported.

## Deployment-facing recovery review

The initial migration's positional `unreal.Rotator(0, yaw, 0)` used the Python factory's argument order incorrectly. This critic's earlier source approval missed that error. The first attempt saved the wrong transform before detecting failure; root retained its failure receipt as `Artifacts/Validation/deployment-view-01-failed.json` and independently audited the saved transform in `deployment-view-audit.json`: pitch -37.568588, yaw 180, roll 180.

The revised script uses explicit `pitch=0.0, yaw=yaw, roll=0.0`, checks all three actual axes before saving, and only permits the original/desired facing or that specific normalized failed transform at the known generated PlayerStart location. Unknown authored transforms remain rejected. Actual correction receipt `deployment-view.json` reports `saved_pending_render` and actual/new rotation (0, -142.431411743, 0). This is evidence of the save call and actor transform; a fresh rendered process must still confirm persisted facing and useful composition.

## Subsequent EditorGame iteration

Actually viewed `Artifacts/Validation/RenderSmoke/20260926-183437-001-bb341e9333e944c08fd21f81bb882461/render-smoke.png`. This is explicitly Editor `-game` evidence, not an updated packaged build. Surfaces now have visible blue ambient fill and the larger HUD is easier to read, but the nearby service-station wall still dominates the camera at yaw -142.43. White/cyan text against the bright sky and ground has weak contrast. Opening composition remains unaccepted.

Source review accepts the next guarded deployment yaw 180 toward the open street, with wrapped-angle comparisons and the same before-save all-axis checks. The narrow HUD revision adds measured dark text backplates and reserves scaled header/lower-panel margins for objective markers. These are approved for the next actual render, not visually accepted in advance.

## Open-street view and HUD: bounded visual acceptance

Actually viewed `Artifacts/Validation/RenderSmoke/20260926-185212-899-ab9479f95e7c4d1d887806a77dab8a04/render-smoke.png`. At 1920 × 1080 and default UI scale, the new opening view shows open ground ahead, a visible ramp on the left, and the station to the right instead of blocking the entire forward view. Dark text panels make the mission, objective markers, abilities and pickup information legible against bright surfaces. No overlapping panels are visible in this frame. **Accept this as M0 opening-view readability at this tested setting**, not polished environmental art or accessibility certification.

Receipt identifies `editor_game_not_packaged`, D3D11, exit code 0 and menu closed. Capture occurred at 5.025 world seconds / 14.034 wall seconds; exit at 10.012 world seconds / 19.516 wall seconds. The substantial wall/world difference must not be presented as seamless performance evidence. Recorded PNG SHA-256 is `A3DB5D40CA18A1F800E9F54C0732166FAACFDB1EAF951DA4C5F16AA136ACB600`.

Maximum UI scale and other viewport sizes remain unreviewed, as do moving/overlapping markers, interaction/downed prompts and actual objective approach. This EditorGame result does not update the packaged build's visual acceptance automatically; a later package must include the changes. The scene is still a sparse graybox with placeholder geometry and pilots, not M2 or AAA art.

## Maximum UI scale: two additional static layouts

Actually viewed the PNGs in `RenderSmoke/20260926-190443-703-5325409d1abe4aee8bb65335da09b38f` (1920 × 1080) and `RenderSmoke/20260926-190843-457-4cfb56d03f9641ef9bf369ef0fd1166f` (1280 × 720), both under `Artifacts/Validation/`. Runtime receipts confirm `ui_scale=1.500000`, D3D11 and the requested dimensions.

Text and backplates remain inside the viewport; mission and objective labels are readable, and the central crosshair stays clear. At this maximum setting the left status panel visibly covers part of the pawn, especially at 720p. Accept these two stationary layouts as functional M0 maximum-scale configurations with that space tradeoff; this is not proof of marker separation during movement or visibility during combat. Interaction/downed prompts, other aspect ratios and packaged inclusion remain separate checks.
