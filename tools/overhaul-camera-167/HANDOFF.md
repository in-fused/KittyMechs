# Camera167 CLOSED source candidate

The input wheel always wrote `settings.cameraDistance`, while the Pounce preview camera read a separate `felineCameraDistance`. That made normal wheel zoom ineffective for the preview and changing models silently selected a different saved distance.

Both routes now read the canonical cameraDistance and share one settings slider. Model toggles preserve the current distance. Saved canonical values take precedence; old preview-only saved values migrate if no canonical value exists. The legacy property remains a mirrored alias for existing saved settings/tools. Bounds6..18, aiming multiplier, body fitting/occlusion, controls and model ownership are unchanged. Settings now explain scrolling and retained distance.

Actual store migration/update check passed via Node/tsx. It covers canonical and legacy-only settings and unchanged wheel-setting updates across toggles; it does not certify rendered visibility or dispatch a mouse wheel. Production typecheck/build and one actual browser wheel/default-view/toggle check must occur during root integration after164 closes. Severe human Lowest lag remains unresolved; no camera or performance qualification is claimed.

Root source candidate only, no build/browser/server job. Three production preimages are preserved. Independent source review required before public gate. Full finite goal incomplete. Writer CLOSED after source seal; no edits after closure.
