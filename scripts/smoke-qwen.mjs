import {Client,handle_file} from '@gradio/client';
import {deflateSync} from 'node:zlib';

function crc(bytes){
 let x=0xffffffff;
 for(const b of bytes){x^=b;for(let i=0;i<8;i++)x=(x&1)?((x>>>1)^0xedb88320):(x>>>1);}
 return (x^0xffffffff)>>>0;
}
function chunk(tag,buf){
 const name=Buffer.from(tag),length=Buffer.alloc(4),sum=Buffer.alloc(4);
 length.writeUInt32BE(buf.length);sum.writeUInt32BE(crc(Buffer.concat([name,buf])));
 return Buffer.concat([length,name,buf,sum]);
}
function fixture(){
 const width=256,height=256,rows=Buffer.alloc(height*(1+width*3));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const row=y*(1+width*3);const offset=row+1+x*3;
  const leaves=Math.hypot(x-128,y-99)<58,stem=x>119&&x<137&&y>99;
  const color=leaves?[24,139,55]:stem?[128,88,45]:y<200?[136,201,245]:[78,167,79];
  rows[offset]=color[0];rows[offset+1]=color[1];rows[offset+2]=color[2];
 }
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=2;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
const prompt='On this simple landscape illustration, change the green tree leaves to orange autumn leaves. Preserve the sky, ground, and trunk.';
const expires=setTimeout(()=>{console.error('LIVE_SMOKE timeout (provider unavailable)');process.exit(124)},200000);
try{
 console.log('LIVE_SMOKE connecting');
 const app=await Client.connect('Qwen/Qwen-Image-2.1');
 const api=await app.view_api();
 console.log('LIVE_SMOKE exposed endpoints:',Object.keys(api.named_endpoints||{}).join(', '));
 const image=new File([fixture()],'tree.png',{type:'image/png'});
 const prepared=await app.predict('/prepare_request',{
  input_images:[{image:handle_file(image),caption:null}],
  original_prompt:prompt,
  enable_extend:false,
  custom_size:false,
  quality:'speed',
  seed:42,
  randomize_seed:false
 });
 const data=prepared.data;
 console.log('LIVE_SMOKE preparation output length:',Array.isArray(data)?data.length:'non-array');
 if(!Array.isArray(data)||data.length<2)throw Error('Invalid public preparation data');
 const seed=Number(data[1])||42;
 const final=await app.predict('/generate_request',{
  original_prompt:prompt,
  enable_extend:false,
  custom_size:false,
  log_dir:'',
  seed,
  height:1024,
  width:1024,
  negative_prompt:''
 });
 const output=final.data?.[0];
 if(!output)throw Error('Generation returned no image');
 console.log('LIVE_SMOKE SUCCESS: generated image returned, type=',typeof output);
}catch(err){
 console.error('LIVE_SMOKE FAILED:',err instanceof Error?err.message:String(err));
 process.exitCode=1;
}finally{clearTimeout(expires)}
