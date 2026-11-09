import * as C from './core.mjs';
import {JetView} from './art.mjs';
import {RushAudio} from './audio.mjs';
import {bridge} from './sdk.mjs';

const get=id=>document.getElementById(id);
const key='jetbrake-v1';
let saved={};
try {saved=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{}
let profile=C.profile(saved.profile);
let drop=C.restore(saved.drop,profile);
let host,view,frame=0,last=0,bank=0,checkpoint=0,resultTimer;
let pointer=null,space=false;
const audio=new RushAudio(profile.mute);

function persist(){
  try{localStorage.setItem(key,JSON.stringify({profile,drop}));}catch{}
}
function attachHost(){
  return bridge({
    read:()=>C.profile(profile),
    write(value,merge){
      profile=merge?C.mergeProfile(profile,value):C.profile(value);
      persist();
      if(get('menu').open) fillMenu();
      redraw();
    },
    changed(){if(get('menu').open)fillMenu();}
  });
}
function held(){return pointer!==null||space;}
function burning(){return drop.phase==='fall'&&held()&&drop.fuel>0;}
function redraw(){
  if(view&&!frame)frame=requestAnimationFrame(updateFrame);
}
function updateFrame(now){
  frame=0;
  if(drop.phase==='fall'){
    bank+=Math.min(.09,last?(now-last)/1000:0);
    while(bank>=C.STEP&&drop.phase==='fall'){
      bank-=C.STEP;
      const event=C.step(drop,held());
      if(event)finish(event);
    }
    if(now-checkpoint>160){
      checkpoint=now;
      persist();
    }
  }
  last=now;
  refresh();
  view.draw(drop,{burn:burning(),coat:profile.coat});
  if(drop.phase==='fall')redraw();
}
function refresh(){
  const site=C.sites[drop.index], action=get('action'), prompt=get('prompt');
  get('site').textContent=String(drop.index+1).padStart(2,'0')+' · '+site.name;
  get('height').textContent=Math.ceil(drop.alt)+' m';
  get('speed').textContent=(drop.speed<0?'↑ ':'↓ ')+Math.round(Math.abs(drop.speed))+' m/s';
  const ratio=drop.fuel/site.fuel;
  get('fuelFill').style.transform='scaleX('+ratio+')';
  get('fuel').setAttribute('aria-valuenow',String(Math.round(ratio*100)));
  action.hidden=drop.phase==='fall';
  let hint, cue='';
  if(drop.phase==='fall'){
    const signal=C.cue(drop);
    cue=signal==='empty'?'empty':burning()?'burn':signal==='brake'?'brake':'';
    hint=signal==='empty'?'Fuel empty':burning()?'Braking':signal==='brake'?'Hold to brake!':'Wait for yellow';
  }else if(drop.phase==='landed'||drop.phase==='crash'){
    hint=drop.phase==='landed'?'Touchdown':'Too fast';
    action.textContent='Result';
  }else if(drop.phase==='paused'){
    hint='Paused';
    action.textContent='Resume';
  }else{
    hint='Hold when yellow.';
    action.textContent='Drop ↓';
  }
  prompt.dataset.cue=cue;
  get('hint').textContent=hint;
}
function begin(){
  if(!view||!C.begin(drop))return;
  host.start();
  audio.unlock();
  audio.setActive(true);
  last=0;
  bank=0;
  persist();
  refresh();
  redraw();
}
function pause(){
  pointer=null;
  space=false;
  if(drop.phase!=='fall')return;
  drop.phase='paused';
  audio.setActive(false);
  persist();
  refresh();
  redraw();
}
function finish(event){
  pointer=null;
  space=false;
  const landed=event==='landed';
  if(landed){
    profile.best[drop.index]=Math.max(profile.best[drop.index],drop.stars);
    host.save();
  }
  persist();
  host.end();
  audio.setActive(false);
  audio.event(landed?'won':'bonk');
  get('impact').classList.toggle('hit',!landed);
  clearTimeout(resultTimer);
  resultTimer=setTimeout(()=>{
    get('impact').classList.remove('hit');
    showResult();
  },430);
}
function choose(index){
  if(drop.phase==='fall'||drop.phase==='paused')host.end();
  host.prepare();
  clearTimeout(resultTimer);
  pointer=null;
  space=false;
  audio.setActive(false);
  get('impact').classList.remove('hit');
  drop=C.newDrop(index);
  persist();
  refresh();
  redraw();
}
function showResult(){
  if(get('menu').open||get('result').open||!['landed','crash'].includes(drop.phase))return;
  const landed=drop.phase==='landed';
  const site=C.sites[drop.index];
  get('resultTitle').textContent=landed?'Touchdown!':'Too fast';
  get('stars').textContent='★'.repeat(drop.stars)+'☆'.repeat(3-drop.stars);
  get('report').textContent=landed?drop.speed.toFixed(1)+' m/s · '+Math.round(drop.fuel/site.fuel*100)+'% fuel left':drop.speed.toFixed(1)+' m/s · Limit '+site.safe+' m/s';
  get('next').textContent=landed?(drop.index===C.sites.length-1?'Drops →':'Next →'):'Retry';
  get('result').showModal();
}
function fillMenu(){
  get('menuTitle').textContent='Drops · '+C.total(profile)+'/18 ★';
  get('sound').textContent=profile.mute?'Sound off':'Sound on';
  get('sound').setAttribute('aria-pressed',String(!profile.mute));
  const routes=get('routes');
  routes.replaceChildren();
  C.sites.forEach((site,i)=>{
    const button=document.createElement('button');
    button.className='route';
    button.disabled=!C.unlocked(profile,i);
    const title=document.createElement('span'),mark=document.createElement('small');
    title.textContent=(i+1)+'. '+site.name;
    mark.textContent=profile.best[i]?'★'.repeat(profile.best[i]):button.disabled?'Locked':i===drop.index?'Here':'Open';
    button.append(title,mark);
    button.onclick=()=>{
      get('menu').close();
      if(i!==drop.index)choose(i);
    };
    routes.append(button);
  });
  const palette=get('coats');
  palette.replaceChildren();
  C.coats.forEach((color,i)=>{
    const button=document.createElement('button');
    const label=['Coral suit','Teal suit','Lilac suit'][i];
    button.style.setProperty('--coat',color);
    button.disabled=!C.coatAllowed(profile,i);
    button.textContent=button.disabled?'·':'✦';
    button.setAttribute('aria-label',label);
    button.title=button.disabled?[0,6,12][i]+' stars':label;
    button.setAttribute('aria-pressed',String(i===profile.coat));
    button.onclick=()=>{profile.coat=i;persist();redraw();fillMenu();};
    palette.append(button);
  });
  const support=host?.support(), lines=[];
  if(support?.like)lines.push('GameWave like: teal suit.');
  if(support?.comment)lines.push('GameWave comment: lilac suit.');
  get('perks').textContent=lines.join(' ');
  get('perks').hidden=!lines.length;
}
function showMenu(){
  pause();
  fillMenu();
  get('menu').showModal();
}

const canvas=get('flight');
canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0||pointer!==null||drop.phase!=='fall')return;
  pointer=event.pointerId;
  canvas.setPointerCapture(pointer);
  if(drop.fuel>0)audio.event('brake',0);
});
function release(event){if(event.pointerId===pointer)pointer=null;}
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,release);
window.addEventListener('keydown',event=>{
  if(event.code==='Escape'&&drop.phase==='fall'){pause();return;}
  if(event.code!=='Space'||event.repeat||event.target instanceof HTMLButtonElement||get('menu').open||get('result').open)return;
  event.preventDefault();
  if(drop.phase==='fall'){
    space=true;
    if(drop.fuel>0)audio.event('brake',0);
  }else if(drop.phase==='ready'||drop.phase==='paused')begin();
});
window.addEventListener('keyup',event=>{if(event.code==='Space')space=false;});
window.addEventListener('blur',pause);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('pagehide',()=>{pause();host.stop();});
window.addEventListener('pageshow',event=>{if(event.persisted){host=attachHost();redraw();}});

get('action').onclick=()=>drop.phase==='ready'||drop.phase==='paused'?begin():showResult();
get('menuButton').onclick=showMenu;
get('closeMenu').onclick=()=>get('menu').close();
get('restart').onclick=()=>{get('menu').close();choose(drop.index);};
get('sound').onclick=()=>{profile.mute=!profile.mute;audio.mute(profile.mute);persist();fillMenu();};
get('closeResult').onclick=()=>get('result').close();
get('next').onclick=()=>{
  get('result').close();
  if(drop.phase==='crash')choose(drop.index);
  else if(drop.index+1<C.sites.length)choose(drop.index+1);
  else showMenu();
};
get('retryView').onclick=()=>location.reload();
try{view=new JetView(canvas);}catch{
  get('fallback').hidden=false;
}
host=attachHost();
refresh();
if(view){
  new ResizeObserver(redraw).observe(canvas);
  redraw();
}
