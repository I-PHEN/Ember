/** Strict PCM WAV reader. Unknown chunks are skipped with RIFF padding. */
export function readWav(buffer: Buffer) {
  if (buffer.length < 12 || buffer.toString("ascii",0,4) !== "RIFF" || buffer.toString("ascii",8,12) !== "WAVE") throw new Error("Invalid WAV header");
  const end = buffer.readUInt32LE(4) + 8;
  if (end > buffer.length || end < 12) throw new Error("Truncated WAV");
  let format: {channels:number;sampleRate:number;bits:number;blockAlign:number;byteRate:number} | undefined;
  let pcm: Buffer | undefined;
  for(let p=12;p<end;) {
    if(p+8>end) throw new Error("Truncated WAV chunk");
    const id=buffer.toString("ascii",p,p+4), size=buffer.readUInt32LE(p+4), start=p+8;
    if(start+size>end) throw new Error("Truncated WAV data");
    if(id==="fmt ") {
      if(size<16 || buffer.readUInt16LE(start)!==1) throw new Error("Unsupported WAV format");
      format={channels:buffer.readUInt16LE(start+2),sampleRate:buffer.readUInt32LE(start+4),byteRate:buffer.readUInt32LE(start+8),blockAlign:buffer.readUInt16LE(start+12),bits:buffer.readUInt16LE(start+14)};
    } else if(id==="data") {
      if(pcm) throw new Error("Multiple WAV data chunks");
      pcm=buffer.subarray(start,start+size);
    }
    p=start+size+(size%2);
    if(p>end) throw new Error("Missing WAV padding");
  }
  if(!format || !pcm?.length || !format.channels || !format.sampleRate || format.bits!==16 || format.blockAlign!==format.channels*2 || format.byteRate!==format.sampleRate*format.blockAlign || pcm.length%format.blockAlign) throw new Error("Invalid PCM WAV format");
  return {...format,pcm,duration:pcm.length/format.byteRate};
}

/** Join identical PCM formats without encoding, pitch changes, or added silence. */
export function joinWavs(buffers: Buffer[]): Buffer {
  if(!buffers.length) throw new Error("No WAV recordings");
  const decoded=buffers.map(readWav), first=decoded[0];
  if(decoded.some(w=>w.sampleRate!==first.sampleRate || w.channels!==first.channels || w.bits!==first.bits)) throw new Error("Incompatible WAV format");
  const pcm=Buffer.concat(decoded.map(w=>w.pcm)), header=Buffer.alloc(44);
  header.write("RIFF");header.writeUInt32LE(pcm.length+36,4);header.write("WAVEfmt ",8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(first.channels,22);header.writeUInt32LE(first.sampleRate,24);header.writeUInt32LE(first.byteRate,28);header.writeUInt16LE(first.blockAlign,32);header.writeUInt16LE(first.bits,34);header.write("data",36);header.writeUInt32LE(pcm.length,40);
  return Buffer.concat([header,pcm]);
}
