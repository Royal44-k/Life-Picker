// A small project-authored synthesizer. It uses no third-party recording or melody file.
export function makeGentleAudio(duration){
 if(![15,20,30].includes(duration))throw new Error('Unsupported soundtrack duration');
 const rate=22050,count=rate*duration,wav=Buffer.alloc(44+count*2);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(count*2,40);
 const chords=[[48,52,55],[53,57,60],[57,60,64],[55,59,62]],melody=[72,76,79,76,74,72,69,67,72,74,77,76,72,69,67,72];
 const frequency=midi=>440*2**((midi-69)/12);
 const pluck=(time,midi,length)=>{if(time<0||time>=length)return 0;const env=Math.min(1,time/.015)*Math.exp(-time*2.4)*Math.min(1,(length-time)/.08),phase=2*Math.PI*frequency(midi)*time;return env*(Math.sin(phase)+.22*Math.sin(phase*2)+.08*Math.sin(phase*3));};
 for(let i=0;i<count;i++){const t=i/rate,beat=Math.floor(t/.75),bar=Math.floor(t/3),chord=chords[bar%chords.length];let sound=.14*pluck(t-beat*.75,melody[beat%melody.length],1.2)+.07*pluck(t-bar*3,chord[0],3);
  for(let n=0;n<3;n++)sound+=.035*pluck(t-bar*3-n*.65,chord[n]+12,2.4);
  sound*=Math.min(1,t/.4,(duration-t)/1.4);wav.writeInt16LE(Math.round(Math.max(-.5,Math.min(.5,sound))*32767),44+i*2);
 }
 return wav;
}
