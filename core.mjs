export const sites=[
  {name:'Harbor Deck',alt:56,entry:7,gravity:10,brake:31,fuel:2.72,safe:9.5,soft:5.5,spare:.28,theme:0},
  {name:'Marina Roof',alt:68,entry:8,gravity:10.5,brake:33,fuel:2.84,safe:9,soft:5,spare:.31,theme:0},
  {name:'Sunset Towers',alt:76,entry:9,gravity:11,brake:34,fuel:2.92,safe:8.5,soft:4.8,spare:.30,theme:1},
  {name:'Canyon Relay',alt:82,entry:10,gravity:11.8,brake:36,fuel:2.96,safe:8,soft:4.6,spare:.28,theme:1},
  {name:'Blue Hour',alt:91,entry:11,gravity:12.2,brake:37,fuel:3.08,safe:7.6,soft:4.3,spare:.28,theme:2},
  {name:'Crown Platform',alt:104,entry:12,gravity:12.8,brake:39,fuel:3.22,safe:7.2,soft:4,spare:.28,theme:2}
];

export const coats=['#ec5436','#16b6bc','#b88aff'];
export const STEP=1/120;

export function profile(value) {
  return {
    best:sites.map((_,i)=>Number.isInteger(value?.best?.[i])?Math.max(0,Math.min(3,value.best[i])):0),
    rewards:{like:value?.rewards?.like===true,comment:value?.rewards?.comment===true},
    mute:value?.mute===true,
    coat:Number.isInteger(value?.coat)&&coats[value.coat]?value.coat:0
  };
}
export function total(p) { return p.best.reduce((sum,n)=>sum+n,0); }
export function unlocked(p,index) { return index===0||p.best[index-1]>0; }
export function coatAllowed(p,index) {
  return index===0 || index===1&&(total(p)>=6||p.rewards.like) || index===2&&(total(p)>=12||p.rewards.comment);
}
export function mergeProfile(local, value) {
  const other=profile(value);
  return {
    ...local,
    best:local.best.map((n,i)=>Math.max(n,other.best[i])),
    rewards:{like:local.rewards.like||other.rewards.like,comment:local.rewards.comment||other.rewards.comment}
  };
}
export function newDrop(index) {
  const site=sites[index];
  return {index,phase:'ready',alt:site.alt,speed:site.entry,fuel:site.fuel,time:0,stars:0};
}
export function begin(drop) {
  if(drop.phase!=='ready'&&drop.phase!=='paused')return false;
  drop.phase='fall';
  return true;
}
export function brakingDistance(drop) {
  const site=sites[drop.index];
  return Math.max(0,(drop.speed**2-(site.soft-.7)**2)/(2*(site.brake-site.gravity)));
}
export function cue(drop) {
  const site=sites[drop.index];
  if(drop.fuel<=0)return 'empty';
  if(drop.alt<=brakingDistance(drop)+Math.max(1.15,drop.speed*.48+.6)&&drop.speed>site.soft-.7)return 'brake';
  return 'fall';
}
export function step(drop, held) {
  if(drop.phase!=='fall')return null;
  const site=sites[drop.index];
  const unpoweredSpeed=drop.speed+site.gravity*STEP;
  const glide=site.soft-.55;
  const throttle=held?Math.min(1,Math.max(0,(unpoweredSpeed-glide)/(site.brake*STEP))):0;
  const cost=throttle*STEP;
  const burn=Math.min(cost,drop.fuel);
  drop.fuel=Math.max(0,drop.fuel-burn);
  drop.speed=unpoweredSpeed-site.brake*burn;
  drop.alt=Math.min(site.alt+3,drop.alt-drop.speed*STEP);
  drop.time+=STEP;
  if(drop.alt>0)return null;
  drop.alt=0;
  drop.phase=drop.speed<=site.safe?'landed':'crash';
  if(drop.phase==='landed') drop.stars=1+Number(drop.speed<=site.soft)+Number(drop.fuel>=site.spare);
  return drop.phase;
}
export function restore(value,p) {
  const index=Number.isInteger(value?.index)&&sites[value.index]&&unlocked(p,value.index)?value.index:0;
  const fresh=newDrop(index);
  if(value?.index!==index || !['fall','paused','landed','crash'].includes(value.phase))return fresh;
  const site=sites[index];
  if(!Number.isFinite(value.time)||value.time<=0||value.time>120||!Number.isFinite(value.alt)||value.alt<0||value.alt>site.alt+3||!Number.isFinite(value.speed)||value.speed< -2||value.speed>100||!Number.isFinite(value.fuel)||value.fuel<0||value.fuel>site.fuel)return fresh;
  const restored={index,phase:'paused',alt:value.alt,speed:value.speed,fuel:value.fuel,time:value.time,stars:0};
  if(value.alt===0) {
    restored.phase=value.speed<=site.safe?'landed':'crash';
    if(restored.phase==='landed')restored.stars=1+Number(value.speed<=site.soft)+Number(value.fuel>=site.spare);
  }
  return restored;
}
