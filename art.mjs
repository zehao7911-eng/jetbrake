import {sites,coats} from './core.mjs';

const T=globalThis.THREE;
const schemes=[
  {sky:0x69d2fa,fog:0x9fe2fa,water:0x27b9cc,ground:0x8dda83,buildings:[0xffb956,0x64cbd9,0x70aaf1,0xff8173,0xfaf1cb]},
  {sky:0xffac79,fog:0xffca9a,water:0x5e88c6,ground:0xeac171,buildings:[0xfb885e,0xffd268,0xcc74a3,0x71aee0,0xffeee0]},
  {sky:0x7595ef,fog:0x8daef5,water:0x4656b5,ground:0x7997d7,buildings:[0x918bf6,0x57d8e1,0xed83be,0x6f8fee,0xffb86b]}
];

function seeded(seed) {
  return ()=>{
    seed=Math.imul(seed,1664525)+1013904223|0;
    return (seed>>>0)/4294967296;
  };
}

export class JetView {
  constructor(canvas) {
    this.canvas=canvas;
    this.scene=new T.Scene();
    this.camera=new T.PerspectiveCamera(54,1,.1,500);
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
    this.renderer.outputEncoding=T.sRGBEncoding;
    const sun=new T.DirectionalLight(0xfff0d0,.98);
    sun.position.set(-24,47,29);
    this.scene.add(sun,new T.HemisphereLight(0xf0faff,0x7485aa,.91));
    this.world=new T.Group();
    this.scene.add(this.world);
    this.materials=new Map();
    this.cube=new T.BoxGeometry(1,1,1);
    this.round=new T.SphereGeometry(1,14,9);
    this.tube=new T.CylinderGeometry(1,1,1,14);
    this.dummy=new T.Object3D();
    this.index=-1;
    this.pilot=this.makePilot();
    this.scene.add(this.pilot);
    this.flash=new T.Mesh(new T.RingGeometry(.74,1,48),new T.MeshBasicMaterial({color:0xffe45e,transparent:true,opacity:.6,side:T.DoubleSide,depthWrite:false}));
    this.flash.rotation.x=-Math.PI/2;
    this.flash.position.y=.065;
    this.scene.add(this.flash);
  }

  paint(color) {
    if(!this.materials.has(color)) this.materials.set(color,new T.MeshLambertMaterial({color:new T.Color(color).convertSRGBToLinear()}));
    return this.materials.get(color);
  }

  mesh(group,geometry,color,x,y,z,w,h,d) {
    const obj=new T.Mesh(geometry,typeof color==='number'?this.paint(color):color);
    obj.position.set(x,y,z);
    obj.scale.set(w,h,d);
    group.add(obj);
    return obj;
  }

  box(group,color,x,y,z,w,h,d) {
    return this.mesh(group,this.cube,color,x,y,z,w,h,d);
  }

  instances(group,geometry,color,rows) {
    if(!rows.length)return;
    const list=new T.InstancedMesh(geometry,this.paint(color),rows.length);
    rows.forEach(([x,y,z,w,h,d],i)=>{
      this.dummy.position.set(x,y,z);
      this.dummy.scale.set(w,h,d);
      this.dummy.updateMatrix();
      list.setMatrixAt(i,this.dummy.matrix);
    });
    group.add(list);
  }

  makePilot() {
    const pilot=new T.Group();
    const suit=new T.MeshLambertMaterial({color:coats[0]});
    this.suit=suit;
    const dark=0x1a314f, cream=0xffe9ad, steel=0x8094a9, brass=0xffbf56;
    const box=(color,x,y,z,w,h,d,g=pilot)=>this.box(g,color,x,y,z,w,h,d);
    box(dark,0,1.02,0,.69,.40,.41);
    box(suit,0,1.45,0,.86,.69,.46);
    box(cream,0,1.66,-.24,.72,.11,.045);
    box(dark,0,1.14,-.02,.86,.10,.48);
    this.mesh(pilot,this.round,0xfff0c8,0,2.04,-.015,.39,.36,.37);
    this.mesh(pilot,this.round,0x167b9f,0,2.01,-.185,.345,.215,.27);
    box(brass,0,2.26,.18,.18,.13,.24);
    for(const x of [-.35,.35])this.mesh(pilot,this.round,0x2d4f6c,x,2.04,.01,.09,.15,.15);
    box(0x235271,0,1.55,.34,.68,.72,.39);
    box(0xffbc47,0,1.60,.57,.45,.54,.10);
    box(0x193748,0,1.60,.63,.28,.29,.023);
    for(let i=0;i<3;i++)box([0x59e2f3,0x8df5be,0xffe693][i],0,1.51+i*.085,.65,.17,.034,.016);
    this.arms=[];
    this.legs=[];
    this.flames=[];
    for(const side of [-1,1]){
      const x=side*.36;
      const limb=new T.Group();
      limb.position.set(side*.49,1.69,0);
      pilot.add(limb);
      box(suit,side*.11,-.18,0,.24,.43,.26,limb);
      box(cream,side*.11,-.40,-.03,.22,.14,.25,limb);
      box(dark,side*.11,-.52,-.05,.23,.17,.23,limb);
      this.arms.push(limb);
      const leg=new T.Group();
      leg.position.set(side*.23,.99,0);
      pilot.add(leg);
      box(dark,0,-.29,.005,.29,.62,.30,leg);
      box(suit,0,-.52,-.105,.26,.20,.12,leg);
      box(cream,0,-.78,-.08,.33,.27,.46,leg);
      box(dark,0,-.935,-.085,.34,.095,.49,leg);
      this.legs.push(leg);
      this.mesh(pilot,this.tube,steel,x,1.39,.41,.16,.59,.16);
      this.mesh(pilot,this.tube,brass,x,1.70,.41,.176,.11,.176);
      this.mesh(pilot,this.tube,dark,x,1.075,.41,.172,.15,.172);
      const nozzle=new T.Group();
      nozzle.position.set(x,.98,.41);
      const plume=this.mesh(nozzle,new T.ConeGeometry(1,1,12),new T.MeshBasicMaterial({color:0xffa82f}),0,-.55,0,.16,1.10,.16);
      plume.rotation.z=Math.PI;
      const core=this.mesh(nozzle,new T.ConeGeometry(1,1,10),new T.MeshBasicMaterial({color:0xa4fbff}),0,-.25,0,.108,.49,.108);
      core.rotation.z=Math.PI;
      pilot.add(nozzle);
      this.flames.push(nozzle);
    }
    return pilot;
  }

