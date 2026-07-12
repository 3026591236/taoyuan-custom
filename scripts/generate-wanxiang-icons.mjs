import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function png(width, height, draw) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const [r,g,b,a] = draw(x, y, width, height);
      const i = row + 1 + x * 4;
      raw[i]=r; raw[i+1]=g; raw[i+2]=b; raw[i+3]=a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0); ihdr.writeUInt32BE(height,4); ihdr[8]=8; ihdr[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, {level:9})), chunk('IEND', Buffer.alloc(0))]);
}
function clamp(v){return Math.max(0,Math.min(255,Math.round(v)))}
function mix(a,b,t){return a+(b-a)*t}
function iconDraw(x,y,w,h){
  const cx=w/2, cy=h/2; const dx=(x+0.5-cx)/(w/2), dy=(y+0.5-cy)/(h/2); const r=Math.hypot(dx,dy);
  if(r>0.98) return [0,0,0,0];
  const ang=Math.atan2(dy,dx); const glow=(Math.sin(ang*3+1.2)+1)/2;
  let t=Math.min(1,r);
  let R=mix(26,13,t), G=mix(244,12,t), B=mix(198,48,t);
  R+=glow*38; G+=glow*20; B+=glow*75;
  const ring=Math.abs(r-0.88)<0.035 || Math.abs(r-0.68)<0.012;
  if(ring){ R=248; G=210; B=92; }
  // mountain / field
  const mountain = dy > 0.18 + Math.sin(dx*5)*0.05 && r < 0.82;
  if(mountain){ R=mix(54,105,(dy+0.2)); G=mix(170,238,(dy+0.2)); B=mix(118,128,(dy+0.2)); }
  // celestial gate lines
  const gate = (Math.abs(dx)<0.035 && dy>-0.55 && dy<0.55) || (Math.abs(Math.abs(dx)-0.32)<0.026 && dy>-0.12 && dy<0.4) || (Math.abs(dy+0.12)<0.025 && Math.abs(dx)<0.36);
  const arch = Math.abs(Math.hypot(dx/0.45,(dy+0.12)/0.52)-1)<0.025 && dy<0.05;
  if(gate||arch){ R=255; G=239; B=154; }
  // star dots
  const star = ((Math.sin(x*0.23+y*0.19)>0.985)&&(r<0.75)&&(dy<0.15));
  if(star){ R=255; G=250; B=190; }
  return [clamp(R),clamp(G),clamp(B),255];
}
function writePng(file,size){fs.writeFileSync(file,png(size,size,iconDraw));}
function ico(images){
  const header=Buffer.alloc(6); header.writeUInt16LE(0,0); header.writeUInt16LE(1,2); header.writeUInt16LE(images.length,4);
  const entries=[]; let offset=6+16*images.length;
  for(const im of images){const e=Buffer.alloc(16); e[0]=im.size===256?0:im.size; e[1]=im.size===256?0:im.size; e[2]=0; e[3]=0; e.writeUInt16LE(1,4); e.writeUInt16LE(32,6); e.writeUInt32LE(im.data.length,8); e.writeUInt32LE(offset,12); entries.push(e); offset+=im.data.length;}
  return Buffer.concat([header,...entries,...images.map(i=>i.data)]);
}
fs.mkdirSync('public/icons',{recursive:true});
for(const size of [16,32,48,64,128,180,192,256,512]) writePng(`public/icons/wanxiang-icon-${size}.png`,size);
fs.writeFileSync('public/apple-touch-icon.png', fs.readFileSync('public/icons/wanxiang-icon-180.png'));
fs.writeFileSync('public/icon-192.png', fs.readFileSync('public/icons/wanxiang-icon-192.png'));
fs.writeFileSync('public/icon-512.png', fs.readFileSync('public/icons/wanxiang-icon-512.png'));
fs.writeFileSync('public/favicon.ico', ico([16,32,48,256].map(size=>({size,data:fs.readFileSync(`public/icons/wanxiang-icon-${size}.png`)}))));
const androidSizes={ 'mipmap-mdpi':48, 'mipmap-hdpi':72, 'mipmap-xhdpi':96, 'mipmap-xxhdpi':144, 'mipmap-xxxhdpi':192 };
for(const [dir,size] of Object.entries(androidSizes)){
  const p=`android/app/src/main/res/${dir}`; fs.mkdirSync(p,{recursive:true});
  const data=png(size,size,iconDraw);
  for(const name of ['ic_launcher.png','ic_launcher_foreground.png','ic_launcher_monochrome.png']) fs.writeFileSync(path.join(p,name), data);
  fs.writeFileSync(path.join(p,'ic_launcher_background.png'), png(size,size,(x,y,w,h)=>[18,10,48,255]));
}
console.log('generated wanxiang icons');
