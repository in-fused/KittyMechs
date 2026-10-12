# Mission012 ordinary input/transport receipt



Build008 client on plain production8790/session84775. Input diagnostics only; original authority/policy/flood/parser unchanged. Normal independent browser UI and keyboard,1440x900, retained uncut host/guest videos. Status INCOMPLETE; no page errors.



Error: MissionHost route did not advance at {"x":-7.427172264836754,"y":0.9400999697099178,"z":-31.83538444346783}



- two client staging: native tick1188, time19.8000

- staging rest: native tick1250, time20.8333

- route {"x":-8,"z":12}: native tick1619, time26.9833

- visible squad encounter overhaul-street-scout MissionHost round 0: native tick2510, time41.8333

- route {"x":-4,"z":-8}: native tick2992, time49.8667

- route {"x":-4,"z":-21}: native tick3735, time62.2500

- route {"x":-4,"z":-27}: native tick4312, time71.8667

- visible squad encounter bot-0 MissionGuest round 0: native tick4709, time78.4833

- visible squad encounter bot-0 MissionHost round 1: native tick4816, time80.2667

- visible squad encounter bot-0 MissionGuest round 2: native tick4928, time82.1333

- visible squad encounter bot-0 MissionGuest round 3: native tick5068, time84.4667

- visible squad encounter bot-0 MissionHost round 0: native tick5175, time86.2500

- failure: native tick5217, time86.9500



## Before-release failure receipt



Target {"x": -10, "z": -34}; desired {"forward": 0.6759059601970134, "strafe": -0.7369878784418054, "yaw": 0.042749999094009644}

host: playing=playing; held=['KeyW', 'KeyA']; browser={"focused": true, "visibility": "visible", "activeElement": {"tag": "BODY", "id": "", "role": null, "editable": false}, "pointerLock": {"tag": "CANVAS", "id": "", "role": null, "editable": false}}; native={"tick": 5217, "lastInput": 6675, "aimYaw": 0.5350399995038093, "aimPitch": -0.023890363331884153, "velocity": {"x": -4.474860910714063e-75, "y": 0, "z": -4.451188474437108e-75}, "position": {"x": -7.427172264836754, "y": 0.9400999697099178, "z": -31.83538444346783}}; successfulsend={"input": {"seq": 6850, "jumpId": 0, "jumpCancel": 0, "jumpEpoch": 1, "strikeId": 0, "strikeCancel": 0, "strikeEpoch": 1, "strike": false, "forward": 1, "strafe": -1, "yaw": 0.042749999094009644, "pitch": -0.08156394744291902, "fire": false, "rocket": false, "jump": false, "boost": false, "interact": false, "stance": "upright", "climb": false, "aimYaw": 0.033513527519479565}, "at": 258170.09999990463, "source": "frame", "generation": 1, "localId": "345bc2d8-8ee5-4d76-b6ee-1e089228fa0c"}; raw/admittedtick5217/5217, admitted629, receiveclock252530.19999980927, readclock258206.19999980927, staleMs=5676.0. schema/localAck/decode0; closeNone.

guest: playing=playing; held=[]; browser={"focused": true, "visibility": "visible", "activeElement": {"tag": "BODY", "id": "", "role": null, "editable": false}, "pointerLock": {"tag": "CANVAS", "id": "", "role": null, "editable": false}}; native={"tick": 5217, "lastInput": 7823, "aimYaw": 0.3250898816596068, "aimPitch": 0.13074203124269845, "velocity": {"x": -9.679213397619992e-65, "y": 0, "z": -9.679213397619992e-65}, "position": {"x": -7.749388396046852, "y": 0.9400999424259863, "z": -27.731712551338354}}; successfulsend={"input": {"seq": 8043, "jumpId": 0, "jumpCancel": 0, "jumpEpoch": 1, "strikeId": 0, "strikeCancel": 0, "strikeEpoch": 1, "strike": false, "forward": 0, "strafe": 0, "yaw": 0.32508999936580646, "pitch": 0.13074107849970462, "fire": false, "rocket": false, "jump": false, "boost": false, "interact": false, "stance": "upright", "climb": false, "aimYaw": 0.32508999936580624}, "at": 246990.40000009537, "source": "frame", "generation": 1, "localId": "e396a472-cc85-49b5-8e0b-c86f41329863"}; raw/admittedtick5217/5217, admitted544, receiveclock241107, readclock247018.10000014305, staleMs=5911.1. schema/localAck/decode0; closeNone.



Both raw snapshots stop at tick5217/time86.95 while actual successful client packets continue with nonzero host movement and focus. This disproves attributing this failure merely to focus or a static wall. It does not yet prove a lasting native freeze: after contexts closed, authority remains reachable and logs only routine empty arena expiry at tick5235/time87.25. Exact shared authority/scheduling/transport stall cause still unresolved. High specialist owns narrow clock/input/broadcast investigation. Do not weaken admission, flood limits or route geometry without evidence. WEST checkpoint/revive/fullmission remain unproved in this run.
