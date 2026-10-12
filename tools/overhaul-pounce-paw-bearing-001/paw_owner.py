"""Single source-only paw articulation recipe. Native leases/load remain unsupported."""
from dataclasses import dataclass
from math import radians

@dataclass(frozen=True)
class PawBearingPose:
    phase: str
    source_carrier_lift: float
    source_wrist_pitch: float
    claw_hinge_angle: float
    bearing_loaded: bool
    evidence: str = 'authored-static-source-intent-not-native-contact'

PROFILES = (
    PawBearingPose('plant', 0.0, 0.0, radians(-35), True),
    PawBearingPose('free', 0.25, 0.0, radians(-15), False),
    PawBearingPose('climb-ready', 0.40, radians(-15), 0.0, False),
)

def source_profiles():
    """One declared recipe, no geometry-dependent search or postfailure adaptation."""
    return PROFILES

def runtime_intent():
    return {
        'loaded': 'require actual support/load lease; hold wrist accepted and claws retracted',
        'release': 'actual unloading and measured sole clearance before extending retained claws',
        'free': 'same paw owner carries original wrist and all claw child transforms',
        'climb-ready': 'claws may extend only after release; this pose provides no native wall grip',
        'missing': ['actual native support and release leases', 'causal joint angular trajectory and rate limits', 'source R/locomotion integration', 'claw-to-original-housing volume proof'],
    }