  resize() {
    const w=this.canvas.clientWidth,h=this.canvas.clientHeight;
    if(!w||!h||this.w===w&&this.h===h)return;
    this.w=w;
    this.h=h;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));
    this.renderer.setSize(w,h,false);
    this.camera.aspect=w/h;
    this.camera.fov=w/h>1?48:55;
    this.camera.updateProjectionMatrix();
  }

  build(index) {
    if(index===this.index)return;
    this.index=index;
    this.world.traverse(obj=>{if(obj.isInstancedMesh)obj.dispose();});
    this.world.clear();
    const site=sites[index], theme=schemes[site.theme];
    this.scene.background=new T.Color(theme.sky).convertSRGBToLinear();
    this.scene.fog=new T.Fog(new T.Color(theme.fog).convertSRGBToLinear(),93,295);
    const rand=seeded(951+index*47);
    const world=this.world, box=(...args)=>this.box(world,...args);
    box(theme.water,0,-20,0,400,2,400);
    box(theme.ground,0,-18.8,-2,160,2,170);
    const walls=theme.buildings.map(()=>[]), trims=[], roofs=[], windows=[], lit=[], trees=[];
    for(let row=-6;row<=6;row++)for(let col=-6;col<=6;col++){
      const x=col*12.8,z=row*13.3;
      if((row===0&&col===0)||rand()<.105)continue;
      if(site.theme===0&&col<-3&&row>0)continue;
      const w=5.8+rand()*3.3,d=5.7+rand()*3.5;
      const height=4.5+rand()*12;
      const top=-17.8+height;
      const color=Math.floor(rand()*walls.length);
      walls[color].push([x,-17.8+height/2,z,w,height,d]);
      roofs.push([x,top+.11,z,w+.32,.30,d+.32]);
      trims.push([x,top+.45,z,w*.43,.58,d*.32]);
      for(let j=1;j<Math.floor(height/1.6);j++)for(let k=-2;k<=2;k++){
        const list=rand()<.15?lit:windows;
        const y=-17.8+1.5*j;
        list.push([x+k*w/5.6,y,z+d/2+.02,.67,.64,.045]);
        if(k%2===0) list.push([x+w/2+.02,y,z+k*d/4.8,.045,.63,.65]);
      }
      if(rand()<.39){
        trees.push([x+w*.65,-16.9,z+d*.67,.85,1.8,.85]);
        trees.push([x-w*.64,-16.8,z-d*.60,.8,1.75,.8]);
      }
    }
    walls.forEach((rows,i)=>this.instances(world,this.cube,theme.buildings[i],rows));
    this.instances(world,this.cube,0xf9efd8,roofs);
    this.instances(world,this.cube,0x4d718a,trims);
    this.instances(world,this.cube,0x27567d,windows);
    this.instances(world,this.cube,0xffe497,lit);
    this.instances(world,this.round,0x4bad78,trees);
    for(let i=-6;i<6;i++){
      box(0x52737d,(i+.5)*12.8,-17.72,-2,2.7,.06,158);
      box(0x52737d,0,-17.70,(i+.5)*13.3,156,.07,2.8);
    }
    this.makeRoof(theme,world);
    this.makeLaunch(site,world);
    this.makeClouds(site,world,rand);
  }

  makeRoof(theme,world) {
    const box=(...args)=>this.box(world,...args);
    box(0x536c8f,0,-9.25,0,14,17.5,12.5);
    box(0x30465f,0,-.45,0,14.8,.9,13.5);
    box(0x456379,0,-.075,0,13.7,.15,12.7);
    for(const side of [-1,1]){
      box(0xffc84c,side*6.6,.03,0,.22,.06,12.2);
      box(0xffc84c,0,.035,side*6.12,13.2,.07,.23);
      for(const z of [-5.7,5.7]){
        box(0x203a50,side*5.95,.26,z,.44,.46,.44);
        box(0xffdf6d,side*5.95,.52,z,.34,.12,.34);
      }
    }
    const flat=(r,y,color)=>{
      const m=this.mesh(world,this.tube,color,0,y,0,r,.034,r);
      return m;
    };
    flat(4.28,.035,0xffbe36);
    flat(3.98,.058,0x25526f);
    flat(3.10,.074,0xffe187);
    flat(2.82,.091,0x385c78);
    box(0xffeabe,-.79,.12,0,.35,.04,2.7);
    box(0xffeabe,.79,.12,0,.35,.04,2.7);
    box(0xffeabe,0,.12,0,1.62,.04,.34);
    for(const x of [-5.5,5.5]){
      for(let z=-3.4;z<4;z+=1.2)box(0xffe58d,x,.025,z,.46,.03,.44);
    }
    box(0xeaf5df,-5.15,.45,-4.95,1.65,.88,1.03);
    box(0x64859c,-5.15,.94,-4.95,1.54,.12,1.0);
    box(0xaad6e5,5.05,.40,4.95,1.22,.77,.83);
    box(0x274455,5.05,.81,4.95,1.32,.11,.92);
  }

  makeLaunch(site,world) {
    const y=site.alt+.05;
    const launch=new T.Group();
    launch.position.set(-4.5,y,2);
    const box=(...args)=>this.box(launch,...args);
    box(0xfff0d1,-2.2,-.27,0,4.8,.45,3.6);
    box(0x27516c,-2.2,-.46,0,4.9,.23,3.7);
    box(0xfbb640,2.32,-.22,-1.82,4.65,.38,1.72);
    box(0x644d50,2.49,-.019,-1.06,3.12,.019,.12);
    box(0x2a6381,-3.37,.25,-.5,1.89,.68,2.35);
    box(0x9fe8f3,-3.38,.58,-.52,1.82,.31,2.20);
    for(const z of [-1.87,1.87]){
      box(0x416a83,-2.45,-.54,z,4.1,.27,.35);
      for(const x of [-4,-1]){
        this.mesh(launch,this.tube,0x1c405c,x,-.64,z,.64,.25,.64);
        this.mesh(launch,this.tube,0xf6b349,x,-.80,z,.47,.12,.47);
      }
    }
    world.add(launch);
    this.launch=launch;
  }

  makeClouds(site,world,rand) {
    const wisps=[];
    for(let i=0;i<33;i++){
      const x=(rand()-.5)*145,z=(rand()-.57)*120;
      if(Math.hypot(x,z)<16)continue;
      const y=8+rand()*(site.alt-5);
      wisps.push([x,y,z,3+rand()*7,.65+rand()*1.5,2+rand()*5]);
      wisps.push([x+4,y-.2,z-1,3+rand()*5,.67,4]);
    }
    this.instances(world,this.round,0xf5fbff,wisps);
  }

  draw(drop,options) {
    this.build(drop.index);
    this.resize();
    if(!this.w)return;
    const {burn,coat}=options;
    const y=drop.alt;
    const landed=drop.phase==='landed', crashed=drop.phase==='crash';
    const active=drop.phase==='fall'||drop.phase==='paused';
    const time=drop.time;
    this.pilot.position.set(0,y+.14,0);
    this.pilot.rotation.set(crashed?1.08:active?-.17:.0,crashed?.3:-.14,crashed?.54:active?Math.sin(time*6.4)*.065:0);
    this.suit.color.set(coats[coat]).convertSRGBToLinear();
    this.arms.forEach((arm,i)=>{
      arm.rotation.z=(i?-1:1)*(landed?.15:burn?.26:active?.89:.34);
      arm.rotation.x=burn?-.23:active?.24:0;
    });
    this.legs.forEach((leg,i)=>{
      leg.rotation.x=crashed?.45:burn?.055:active?.23+i*.1:0;
      leg.rotation.z=(i?1:-1)*(burn?.08:.12);
    });
    this.flames.forEach((nozzle,i)=>{
      nozzle.visible=burn;
      nozzle.scale.y=.88+Math.sin(time*34+i)*.19;
    });
    this.launch.visible=y>sites[drop.index].alt-14;
    this.launch.position.x=-4.5-Math.min(4,time*1.15);
    this.flash.visible=landed;
    this.flash.scale.setScalar(4.45);
    this.flash.material.opacity=drop.stars===3?.72:.44;
    const high=Math.min(1,y/48);
    const side=1.65+high*1.15;
    const back=9.7+high*2.2, rise=5.8+high*8.5;
    const radius=Math.hypot(side,back);
    const pilotAngle=Math.atan2(rise-1.3,radius);
    const padAngle=Math.atan2(y+rise,radius);
    const pitch=pilotAngle*.47+padAngle*.53;
    this.camera.position.set(side,y+rise,back);
    this.camera.lookAt(0,y+rise-radius*Math.tan(pitch),0);
    this.renderer.render(this.scene,this.camera);
  }
}
