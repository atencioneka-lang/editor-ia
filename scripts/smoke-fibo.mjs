// Integration smoke test; synthetic still life only, no personal photos.
// Runs only when this file changes. Must verify real image bytes from remote provider.
import {Client,handle_file} from '@gradio/client';
import {deflateSync} from 'node:zlib';
function crc32(bytes){let a=0xffffffff;for(const b of bytes){a^=b;for(let n=0;n<8;n++)a=a&1?(a>>>1)^0xedb88320:a>>>1;}return (a^0xffffffff)>>>0;}
function chunk(n,b){const tag=Buffer.from(n),len=Buffer.alloc(4),out=Buffer.alloc(4);len.writeUInt32BE(b.length);out.writeUInt32BE(crc32(Buffer.concat([tag,b])));return Buffer.concat([len,tag,b,out]);}
function samplePng(){
 const w=256,h=256,r=Buffer.alloc(h*(1+w*3));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const leaf=Math.hypot(x-128,y-106)<59;
   const trunk=x>119&&x<137&&y>106;
   const color=leaf?[30,143,67]:trunk?[134,85,45]:y<195?[120,189,242]:[90,173,94];
   const p=y*(1+w*3)+1+x*3;r[p]=color[0];r[p+1]=color[1];r[p+2]=color[2];
 }
 const hdr=Buffer.alloc(13);hdr.writeUInt32BE(w,0);hdr.writeUInt32BE(h,4);hdr[8]=8;hdr[9]=2;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',hdr),chunk('IDAT',deflateSync(r)),chunk('IEND',Buffer.alloc(0))]);
}

function sampleMaskPng(){
 const w=256,h=256,raw=Buffer.alloc(h*(1+w*3));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const value=Math.hypot(x-128,y-106)<70?255:0;
  const at=y*(1+w*3)+1+x*3;
  raw[at]=value;raw[at+1]=value;raw[at+2]=value;
 }
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}

const DEADLINE=145000;
const timeout=setTimeout(()=>{console.error('FIBO_SMOKE timeout after '+DEADLINE+'ms');process.exit(124);},DEADLINE);
try{
 console.log('FIBO_SMOKE starting provider integration');
 const app=await Client.connect('briaai/Fibo-2.0-editing');
 console.log('FIBO_SMOKE connected');
 const api=await app.view_api();
 console.log('FIBO_SMOKE named routes:',Object.keys(api.named_endpoints||{}));
 const browserOrigin='https://atencioneka-lang.github.io';
 const check=await fetch('https://briaai-fibo-2-0-editing.hf.space/gradio_api/info',{headers:{Origin:browserOrigin}});
 const cors=check.headers.get('access-control-allow-origin');
 console.log('FIBO_SMOKE CORS:',check.status,cors);
 if(!check.ok)throw Error('The browser API route is unavailable: '+check.status);
 if(cors!=='*'&&cors!==browserOrigin)throw Error('The browser Origin is not permitted by the public Space.');
 const file=new File([samplePng()],'autumn-demo.png',{type:'image/png'});
 const maskFile=new File([sampleMaskPng()],'painted-zone.png',{type:'image/png'});
 console.log('FIBO_SMOKE beginning /edit with a non-sensitive synthetic image');
 const result=await app.predict('/edit',{
  source:handle_file(file),
  instruction:'Change the tree foliage from green to orange autumn leaves, preserving the sky and ground.',
  json_instruction:'',
  ref2:null,ref3:null,ref4:null,mask:handle_file(maskFile),seed:42,randomize:false,steps:4
 });
 const item=result.data?.[0];
 const url=item?.image_data||item?.data||item?.url;
 console.log('FIBO_SMOKE output type:',typeof item,'fields:',item&&typeof item==='object'?Object.keys(item):[]);
 if(typeof url!=='string'||!url.startsWith('data:image/png;base64,'))throw Error('No image_data PNG data URI returned');
 const body=Buffer.from(url.slice('data:image/png;base64,'.length),'base64');
 if(body.length<1000)throw Error('PNG too small');
 console.log('FIBO_SMOKE SUCCESS downloaded PNG bytes:',body.length);
}catch(err){
 console.error('FIBO_SMOKE FAILED:',err instanceof Error?err.message:String(err));
 process.exitCode=1;
}finally{clearTimeout(timeout);await new Promise(r=>setTimeout(r,50));process.exit(process.exitCode||0)}
