export class RushAudio {
  constructor(muted=false){this.muted=muted;this.active=false;this.playing=false;this.generation=0;}

  async unlock(){
    if(this.muted)return;
    try{
      if(!this.ctx){
        const Audio=window.AudioContext||window.webkitAudioContext;
        if(!Audio)return;
        this.ctx=new Audio();
        this.master=this.ctx.createGain();this.master.gain.value=.64;
        const limiter=this.ctx.createDynamicsCompressor();limiter.threshold.value=-17;limiter.ratio.value=7;
        this.master.connect(limiter).connect(this.ctx.destination);
        this.music=this.ctx.createGain();this.music.gain.value=0;this.music.connect(this.master);
        this.noise=this.ctx.createBuffer(1,this.ctx.sampleRate*.4,this.ctx.sampleRate);
        const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      }
      if(this.ctx.state!=='running')await this.ctx.resume();
      this.sync();
    }catch{}
  }

  setActive(value){this.active=value;this.sync();}
  mute(value){this.muted=value;this.sync();if(!value)this.unlock();}

  sync(){
    if(!this.ctx)return;
    const now=this.ctx.currentTime,wanted=this.active&&!this.muted&&this.ctx.state==='running';
    this.master.gain.setTargetAtTime(this.muted?0:.64,now,.026);
    if(wanted===this.playing)return;
    this.playing=wanted;
    const id=++this.generation;
    this.music.gain.cancelScheduledValues(now);this.music.gain.setTargetAtTime(wanted?.72:0,now,.08);
    if(!wanted){clearInterval(this.timer);return;}
    this.next=now+.045;this.step=0;
    const schedule=()=>{
      if(this.generation!==id)return;
      if(this.next<this.ctx.currentTime-.15)this.next=this.ctx.currentTime+.025;
      while(this.next<this.ctx.currentTime+.105){this.beat(this.next,this.step++);this.next+=60/158/4;}
    };
    schedule();this.timer=setInterval(schedule,27);
  }

  tone(t,freq,duration,amp,type='sine',end=freq,bus=this.master,lowpass){
    const c=this.ctx,osc=c.createOscillator(),gain=c.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(end,t+duration*.7);
    gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(amp,t+.007);gain.gain.exponentialRampToValueAtTime(.001,t+duration);
    if(lowpass){const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=lowpass;osc.connect(filter).connect(gain);}
    else osc.connect(gain);
    gain.connect(bus);osc.start(t);osc.stop(t+duration+.01);
  }

  grit(t,duration,amp,cut,bus=this.master,type='highpass'){
    const c=this.ctx,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=this.noise;
    filter.type=type;filter.frequency.value=cut;filter.Q.value=.7;
    gain.gain.setValueAtTime(amp,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);
    source.connect(filter).connect(gain).connect(bus);source.start(t);source.stop(t+duration+.01);
  }

  beat(t,n){
    const m=this.music,s=n%16,bar=Math.floor(n/16)%8;
    const root=[65.41,65.41,82.41,73.42,55,55,73.42,49][bar];
    if(s===0||s===7||s===10||(bar===7&&s===14))this.tone(t,123,.14,.57,'sine',38,m);
    if(s===4||s===12){this.grit(t,.153,.36,920,m);this.tone(t,176,.082,.21,'triangle',93,m);}
    if(s%2===0||s===11||s===15)this.grit(t,s===6||s===14?.105:.039,s%4===2?.17:.089,6700,m);
    if([0,2,3,6,7,9,10,13,15].includes(s)){
      const bass=root*(s===6?1.5:s===13?2:1);
      this.tone(t,bass,s%3===0?.155:.09,.22,'sawtooth',bass*.985,m,s===0?470:620);
      this.tone(t,bass,.09,.13,'sine',bass,m);
    }
    if(s%2===1){
      const scale=[3,4,3.36,2.52,2,3,4,3];const f=root*scale[s>>1]*2;
      this.tone(t,f,.11,.07,'square',f,m,bar>=4?1800:1100);
    }
    if(s===15&&bar%2===1)this.tone(t,490,.074,.105,'triangle',680,m);
  }

  event(type,chain=1){
    if(!this.ctx||this.muted||this.ctx.state!=='running')return;
    const t=this.ctx.currentTime+.009;
    if(type==='brake'){
      const f=290*Math.pow(2,Math.min(chain,8)/12);
      this.grit(t,.115,.43,1800,this.master,'bandpass');this.tone(t,113,.13,.32,'triangle',48);
      this.tone(t+.024,f,.13,.20,'triangle',f*1.52);
      if(chain>2)this.tone(t+.077,f*1.91,.125,.11,'sine',f*2.05);
    }else if(type==='bonk'){
      this.grit(t,.19,.33,680,this.master,'bandpass');this.tone(t,124,.25,.39,'sawtooth',35,this.master,480);
    }else if(type==='won'){
      [392,523,659,784,1047].forEach((f,i)=>this.tone(t+i*.081,f,.27,.16,'triangle',f));
      this.tone(t,130,.36,.33,'sine',45);
    }else if(type==='lost'){
      [330,262,196].forEach((f,i)=>this.tone(t+i*.12,f,.22,.14,'triangle',f*.97));
    }
  }
}
