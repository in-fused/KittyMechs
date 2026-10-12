"""Fixed-link source leg prerequisite. No native support/force evidence."""
import math
FPS=120
DURATION=2.4
SOLE_Z=.018
NATIVE_LIFT=.15
RETRACT_ANGLE=math.radians(120)

def smooth(t):
    u=max(0.,min(1.,t));return u*u*u*(10+u*(-15+6*u))
def sample(t):
    lift=smooth((t-.2)/.4) if t<1.75 else 1-smooth((t-1.75)/.4)
    lift=max(0.,min(1.,lift))
    if t<.75:angle=RETRACT_ANGLE
    elif t<1.1:angle=RETRACT_ANGLE*(1-smooth((t-.75)/.35))
    elif t<1.25:angle=0.
    elif t<1.6:angle=RETRACT_ANGLE*smooth((t-1.25)/.35)
    else:angle=RETRACT_ANGLE
    phase='plant' if t<.2 else 'actual-leg-lift' if t<.6 else 'lifted-guard' if t<.75 else 'claw-extension' if t<1.1 else 'claw-ready' if t<1.25 else 'claw-retraction' if t<1.6 else 'lifted-recovery' if t<1.75 else 'actual-leg-replant' if t<2.15 else 'plant-recovered'
    return {'time':t,'phase':phase,'FLSourceLift':NATIVE_LIFT/.8*lift,'FLClawAngle':angle,'otherClawAngle':RETRACT_ANGLE,'carrierSourceZ':-SOLE_Z,'support':'CONTROLLED_SOURCE_APPROXIMATION_NOT_NATIVE','loadedPaws':['FR','HL','HR']+(['FL'] if phase in ('plant','plant-recovered') else [])}

def solve(hip,knee,paw,target):
    def sub(a,b):return [a[i]-b[i] for i in range(3)]
    def dot(a,b):return sum(a[i]*b[i] for i in range(3))
    def length(a):return math.sqrt(dot(a,a))
    upper=length(sub(knee,hip));lower=length(sub(paw,knee));axis=sub(target,hip);distance=length(axis)
    if not abs(upper-lower)<distance<upper+lower:raise ValueError('FIXED_CHAIN_REQUEST_UNREACHABLE')
    axis=[v/distance for v in axis];hint=sub(knee,hip);projection=dot(hint,axis);bend=[hint[i]-projection*axis[i] for i in range(3)];bendLength=length(bend)
    if bendLength<1e-10:raise ValueError('FIXED_CHAIN_BEND_UNDEFINED')
    bend=[v/bendLength for v in bend];a=(upper*upper-lower*lower+distance*distance)/(2*distance);h2=upper*upper-a*a
    if h2<=0:raise ValueError('FIXED_CHAIN_NO_REAL_KNEE')
    h=math.sqrt(h2);actual=[hip[i]+a*axis[i]+h*bend[i] for i in range(3)]
    return {'requestedPaw':target,'solvedKnee':actual,'upperLength':upper,'lowerLength':lower,'distance':distance,'clamped':False}
