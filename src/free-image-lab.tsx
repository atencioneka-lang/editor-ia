import {useState} from 'react';
import {ExternalLink, Copy, ShieldAlert, FlaskConical, Info, CheckCircle2} from 'lucide-react';

// Demos públicas y gratuitas mientras el proveedor mantenga sus cuotas.
const PROVIDERS=[
 {id:'qwen-loras',label:'Qwen Edit LoRAs Fast — alternativa',page:'https://huggingface.co/spaces/prithivMLmods/Qwen-Image-Edit-2511-LoRAs-Fast',embed:'https://prithivmlmods-qwen-image-edit-2511-loras-fast.hf.space/'},
 {id:'flux-klein',label:'FLUX.2 Klein 4B — modelo ligero',page:'https://huggingface.co/spaces/black-forest-labs/FLUX.2-klein-4B',embed:'https://black-forest-labs-flux-2-klein-4b.hf.space/'},
 {id:'qwen-original',label:'Qwen 2511 Fast — servidor anterior',page:'https://huggingface.co/spaces/linoyts/Qwen-Image-Edit-2511-Fast',embed:'https://linoyts-qwen-image-edit-2511-fast.hf.space/'}
] as const;
type ProviderId=(typeof PROVIDERS)[number]['id'];
const DEFAULT_PROMPT='Mejora la calidad y la apariencia natural de esta fotografía. Conserva estrictamente la misma identidad facial, expresión, contextura, proporciones físicas, ropa, postura, composición y fondo. No inventes rasgos ni cambies elementos que no he indicado.';

export function FreeImageLab(){
 const [prompt,setPrompt]=useState(DEFAULT_PROMPT);
 const [copied,setCopied]=useState(false);
 const [providerId,setProviderId]=useState<ProviderId>('qwen-loras');
 const provider=PROVIDERS.find(item=>item.id===providerId)??PROVIDERS[0];
 const copy=async()=>{
  try {
   await navigator.clipboard.writeText(prompt);
   setCopied(true);
  }catch{
   const area=document.createElement('textarea');
   area.value=prompt;document.body.append(area);area.select();
   document.execCommand('copy');area.remove();setCopied(true);
  }
 };
 return <section className="free-lab" aria-label="Laboratorio gratuito de edición generativa">
   <div className="free-lab-intro">
     <div className="free-lab-title"><FlaskConical size={23}/><div><h1>Laboratorio IA gratuito</h1><p>Prueba un modelo alternativo si aparece RuntimeError: no es un error de tu navegador.</p></div></div>
     <a className="secondary free-lab-link" href={provider.page} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Abrir servicio directamente</a>
   </div>
   <div className="free-lab-provider-picker">
     <label htmlFor="free-provider">Modelo / servidor de prueba</label>
     <select id="free-provider" value={providerId} onChange={e=>setProviderId(e.target.value as ProviderId)}>
       {PROVIDERS.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
     </select>
     <p>Los sitios anuncian disponibilidad en Hugging Face, pero no hemos verificado que completen tu solicitud. Todos pueden tener colas, errores y límites gratuitos. Cambiar de modelo reinicia el panel.</p>
   </div>
   <div className="free-lab-warning" role="note">
     <ShieldAlert size={19}/>
     <div><strong>Servicio externo, todavía en evaluación.</strong>
     <p>Sube la fotografía dentro del panel externo: se enviará al proveedor de Hugging Face, no a tu propia web. No subas imágenes privadas o sensibles. Editor IA no puede arreglar errores del servidor externo.</p></div>
   </div>
   <div className="free-lab-how">
     <div className="free-lab-step"><span>1</span> Escribe y copia la instrucción.</div>
     <div className="free-lab-step"><span>2</span> Sube la fotografía dentro del panel externo y pega el texto.</div>
     <div className="free-lab-step"><span>3</span> Ejecuta la edición. Si falla, cambia el modelo de arriba.</div>
   </div>
   <div className="free-lab-prompt">
     <label htmlFor="free-lab-instruction">Instrucción de edición (español)</label>
     <textarea id="free-lab-instruction" rows={3} value={prompt} onChange={e=>{setPrompt(e.target.value);setCopied(false)}}/>
     <button className="primary" disabled={!prompt.trim()} onClick={()=>{void copy()}}><Copy size={15}/>{copied?'Instrucción copiada':'Copiar instrucción'}</button>
   </div>
   <div className="free-lab-provider">
     <div className="free-lab-provider-heading"><CheckCircle2 size={16}/> Demostración externa: {provider.label} <span>Disponibilidad variable</span></div>
     <iframe key={provider.id} src={provider.embed} title={'Demostración de '+provider.label} loading="lazy" allow="clipboard-read; clipboard-write" referrerPolicy="strict-origin-when-cross-origin"/>
     <div className="free-lab-fallback"><Info size={15}/> Si aparece «RuntimeError», prueba otro modelo en el selector. También puedes <a href={provider.page} target="_blank" rel="noopener noreferrer">abrir este proveedor directamente</a>. La aplicación no controla sus servidores ni garantiza generación inmediata.</div>
   </div>
 </section>;
}
