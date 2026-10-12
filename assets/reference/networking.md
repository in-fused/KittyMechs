# Two-player sessions

`UKMNetworkSubsystem` is an automatically created game-instance subsystem. It owns session operations across level travel. The default provider is Online Subsystem Null for LAN discovery. Online mode explicitly selects EOS and fails visibly if EOS is unavailable; it does not silently start a LAN session.

## UI integration

Retrieve `GetGameInstance()->GetSubsystem<UKMNetworkSubsystem>()`. Set `bUseLAN=true` for LAN; use `HostSession()`, `FindSessions()`, then `JoinSession(index)`. Display `GetFoundSessionCount()`, `GetFoundSessionLabel(index)`, `GetStatusText()`, and `IsBusy()`. Bind `OnStatusChanged` for refresh. `LeaveSession()` destroys the named session and returns to the local offline map. The controller's direct-IP action routes through `JoinAddress(address)` in this same subsystem: it validates an IPv4 address or ASCII hostname with an optional port, destroys any existing named session before connecting, and uses the same busy state, travel timeout, and failure recovery. Missing ports use Unreal's configured URL default; every accepted address becomes explicit `unreal://host:port` (using the configured Unreal protocol) and passes Unreal `FURL` checks for the intended remote host, port, and absence of options. Thus a single-label name such as `RainlineReach` becomes a network hostname rather than a request to load that local map. IPv6 and Unreal URL/map options are not accepted by this field.

For EOS, configure the plugin and transport externally, call `LoginOnline()` from an explicit user action, and then host or search. Login uses Epic's Account Portal; it does not collect passwords or automate account setup. `LoginOnline()` selects online mode. LAN may be reselected only after leaving any existing session.

Sessions advertise two public connections, RainlineReach, and KittyMech protocol version 1. Discovery excludes incompatible or full sessions. Creating, finding, joining, destroying, and signing in use provider completion delegates; callbacks are cleared on completion and subsystem shutdown. A watchdog bounds unanswered requests. Hosting an existing named session destroys it before creating another.

## Configuration and current limits

The repository defaults to `DefaultPlatformService=Null`. EOS product, sandbox/deployment access, supported authentication settings, artifact configuration, and an EOS-compatible net driver must be configured using Unreal's settings before online testing. Keep credentials outside source control. No product has been provisioned and no credentials are included here. The adapter does not certify that merely enabling the plugin establishes working internet P2P.

Follow Epic's [OSS EOS setup and authentication documentation](https://dev.epicgames.com/documentation/unreal-engine/online-subsystem-eos-plugin-in-unreal-engine) and [maintained example project](https://github.com/EpicGames/EOS-Getting-Started/tree/main/OnlineSubsystemEOS). Session callbacks use Unreal's [IOnlineSession interface](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/OnlineSubsystem/IOnlineSession).

Network/travel failures preserve a user-visible status and return to RainlineReach offline. The host's checkpoint remains on its own disk. Guests do not receive or take ownership of the host's checkpoint; returning offline resumes that guest device's own existing local save, if any. There is no host migration. If the offline map itself fails to load, automatic retry stops with an actionable message.

Internet connectivity, two-machine discovery, account permissions, NAT traversal, and latency/loss behavior are **unverified** until packaged builds can run on both PCs. Raw direct-IP hosting is not an EOS session and does not appear in subsystem discovery.

## Acceptance checks

1. Package identical builds on both Windows PCs; host LAN on one and find/join from the other. Verify two-player limit and a third join rejection.
2. Confirm shared damage/objectives/checkpoints, then disconnect the guest and reconnect through fresh discovery.
3. Close the host process: the guest sees a disconnect explanation, returns offline, and does not import the former host's save.
4. Exercise empty search, stale/full results, repeated host requests, switching modes with an active session, leave/rehost, unavailable provider, and missing map recovery.
5. Configure EOS outside Git; sign in through Account Portal on separate approved accounts and verify discovery/join across separate networks.
6. Test 50/100/150 ms latency and 1/2/3% packet loss, including host departure during create/join/travel. Validate that delegates do not fire against torn-down UI objects and no request leaves the UI permanently busy.
