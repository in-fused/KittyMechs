"""One prescribed source-only paw mechanism cycle, no physics/load provider."""
import math

FPS = 120
DURATION = 2.6
SOLE_Z = .018
SOURCE_CARRIER_LIFT = .24
CLAW_TRAVEL = .10

def smooth(value):
    s = max(0., min(1., value))
    return s*s*s*(10.+s*(-15.+6.*s))

def sample(t):
    if t < .2:
        phase, lift, curl, extension = 'plant', 0., 0., 0.
    elif t < .6:
        phase, lift, curl, extension = 'diagnostic-unload', smooth((t-.2)/.4), 0., 0.
    elif t < .9:
        phase, lift, curl, extension = 'digit-release', 1., smooth((t-.6)/.3), 0.
    elif t < 1.25:
        phase, lift, curl, extension = 'claw-extend', 1., 1., smooth((t-.9)/.35)
    elif t < 1.4:
        phase, lift, curl, extension = 'claw-ready', 1., 1., 1.
    elif t < 1.75:
        phase, lift, curl, extension = 'claw-retract', 1., 1., 1.-smooth((t-1.4)/.35)
    elif t < 2.05:
        phase, lift, curl, extension = 'digit-replant', 1., 1.-smooth((t-1.75)/.3), 0.
    elif t < 2.45:
        phase, lift, curl, extension = 'diagnostic-lower', 1.-smooth((t-2.05)/.4), 0., 0.
    else:
        phase, lift, curl, extension = 'replant', 0., 0., 0.
    return {'phase': phase, 'time': t, 'sourceCarrierZ': SOURCE_CARRIER_LIFT*lift-SOLE_Z,
            'proximalAngle': -math.radians(6)*curl, 'distalAngle': -math.radians(12)*curl,
            'clawTravel': CLAW_TRAVEL*extension, 'loaded': phase in ('plant', 'replant'),
            'supportEvidence': 'CONTROLLED_SOURCE_FLOOR_NOT_NATIVE',
            'releaseEvidence': 'PRESCRIBED_WHOLE_CARRIER_LIFT_NOT_NATIVE_LEG_RELEASE'}

def rate_bounds():
    return {'carrierSourceUnitsPerSecond': .24*1.875/.4,
            'proximalRadiansPerSecond': math.radians(6)*1.875/.3,
            'distalRadiansPerSecond': math.radians(12)*1.875/.3,
            'clawSourceUnitsPerSecond': .10*1.875/.35,
            'basis': 'analytic quintic first-derivative maximum 1.875; local actuators only',
            'continuousWholeGeometryClearance': 'UNKNOWN_BETWEEN_120HZ_SAMPLES'}
