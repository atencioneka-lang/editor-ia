import {useState} from 'react';
import {ExternalLink, Copy, ShieldAlert, FlaskConical, Info, CheckCircle2} from 'lucide-react';

// Demos públicas y gratuitas mientras el proveedor mantenga sus cuotas.
const PROVIDERS=[
 {id:'qwen-21',label:'Qwen-Image 2.1 — más fidelidad (primera prueba)',page:'https://huggingface.co/spaces/Qwen/Qwen-Image-2.1',embed:'https://qwen-qwen-image-2-1.hf.space/'},
 {id:'flux-3',label:'FLUX 3 Image Klein — alternativa moderna',page:'https://huggingface.co/spaces/black-forest-labs/flux-3-image-klein',embed:'https://black-forest-labs-flux-3-image-klein.hf.space/'},
 {id:'qwen-21-community',label:'Qwen-Image 2.1 — otro servidor',page:'https://huggingface.co/spaces/hugging-apps/qwen-image-2-1',embed:'https://hugging-apps-qwen-image-2-1.hf.space/'}
] as const;
type ProviderId=(typeof PROVIDERS)[number]['id'];
const DEFAULT_PROMPT='Mejora la calidad y la apariencia natural de esta fotografía. Conserva estrictamente la misma identidad facial, expresión, contextura, proporciones físicas, ropa, postura, composición y fondo. No inventes rasgos ni cambies elementos que no he indicado.';

export function FreeImageLab(){
 const [prompt,setPrompt]=useState(DEFAULT_PROMPT);
 const [copied,setCopied]=useState(false);
 const [providerId,setProviderId]=useState<ProviderId>('qwen-21');
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
     <div className="free-lab-title"><FlaskConical size={23}/><div><h1>Laboratorio IA gratuito</h1><p>Segunda ronda: modelos con mayor calidad de edición que los anteriores. Primero prueba Qwen-Image 2.1.</p></div></div>
     <a className="secondary free-lab-link" href={provider.page} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Abrir servicio directamente</a>
   </div>
   <div className="free-lab-provider-picker">
     <label htmlFor="free-provider">Modelo / servidor de prueba</label>
     <select id="free-provider" value={providerId} onChange={e=>setProviderId(e.target.value as ProviderId)}>
       {PROVIDERS.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
     </select>
     <p>Las demostraciones aparecen en ejecución en Hugging Face, pero no hemos probado todavía la generación con tus fotografías. Gratis bajo las cuotas del proveedor; no hay garantía de tiempo de respuesta. Cambiar de modelo reinicia el panel.</p>
   </div>
   <div className="free-lab-warning" role="note">
     <ShieldAlert size={19}/>
     <div><strong>Servicio externo, todavía en evaluación.</strong>
     <p>Sube la fotografía dentro del panel externo: se enviará al proveedor de Hugging Face, no a tu propia web. No subas imágenes privadas o sensibles. Editor IA no puede arreglar errores del servidor externo.</p></div>
   </div>
   <div className="free-lab-how">
     <div className="free-lab-step"><span>1</span> Escribe y copia la instrucción.</div>
     <div className="free-lab-step"><span>2</span> Sube la fotografía dentro del panel externo y pega el texto.</div>
     <div className="free-lab-step"><span>3</span> Genera una sola vez y comprueba rostro, piel y proporciones. Si la calidad sigue siendo insuficiente, no gastes más intentos.</div>
   </div>
   <div className="free-lab-prompt">
     <label htmlFor="free-lab-instruction">Instrucción de edición (español)</label>
     <textarea id="free-lab-instruction" rows={3} value={prompt} onChange={e=>{setPrompt(e.target.value);setCopied(false)}}/>
     <button className="primary" disabled={!prompt.trim()} onClick={()=>{void copy()}}><Copy size={15}/>{copied?'Instrucción copiada':'Copiar instrucción'}</button>
   </div>
   <div className="free-lab-provider">
     <div className="free-lab-provider-heading"><CheckCircle2 size={16}/> Demostración externa: {provider.label} <span>Disponibilidad variable</span></div>
     <iframe key={provider.id} src={provider.embed} title={'Demostración de '+provider.label} loading="lazy" allow="clipboard-read; clipboard-write" referrerPolicy="strict-origin-when-cross-origin"/>
     <div className="free-lab-fallback"><Info size={15}/> Si aparece «RuntimeError» o la demo no carga, cambia de proveedor o <a href={provider.page} target="_blank" rel="noopener noreferrer">ábrelo directamente</a>. Si la primera edición no mantiene la calidad, descártalo. Esta es una demostración externa, no una integración directa del motor.</div>
   </div>
 </section>;
}
