import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Original procedural score; no samples, third-party compositions or downloads.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'scratch/devpost/manifest.json'), 'utf8'));
const rate = 24000;
const seconds = manifest.segments.reduce((sum,s)=>sum+s.duration,0);
const length = Math.ceil(seconds*rate);
const left = new Float64Array(length);
const right = new Float64Array(length);
const chords = [[48,55,59,64],[45,52,55,60],[41,48,52,57],[43,50,55,59]];
const note = (start,midi,duration,amplitude,pan,pad=false) => {
  const frequency = 440*2**((midi-69)/12);
  for(let i=0;i<duration*rate&&Math.floor(start*rate)+i<length;i++) {
    const t=i/rate, phase=2*Math.PI*frequency*t;
    const envelope = pad ? Math.min(1,t/.7)*Math.min(1,(duration-t)/1.4)*.45 : (1-Math.exp(-t/0.025))*Math.exp(-t/1.5)*Math.min(1,(duration-t)/.25);
    const sound=(Math.sin(phase)+.24*Math.sin(phase*2)+.07*Math.sin(phase*3))*envelope*amplitude;
    const index=Math.floor(start*rate)+i;
    left[index]+=sound*Math.sqrt((1-pan)/2);
    right[index]+=sound*Math.sqrt((1+pan)/2);
    if(!pad&&index+Math.floor(rate*.31)<length) right[index+Math.floor(rate*.31)]+=sound*.14;
  }
};
for(let bar=0;bar*7<seconds;bar++) {
  const chord=chords[bar%chords.length];
  chord.forEach((pitch,i)=>note(bar*7,pitch,8,.10,(i-1.5)/3,true));
  [0,2,1,3,2,1].forEach((degree,i)=>note(bar*7+.35+i*1.05,chord[degree]+12,3.5,.13,i%2?.35:-.35));
}
let peak=0; for(let i=0;i<length;i++) peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
// Duck from the real narration's RMS envelope, not a decorative waveform.
const speech = new Float64Array(Math.ceil(seconds*20));
let offset=0;
for(const segment of manifest.segments) {
  const wav=await fs.readFile(path.join(root,'scratch/devpost/public',segment.audio));
  const voiceRate=wav.readUInt32LE(24), channels=wav.readUInt16LE(22);
  for(let frame=0;frame<Math.ceil(segment.audioDuration*20);frame++) {
    let energy=0,count=0;
    for(let i=Math.floor(frame*voiceRate/20);i<Math.min((frame+1)*voiceRate/20,(wav.length-44)/(2*channels));i++) {
      const sample=wav.readInt16LE(44+i*2*channels)/32768; energy+=sample*sample;count++;
    }
    speech[Math.floor(offset*20)+frame]=Math.sqrt(energy/Math.max(1,count));
  }
  offset+=segment.duration;
}
const pcm=Buffer.alloc(length*4);
let gain=.09, mixedPeak=0, energy=0;
for(let i=0;i<length;i++) {
  const t=i/rate;
  const target=speech[Math.min(speech.length-1,Math.floor(t*20))]>.012?.09:.20;
  gain+=(target-gain)/(rate*(target<gain?.12:.65));
  const fade=Math.min(1,t/1.8,(seconds-t)/2.2);
  const l=left[i]/peak*.75*gain*fade, r=right[i]/peak*.75*gain*fade;
  mixedPeak=Math.max(mixedPeak,Math.abs(l),Math.abs(r));energy+=(l*l+r*r)/2;
  pcm.writeInt16LE(Math.round(l*32767),i*4);pcm.writeInt16LE(Math.round(r*32767),i*4+2);
}
const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(pcm.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*4,28);header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
const file=path.join(root,'scratch/devpost/public/audio/ember-original-score.wav');
await fs.writeFile(file,Buffer.concat([header,pcm]));
console.log(JSON.stringify({file,seconds,peak:mixedPeak,rms:Math.sqrt(energy/length),original:true,speechDucked:true}));
