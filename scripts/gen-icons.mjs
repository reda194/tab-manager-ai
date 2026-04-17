import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// CRC32
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c;
}
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return crc ^ -1;
}
function adler32(data) {
  let a = 1, b = 0;
  for (let i = 0; i < data.length; i++) { a = (a + data[i]) % 65521; b = (b + a) % 65521; }
  return (b << 16) | a;
}

function createPNG(size) {
  const parts = [];
  // Signature
  parts.push(Buffer.from([137,80,78,71,13,10,26,10]));
  
  // IHDR
  const ihdrD = Buffer.alloc(13);
  ihdrD.writeUInt32BE(size, 0);
  ihdrD.writeUInt32BE(size, 4);
  ihdrD[8]=8; ihdrD[9]=2; // 8-bit RGB
  const ihdrT = Buffer.from('IHDR');
  const ihdrC = crc32(Buffer.concat([ihdrT, ihdrD]));
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13,0); ihdrT.copy(ihdr,4); ihdrD.copy(ihdr,8); ihdr.writeInt32BE(ihdrC,21);
  parts.push(ihdr);

  // IDAT
  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0); // no filter
    for (let x = 0; x < size; x++) {
      const cx = size/2, cy = size/2;
      const r = Math.sqrt((x-cx)**2+(y-cy)**2);
      const mr = size*0.45;
      const inside = r < mr;
      if (inside) {
        // Blue gradient circle with white "T" shape
        const t = r/mr;
        raw.push(Math.round(37+22*t), Math.round(99+31*t), Math.round(235+10*t));
      } else {
        raw.push(30, 64, 175); // darker blue background
      }
    }
  }
  const rawBuf = Buffer.from(raw);
  const maxBlock = 65535;
  const deflated = [0x78, 0x01]; // zlib header
  for (let i = 0; i < rawBuf.length; i += maxBlock) {
    const end = Math.min(i+maxBlock, rawBuf.length);
    const len = end - i;
    const last = end >= rawBuf.length;
    deflated.push(last?1:0, len&0xFF, (len>>8)&0xFF, ~len&0xFF, (~len>>8)&0xFF);
    for (let j = i; j < end; j++) deflated.push(rawBuf[j]);
  }
  const adler = adler32(rawBuf);
  deflated.push((adler>>>24)&0xFF, (adler>>>16)&0xFF, (adler>>>8)&0xFF, adler&0xFF);
  
  const idatD = Buffer.from(deflated);
  const idatT = Buffer.from('IDAT');
  const idatC = crc32(Buffer.concat([idatT, idatD]));
  const idat = Buffer.alloc(4+4+idatD.length+4);
  idat.writeUInt32BE(idatD.length,0); idatT.copy(idat,4); idatD.copy(idat,8); idat.writeInt32BE(idatC,8+idatD.length);
  parts.push(idat);

  // IEND
  const iendT = Buffer.from('IEND');
  const iendC = crc32(iendT);
  const iend = Buffer.alloc(12);
  iend.writeUInt32BE(0,0); iendT.copy(iend,4); iend.writeInt32BE(iendC,8);
  parts.push(iend);

  return Buffer.concat(parts);
}

const dir = join(__dirname, '..', 'public', 'icons');
mkdirSync(dir, { recursive: true });
for (const s of [16, 32, 48, 128]) {
  writeFileSync(join(dir, `icon${s}.png`), createPNG(s));
  console.log(`Created icon${s}.png`);
}
