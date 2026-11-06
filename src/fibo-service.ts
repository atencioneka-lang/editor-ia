import {Client,handle_file} from '@gradio/client';
import {parseFiboImageData} from './fibo-contract';

export async function editWithFibo(photo:Blob,mask:Blob|null,prompt:string,progress:(status:string)=>void):Promise<Blob>{
 if(!photo.size||!prompt.trim())throw Error('Selecciona una foto e indica la edición.');
 const server='briaai/Fibo-2.0-editing';
 let stage='conexión';
 try{
  progress('1/3 · Conectando con FIBO 2.0 Edit Turbo…');
  const client=await Client.connect(server);
  stage='generación';
  progress(mask?'2/3 · Enviando imagen y zona seleccionada al modelo…':'2/3 · Enviando la fotografía al modelo…');
  const uploaded=new File([photo],'fotografia.png',{type:'image/png'});
  const selected=mask?new File([mask],'seleccion.png',{type:'image/png'}):null;
  const output=await client.predict('/edit',{
   source:handle_file(uploaded),
   instruction:prompt,
   json_instruction:'',
   ref2:null,ref3:null,ref4:null,
   mask:selected?handle_file(selected):null,
   seed:42,
   randomize:true,
   steps:4
  });
  const dataUrl=parseFiboImageData(output);
  stage='descarga';
  progress('3/3 · Recibiendo imagen generada en Editor IA…');
  const result=await fetch(dataUrl).then(r=>r.blob());
  if(!result.size||result.type!=='image/png')throw Error('El resultado recibido no es un PNG válido.');
  return result;
 }catch(error){
  const detail=error instanceof Error?error.message:String(error);
  let reason=detail;
  if(/queue|quota|GPU|rate.limit|too.many|busy|time.limit|resources/i.test(detail))
   reason='El servidor gratuito está ocupado o alcanzó su cuota. No es un fallo del editor.';
  else if(/content|policy|safety|moderation|classifier/i.test(detail))
   reason='El proveedor rechazó la solicitud según sus reglas de seguridad.';
  else if(/Failed to fetch|network|CORS|fetch failed/i.test(detail))
   reason='El navegador no pudo comunicarse con el servidor externo.';
  throw Error('FIBO ('+stage+'): '+reason.slice(0,350));
 }
}
