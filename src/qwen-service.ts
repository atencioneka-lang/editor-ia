import {Client,handle_file} from '@gradio/client';
import {galleryPayload,explainQwenError} from './qwen-contract';

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

 let client:Awaited<ReturnType<typeof Client.connect>>;
 update('1/4 · Comprobando conexión con Qwen…');
 try {
  client=await Client.connect('Qwen/Qwen-Image-2.1');
 }catch(err){throw explainQwenError(err,'conexion');}

 let seed=0;
 update('2/4 · Enviando fotografía a la galería de Qwen…');
 try {
  // La galería de Gradio requiere un objeto {image,caption}, no un archivo
  // suelto. La forma antigua fallaba antes de ejecutar la inferencia.
  const inputFile=new File([image],'imagen-editor-ia.png',{type:'image/png'});
  const prep=await client.predict('/prepare_request',{
   input_images:galleryPayload(handle_file(inputFile)),
   original_prompt:prompt,
   enable_extend:false,
   custom_size:false,
   quality,
   seed:0,
   randomize_seed:true
  });
  const values=prep.data as unknown[];
  // La cuarta salida es gr.State, que Gradio almacena en la sesión.
  // El cliente solo devuelve las salidas públicas (normalmente 3).
  if(!Array.isArray(values)||values.length<2)throw Error('La preparación no devolvió la semilla esperada.');
  seed=typeof values[1]==='number'?values[1]:0;
  // NO leer prep.data[3]: el estado se pasa automáticamente entre
  // prepare_request y generate_request usando el mismo Client/session_hash.
 }catch(err){throw explainQwenError(err,'preparacion');}

 update('3/4 · Generando imagen. La cola del servidor gratuito puede demorar…');
 let source='';
 try{
  const generated=await client.predict('/generate_request',{
   // request_state es un gr.State implícito; no se suministra manualmente.
   original_prompt:prompt,
   enable_extend:false,
   custom_size:false,
   log_dir:'',
   seed,
   height:1536,
   width:1024,
   negative_prompt:''
  });
  source=fileSource((generated.data as unknown[])?.[0]);
  if(!source)throw Error('El servicio no devolvió una imagen.');
 }catch(err){throw explainQwenError(err,'generacion');}

 update('4/4 · Recuperando la edición en Editor IA…');
 try{
  let blob:Blob;
  if(source.startsWith('data:image/'))blob=await fetch(source).then(r=>r.blob());
  else{
   const url=new URL(source);
   if(url.protocol!=='https:'||(!url.hostname.endsWith('.hf.space')&&!url.hostname.endsWith('.huggingface.co')))
    throw Error('La dirección de la imagen no pertenece a Hugging Face.');
   const result=await fetch(url.toString());
   if(!result.ok)throw Error('La descarga devolvió HTTP '+result.status+'.');
   blob=await result.blob();
  }
  if(!blob.size||!blob.type.startsWith('image/'))throw Error('El archivo generado está vacío o no es una imagen.');
  return blob;
 }catch(err){throw explainQwenError(err,'descarga');}
}
