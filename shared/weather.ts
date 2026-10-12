import { clamp } from './math';
export interface WeatherFrame {kind:'rain'|'ash'|'snow';front:string;intensity:number;windX:number;windZ:number;driftX:number;driftZ:number;visibility:number;sunlight:number;clouds:number;lightning:number;}
export const emptyWeather=():WeatherFrame=>({kind:'rain',front:'',intensity:0,windX:0,windZ:0,driftX:0,driftZ:0,visibility:1,sunlight:1,clouds:0,lightning:0});
export const wrapWeather=(value:number,extent=55)=>((value%extent+extent)%extent)-extent/2;
/** A room's shared clock drives gradual fronts without extra network messages. */
export function weatherAt(seed:number,time:number,reducedFlashes=false,out=emptyWeather()):WeatherFrame {
  const kind=seed===1926?'ash':seed===4107?'snow':'rain';
  const t=Number.isFinite(time)?Math.max(0,time):0,phase=(t+(seed%127))/180;
  const storm=.5-.5*Math.cos(phase*Math.PI*2),heading=seed*.031,speed=.7+storm*3.1,lateral=.45*Math.sin(t*.13+seed*.01),c=Math.cos(heading),s=Math.sin(heading);
  out.kind=kind;out.intensity=.12+storm*.88;out.clouds=.2+storm*.75;
  out.windX=c*speed-s*lateral;out.windZ=s*speed+c*lateral;
  const omega=Math.PI*2/180,start=(seed%127)*omega,along=2.25*t-1.55*(Math.sin(phase*Math.PI*2)-Math.sin(start))/omega,across=.45*(Math.cos(seed*.01)-Math.cos(t*.13+seed*.01))/.13;
  out.driftX=c*along-s*across;out.driftZ=s*along+c*across;
  out.visibility=1-storm*(kind==='snow'?.48:kind==='ash'?.38:.3);out.sunlight=1-storm*.62;
  out.front=kind==='rain'?(storm>.7?'COASTAL SQUALL':storm>.3?'COASTAL RAIN':'BREAK IN THE RAIN'):kind==='snow'?(storm>.7?'WHITEOUT FRONT':storm>.3?'SNOWFALL':'LIGHT FLURRIES'):(storm>.7?'ASH GALE':storm>.3?'ASH DRIFT':'CLEAR QUARRY SKY');
  const interval=Math.floor(t/19),pulse=t%19;
  const allowed=((Math.imul(interval+seed,1103515245)>>>0)%5)<2;
  out.lightning=!reducedFlashes&&kind==='rain'&&storm>.6&&allowed&&pulse<.24?.32*Math.sin(clamp(pulse/.24,0,1)*Math.PI):0;
  return out;
}
