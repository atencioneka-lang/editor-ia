import React, {useState} from 'react';
import {ExternalLink, Copy, ShieldAlert, FlaskConical, Info, CheckCircle2} from 'lucide-react';

const DEMO_PAGE='https://huggingface.co/spaces/linoyts/Qwen-Image-Edit-2511-Fast';
const DEMO_EMBED='https://linoyts-qwen-image-edit-2511-fast.hf.space/';
const DEFAULT_PROMPT='Mejora la calidad y la apariencia natural de esta fotografía. Conserva estrictamente la misma identidad facial, expresión, contextura, proporciones físicas, ropa, postura, composición y fondo. No inventes rasgos ni cambies elementos que no he indicado.';

export function FreeImageLab(){
 const [prompt,setPrompt]=useState(DEFAULT_PROMPT);
 const [copied,setCopied]=useState(false);
 const copy=async()=>{
  try {
   await navigator.clipboard.writeText(prompt);
   setCopied(true);
  }catch{
   // Un navegador puede bloquear el portapapeles en contexto no seguro.
   const area=document.createElement('textarea');area.value=prompt;document.body.append(area);area.select();
   document.execCommand('copy');area.remove();setCopied(true);
  }
 };
 return <section className="free-lab" aria-label="Laboratorio gratuito de edición generativa">
   <div className="free-lab-intro">
     <div className="free-lab-title"><FlaskConical size={23}/><div><h1>Laboratorio IA gratuito</h1><p>Prueba Qwen Image Edit 2511 Fast antes de adoptarlo como motor principal.</p></div></div>
     <a className="secondary free-lab-link" href={DEMO_PAGE} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Abrir servicio directamente</a>
   </div>
   <div className="free-lab-warning" role="note">
      <ShieldAlert size={19}/>
      <div><strong>Prueba pública, no integrada aún con el editor.</strong>
      <p>Debes cargar tu fotografía dentro del panel externo. Esa foto se envía al servidor de Hugging Face, no a GitHub Pages. Evita imágenes privadas o sensibles. El servicio puede tener colas, exigir iniciar sesión o quedarse sin cuota gratuita.</p></div>
   </div>
   <div className="free-lab-how">
     <div className="free-lab-step"><span>1</span> Escribe tu instrucción aquí y cópiala.</div>
     <div className="free-lab-step"><span>2</span> Dentro del panel, sube la fotografía y pega la instrucción.</div>
     <div className="free-lab-step"><span>3</span> Pulsa <strong>Edit!</strong> y evalúa el resultado antes de decidir.</div>
   </div>
   <div className="free-lab-prompt">
     <label htmlFor="free-lab-instruction">Instrucción de edición (español)</label>
     <textarea id="free-lab-instruction" rows={3} value={prompt} onChange={e=>{setPrompt(e.target.value);setCopied(false)}}/>
     <button className="primary" disabled={!prompt.trim()} onClick={()=>{void copy()}}><Copy size={15}/>{copied?'Instrucción copiada':'Copiar instrucción'}</button>
   </div>
   <div className="free-lab-provider">
     <div className="free-lab-provider-heading"><CheckCircle2 size={16}/> Demo externa alojada en GPU de Hugging Face <span>4 pasos de inferencia</span></div>
     <iframe src={DEMO_EMBED} title="Demostración Qwen Image Edit 2511 Fast" loading="lazy" allow="clipboard-read; clipboard-write" referrerPolicy="strict-origin-when-cross-origin"/>
     <div className="free-lab-fallback"><Info size={15}/> Si el panel no carga o se bloquea, <a href={DEMO_PAGE} target="_blank" rel="noopener noreferrer">abre la demostración directamente</a>. La calidad y la velocidad dependen de su proveedor. No se ha comprobado aún una edición con tus imágenes.</div>
   </div>
 </section>;
}
