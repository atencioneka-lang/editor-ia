import {Client,handle_file} from '@gradio/client';

// Proveedor público oficial, sujeto a filtros, cuotas y cambios de API.
// Ninguna solicitud se envía sin el clic del usuario.
export type RemoteQuality='speed'|'quality';

function fileSource(output:unknown):string{
 if(typeof output==='string')return output;
 if(output&&typeof output==='object'){
  const item=output as {url?:unknown;path?:unknown;data?:unknown};
  for(const candidate of [item.url,item.data,item.path]){
   if(typeof candidate==='string'&&candidate)return candidate;
  }
 }
 return '';
}
export async function editWithQwen(image:Blob,prompt:string,quality:RemoteQuality,update:(message:string)=>void):Promise<Blob>{
 if(!prompt.trim()||image.size===0)throw Error('Carga una imagen y escribe una instrucción.');
 update('Conectando con el servicio oficial de Qwen…');
 const client=await Client.connect('Qwen/Qwen-Image-2.1');
 update('Preparando la fotografía y la instrucción…');
 const prep=await client.predict('/prepare_request',{
  input_images:[handle_file(image)],
  original_prompt:prompt,
  enable_extend:false,
  custom_size:false,
  quality:quality,
  seed:0,
  randomize_seed:true
 });
 const values=prep.data as unknown[];
 if(!Array.isArray(values)||values.length<4)throw Error('El servidor cambió el formato de preparación.');
 const seed=typeof values[1]==='number'?values[1]:0;
 update('Generando fotografía: el servidor gratuito puede tener cola…');
 const generated=await client.predict('/generate_request',{
  request_state:values[3],
  original_prompt:prompt,
  enable_extend:false,
  custom_size:false,
  log_dir:'',
  seed:seed,
  height:1536,
  width:1024,
  negative_prompt:' '
 });
 const source=fileSource((generated.data as unknown[])?.[0]);
 if(!source)throw Error('El proveedor no devolvió una imagen.');
 if(source.startsWith('data:image/')){
  const blob=await fetch(source).then(r=>r.blob());
  if(!blob.size)throw Error('El resultado no contiene datos.');
  return blob;
 }
 const url=new URL(source);
 if(url.protocol!=='https:'||(!url.hostname.endsWith('.hf.space')&&!url.hostname.endsWith('.huggingface.co')))
  throw Error('El proveedor devolvió una URL no autorizada.');
 const res=await fetch(url.toString());
 if(!res.ok)throw Error('No se pudo recuperar el resultado de la edición.');
 const blob=await res.blob();
 if(blob.size===0||!blob.type.startsWith('image/'))throw Error('El archivo resultante no es una imagen.');
 return blob;
}
