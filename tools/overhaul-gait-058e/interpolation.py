"""Exact glTF STEP hold; unchanged005 LINEAR/slerp passed explicitly by caller.
Primary local source: Three GLTFLoader STEP->InterpolateDiscrete,
DiscreteInterpolant.interpolate_ copies i1-1; Interpolant clamps before/after.
No asset curves, geometry or acceptance thresholds changed.
"""
from bisect import bisect_right

def sample_exact(path,t,times,values,interpolation,linear_sample):
    if interpolation=='LINEAR':return linear_sample(path,t,times,values)
    if interpolation=='STEP':
        if not times or len(times)!=len(values):raise RuntimeError('STEP_TIME_VALUE_COUNT_MISMATCH')
        # At a key, bisect_right selects that key. Between keys, hold preceding.
        # Before first/after last, copy first/last exactly, including quaternion.
        return values[max(0,min(len(times)-1,bisect_right(times,t)-1))]
    raise RuntimeError('ANALYTICAL_SAMPLER_INTERPOLATION_UNSUPPORTED:'+interpolation)
