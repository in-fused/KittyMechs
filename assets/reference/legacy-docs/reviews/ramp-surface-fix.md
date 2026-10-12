# Ramp walking-surface correction

The actual Pounce route run `20260926-175345-372-6a3ebff1320e4324916f546bff8c90a8-UniversalRoutes.Pounce` passed `south_up`, then failed the unchanged three-second progress check during `south_down` at `(1602.462,-4500,2127.150)` cm. The floor under the capsule was the 2000 cm upper platform. The prior ramp's nominal upper endpoint was 2050 cm; subtracting only 35 cm from its center put its sloped top plane approximately 67 cm above the platform at the seam, exceeding the character's 55 cm step limit.

`KMWorldBuilder::Ramp` now treats both inputs as top-surface positions. For cube thickness 100 cm and slope angle theta, shifting the center vertically by `50 / cos(theta)` puts the rotated top plane through both inputs. The three authored connectors now use these actual floor coordinates:

| Connector | Lower surface endpoint (cm) | Upper surface endpoint (cm) | Slope | Cube center Z (cm) |
| --- | --- | --- | --- | --- |
| South | (-5500,-4500,-10) | (1500,-4500,2000) | 16.0210 degrees | 942.9795 |
| West | (-5500,4500,-10) | (1500,4500,2000) | 16.0210 degrees | 942.9795 |
| North | (8500,11700,-10) | (8500,9000,2000) | 36.6656 degrees | 932.6663 |

The existing 100 cm addition to cube length remains (50 cm per end). Because the vertical center shift also shifts the top-face center backward along the slope, the actual upper top-edge extension is `50 - 50*tan(theta)` along the slope. Its horizontal platform overlap is 34.2585 cm for the western connectors and 10.2495 cm for the northern connector. The resulting maximum top-edge lip is 9.8371 cm and 7.6302 cm respectively, below 55 cm. Ignoring this backward shift gives conservative extension-rise bounds of 13.7995 cm and 29.8572 cm, also below the existing step limit.

An independent Python arithmetic check evaluated the rotated top-plane equation at both endpoints of each slope: residuals were at most 1.14e-13 cm. It also asserted positive top-face overlap and lips below 55 cm. `git diff --check` passed. Width remains 1600 cm; collision, route assertions, entry/arrival tolerances, movement tuning and step height are unchanged. The graybox trim still has no collision.

This is source and geometry arithmetic evidence only. The corrected geometry has not yet been compiled or traversed in Unreal; the next actual Pounce and Bastion runs must establish both-direction capsule traversal. The earlier south-up pass does not certify the changed geometry.
