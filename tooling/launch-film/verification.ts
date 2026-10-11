/** Validate MP4 atoms independently of FFmpeg's human-readable stream report. */
export function verifyFilmExport(metadata: string, bytes: Buffer): void {
  const atoms = new Map<string, number>();
  let offset = 0;
  let mp4Brand = false;
  while (offset + 8 <= bytes.length) {
    const size = bytes.readUInt32BE(offset);
    const name = bytes.toString("ascii", offset + 4, offset + 8);
    if (size < 8 || offset + size > bytes.length) throw new Error("Invalid MP4 atom size");
    atoms.set(name, offset);
    if (name === "ftyp" && size >= 16) {
      const brands = [bytes.toString("ascii", offset + 8, offset + 12)];
      for (let brand = offset + 16; brand + 4 <= offset + size; brand += 4) brands.push(bytes.toString("ascii", brand, brand + 4));
      mp4Brand = brands.some(brand => ["isom", "iso2", "mp41", "mp42", "avc1"].includes(brand));
    }
    offset += size;
  }
  if (offset !== bytes.length || !mp4Brand || atoms.get("ftyp") !== 0 || !atoms.has("moov") || !atoms.has("mdat") || atoms.get("moov")! > atoms.get("mdat")!) {
    throw new Error("Expected a fast-start MP4 container");
  }
  const video = metadata.split(/\r?\n/).find(line => /Video: h264/.test(line)) ?? "";
  if (!/yuv420p\(tv, bt709/.test(video) || !/1920x1080/.test(video) || !/(?:^|,\s)30 fps(?:,|$)/.test(video) || !/Duration: 00:00:52\.00(?:,|\s|$)/.test(metadata) || !/Audio: aac/.test(metadata)) {
    throw new Error(`Expected 52.00-second H.264 limited-range yuv420p BT.709 1920×1080 30fps/AAC export: ${metadata}`);
  }
}
