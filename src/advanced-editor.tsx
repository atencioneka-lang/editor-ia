import {useEffect,useRef,useState} from 'react';
import type {PointerEvent as ReactPointerEvent} from 'react';
import {Brush,Download,Copy,ImagePlus,ExternalLink,Eraser,Trash2,ShieldCheck,Images,Info,SlidersHorizontal} from 'lucide-react';
import {LOCAL_EFFECTS,localFilter,type LocalEffect} from './local-effects';
import {GOALS,defaultProtections,buildEditPrompt,type EditGoal,type Protections} from './edit-plan';

type Photo={url:string;name:string;width:number;height:number;owned:boolean};
type SourcePhoto={url:string;name:string;width:number;height:number}|null;
const MAX_INPUT_BYTES=24*1024*1024;
const MAX_SIDE=2560;
const MAX_AREA=7_000_000;

function maskSize(width:number,height:number):[number,number]{
 const ratio=Math.min(1,MAX_SIDE/Math.max(width,height),Math.sqrt(MAX_AREA/(width*height)));
 return [Math.max(1,Math.round(width*ratio)),Math.max(1,Math.round(height*ratio))];
}
async function asPhoto(file:File):Promise<Photo> {
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Utiliza JPG, PNG o WEBP.');
 if(file.size>MAX_INPUT_BYTES)throw Error('La fotografía supera los 24 MB permitidos en este editor.');
 const url=URL.createObjectURL(file);
 try {
  const img=new Image();img.src=url;await img.decode();
  if(!img.naturalWidth||!img.naturalHeight)throw Error('La fotografía no se pudo leer.');
  return {url,name:file.name,width:img.naturalWidth,height:img.naturalHeight,owned:true};
 }catch(err){URL.revokeObjectURL(url);throw err;}
}
async function photoImage(source:Photo):Promise<HTMLImageElement>{
 const img=new Image();img.src=source.url;await img.decode();return img;
}
async function savePng(canvas:HTMLCanvasElement,name:string):Promise<void>{
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('No se pudo crear el archivo PNG.')),'image/png'));
 const url=URL.createObjectURL(blob);
 try{const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();}
 finally{window.setTimeout(()=>URL.revokeObjectURL(url),15_000);}
}

export function AdvancedEditor({initialImage}:{initialImage:SourcePhoto}){
 const [photo,setPhoto]=useState<Photo|null>(()=>initialImage?{...initialImage,owned:false}:null);
 const [result,setResult]=useState<Photo|null>(null);
 const [goal,setGoal]=useState<EditGoal>('restore');
 const [preserve,setPreserve]=useState<Protections>(defaultProtections('restore'));
 const [instruction,setInstruction]=useState('Mejora la nitidez y textura natural sin cambiar detalles de identidad.');
 const [brushSize,setBrushSize]=useState(5);
 const [eraser,setEraser]=useState(false);
 const [hasSelection,setHasSelection]=useState(false);
 const [notice,setNotice]=useState('Importa una fotografía o utiliza la que ya cargaste en Fotografías.');
 const [copied,setCopied]=useState(false);
 const [compare,setCompare]=useState(50);
 const [localEffect,setLocalEffect]=useState<LocalEffect>('brightness');
 const [localStrength,setLocalStrength]=useState(35);
 const [applying,setApplying]=useState(false);
 const paintRef=useRef<HTMLCanvasElement>(null);
 const painting=useRef(false);
 const fileRef=useRef<HTMLInputElement>(null);
 const resultRef=useRef<HTMLInputElement>(null);
 useEffect(()=>()=>{if(photo?.owned)URL.revokeObjectURL(photo.url)},[photo]);
 useEffect(()=>()=>{if(result?.owned)URL.revokeObjectURL(result.url)},[result]);
 useEffect(()=>{
  if(!photo||!paintRef.current)return;
  const [w,h]=maskSize(photo.width,photo.height);
  paintRef.current.width=w;paintRef.current.height=h;
  paintRef.current.getContext('2d')?.clearRect(0,0,w,h);
  setHasSelection(false);
  setNotice('Imagen preparada. Pinta la zona que deseas modificar; el original se conserva.');
 },[photo]);
 const load=(file:File|null,asResult:boolean)=>{
  if(!file)return;
  void asPhoto(file).then(newPhoto=>{
   if(asResult){setResult(newPhoto);setCompare(50);setNotice('Resultado cargado. Arrastra el comparador para revisar los cambios.');}
   else{setPhoto(newPhoto);setResult(null);}
  }).catch(err=>setNotice(err instanceof Error?err.message:'No se pudo abrir la imagen.'));
 };
 const onGoal=(next:EditGoal)=>{
  setGoal(next);setPreserve(defaultProtections(next));setCopied(false);
  if(next==='restore')setInstruction('Mejora la nitidez y textura natural sin cambiar detalles de identidad.');
  else setInstruction('');
 };
 const prompt=buildEditPrompt(goal,instruction,preserve,hasSelection);
 const copyPrompt=()=>{
  void navigator.clipboard.writeText(prompt).then(()=>{
   setCopied(true);setNotice('Instrucciones copiadas. Pégalas en un modelo de edición compatible.');
  }).catch(()=>setNotice('El navegador bloqueó el portapapeles. Selecciona el texto de la vista previa y cópialo manualmente.'));
 };
 const paint=(e:ReactPointerEvent<HTMLCanvasElement>,start:boolean)=>{
  const canvas=paintRef.current;if(!canvas)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const rect=canvas.getBoundingClientRect();
  const x=(e.clientX-rect.left)*canvas.width/rect.width;
  const y=(e.clientY-rect.top)*canvas.height/rect.height;
  const diameter=Math.max(5,Math.min(canvas.width,canvas.height)*brushSize/100);
  ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=diameter;
  ctx.globalCompositeOperation=eraser?'destination-out':'source-over';
  ctx.strokeStyle=eraser?'rgba(0,0,0,1)':'rgba(102,144,255,0.94)';
  ctx.fillStyle=ctx.strokeStyle;
  if(start){
   ctx.beginPath();ctx.arc(x,y,diameter/2,0,Math.PI*2);ctx.fill();
   ctx.beginPath();ctx.moveTo(x,y);
  }else{ctx.lineTo(x,y);ctx.stroke();}
  if(!eraser)setHasSelection(true);
 };
 const down=(e:ReactPointerEvent<HTMLCanvasElement>)=>{
  if(!photo||e.button!==0)return;
  e.preventDefault();
  e.currentTarget.setPointerCapture(e.pointerId);
  painting.current=true;paint(e,true);
 };
 const move=(e:ReactPointerEvent<HTMLCanvasElement>)=>{
  if(!painting.current)return;e.preventDefault();paint(e,false);
 };
 const done=()=>{painting.current=false;paintRef.current?.getContext('2d')?.closePath();};
 const clear=()=>{const c=paintRef.current;c?.getContext('2d')?.clearRect(0,0,c.width,c.height);setHasSelection(false);setNotice('Selección eliminada.');};
 const prepared=async(mask:boolean)=>{
  if(!photo)return;
  if(mask&&!hasSelection){setNotice('Primero pinta la zona que deseas modificar.');return;}
  try{
   const src=await photoImage(photo);
   const [w,h]=maskSize(photo.width,photo.height);
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
   const ctx=canvas.getContext('2d',{willReadFrequently:mask});if(!ctx)throw Error('No se pudo crear la imagen.');
   if(mask){
    const selected=paintRef.current;if(!selected)throw Error('No hay máscara.');
    const pixelCtx=selected.getContext('2d',{willReadFrequently:true});if(!pixelCtx)throw Error('No se pudo leer la selección.');
    const marked=pixelCtx.getImageData(0,0,w,h).data;
    const data=ctx.createImageData(w,h);
    for(let i=0;i<marked.length;i+=4){
     data.data[i]=255;data.data[i+1]=255;data.data[i+2]=255;
     data.data[i+3]=marked[i+3]>24?0:255;
    }
    ctx.putImageData(data,0,0);
   }else ctx.drawImage(src,0,0,w,h);
   await savePng(canvas,photo.name.replace(/\.[^.]+$/,'')+(mask?'-mascara-edicion.png':'-preparada.png'));
   setNotice(mask?'Máscara PNG exportada. Transparente = zona a editar; blanco opaco = conservar.':'Imagen PNG preparada. Es una copia para el modelo; el original no se ha modificado.');
  }catch(err){setNotice(err instanceof Error?err.message:'No se pudo exportar.');}
 };
 const applyLocal=async()=>{
  if(!photo||applying)return;
  setApplying(true);
  setNotice('Aplicando corrección fotográfica local dentro de Editor IA…');
  try{
   const img=await photoImage(photo);
   const maxPixels=4_000_000;
   const ratio=Math.min(1,2560/Math.max(photo.width,photo.height),Math.sqrt(maxPixels/(photo.width*photo.height)));
   const w=Math.max(1,Math.round(photo.width*ratio)),h=Math.max(1,Math.round(photo.height*ratio));
   const base=document.createElement('canvas');base.width=w;base.height=h;
   const baseCtx=base.getContext('2d');if(!baseCtx)throw Error('El navegador no pudo crear el lienzo.');
   baseCtx.drawImage(img,0,0,w,h);
   const layer=document.createElement('canvas');layer.width=w;layer.height=h;
   const layerCtx=layer.getContext('2d');if(!layerCtx)throw Error('No se pudo crear la corrección.');
   layerCtx.filter=localFilter(localEffect,localStrength);
   layerCtx.drawImage(img,0,0,w,h);layerCtx.filter='none';
   if(hasSelection){
    const selection=paintRef.current;
    if(!selection)throw Error('Falta la selección.');
    layerCtx.globalCompositeOperation='destination-in';
    layerCtx.drawImage(selection,0,0,w,h);
    layerCtx.globalCompositeOperation='source-over';
   }
   baseCtx.drawImage(layer,0,0);
   const blob=await new Promise<Blob>((resolve,reject)=>base.toBlob(b=>b?resolve(b):reject(Error('No se pudo crear el resultado.')),'image/png'));
   const name=photo.name.replace(/\.[^.]+$/,'')+'-corregida.png';
   const next=await asPhoto(new File([blob],name,{type:'image/png'}));
   setResult(next);setCompare(50);
   setNotice('Ajuste local aplicado: '+LOCAL_EFFECTS.find(e=>e.id===localEffect)?.label+' ('+w+' × '+h+'). Revisa el resultado en Antes / después. No se ha generado ropa, postura ni detalle mediante IA.');
  }catch(err){setNotice(err instanceof Error?err.message:'Falló la corrección.');}
  finally{setApplying(false);}
 };
 const guards:[keyof Protections,string][]=[
  ['face','Preservar rostro e identidad'],
  ['body','Preservar contextura y proporciones'],
  ['pose','Preservar postura'],
  ['clothes','Preservar prendas no solicitadas'],
  ['background','Preservar fondo y encuadre']
 ];
 const size=photo?maskSize(photo.width,photo.height):null;
 return <section className="advanced-editor" aria-label="Edición avanzada por zonas">
  <div className="advanced-heading">
   <div><h1>Editor avanzado · A + B + C</h1><p>Control de instrucciones, preservación de identidad y máscaras de edición, sin alterar el archivo original.</p></div>
   <span className="advanced-local">Preparación local y privada</span>
  </div>
  <div className="advanced-disclaimer"><Info size={18}/><div><strong>La preparación es funcional; la edición generativa aún no está integrada.</strong> Puedes crear máscaras e instrucciones reales, pero cambiar una prenda o una postura requiere enviarlas a un modelo compatible. Los servicios externos tienen sus propios límites y políticas.</div></div>
  <div className="advanced-layout">
   <div className="advanced-preview">
    <div className="advanced-section-title">1. Imagen y selección</div>
    <div className="advanced-upload-row">
     <button className="secondary" onClick={()=>fileRef.current?.click()}><ImagePlus size={16}/> Abrir fotografía</button>
     <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>{load(e.target.files?.[0]??null,false);e.target.value='';}}/>
     <button className="secondary" disabled={!photo} onClick={()=>{clear();setEraser(false)}}><Trash2 size={15}/> Limpiar selección</button>
    </div>
    {photo?<div className="advanced-photo-frame"><div className="advanced-photo-layer" style={{aspectRatio:photo.width+'/'+photo.height}}>
      <img src={photo.url} alt="Fotografía original sin modificaciones"/>
      <canvas ref={paintRef} onPointerDown={down} onPointerMove={move} onPointerUp={done} onPointerCancel={done} onLostPointerCapture={done} aria-label="Pinta con el ratón la zona que deseas editar"/>
     </div></div>:<div className="advanced-empty">Abre una imagen JPG, PNG o WEBP para seleccionar las zonas a editar.</div>}
    <div className="advanced-tools">
     <button className={!eraser?'advanced-selected':'secondary'} onClick={()=>setEraser(false)}><Brush size={15}/> Pintar zona</button>
     <button className={eraser?'advanced-selected':'secondary'} onClick={()=>setEraser(true)}><Eraser size={15}/> Borrar selección</button>
     <label>Grosor <input type="range" min="1" max="18" value={brushSize} onChange={e=>setBrushSize(Number(e.target.value))}/>{brushSize}%</label>
    </div>
    {photo&&<p className="advanced-footnote">Original: {photo.width} × {photo.height}. Imagen preparada para máscara: {size?.[0]} × {size?.[1]}. Color azul: zona de edición. El original no se exporta modificado.</p>}
    <div className="advanced-export-row">
      <button className="secondary" disabled={!photo} onClick={()=>{void prepared(false)}}><Download size={15}/> Descargar imagen preparada</button>
      <button className="secondary" disabled={!photo||!hasSelection} onClick={()=>{void prepared(true)}}><Download size={15}/> Descargar máscara PNG</button>
    </div>
    <div className="advanced-section-title advanced-result-head">4. Aplicar corrección local dentro de la app</div>
    <p className="advanced-footnote">Estos ajustes son inmediatos y no generativos. Se aplican a la zona pintada en azul; sin selección, a la imagen completa. No pueden cambiar prendas ni posturas.</p>
    <div className="local-effects-grid">{LOCAL_EFFECTS.map(item=><button key={item.id} className={localEffect===item.id?'active':''} onClick={()=>setLocalEffect(item.id)}><strong>{item.label}</strong><small>{item.description}</small></button>)}</div>
    <label className="local-effect-slider">Intensidad: {localStrength}% <input type="range" min="0" max="100" value={localStrength} onChange={e=>setLocalStrength(Number(e.target.value))}/></label>
    <button className="primary" disabled={!photo||applying} onClick={()=>{void applyLocal()}}><SlidersHorizontal size={16}/>{applying?'Procesando imagen…':'Aplicar ajuste y ver resultado'}</button>
    <div className="advanced-section-title advanced-result-head">5. Comparar antes y después</div>
    <div className="advanced-upload-row">
      <button className="secondary" onClick={()=>resultRef.current?.click()} disabled={!photo}><Images size={15}/> Abrir resultado editado</button>
      <input ref={resultRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>{load(e.target.files?.[0]??null,true);e.target.value='';}}/>
      {result&&<button className="secondary" onClick={()=>setResult(null)}>Quitar resultado</button>}
      {result&&<a className="secondary" href={result.url} download={result.name}><Download size={15}/> Descargar resultado</a>}
    </div>
    {photo&&result&&<><div className="advanced-compare" style={{aspectRatio:photo.width+'/'+photo.height}}>
      <img src={photo.url} alt="Antes, original"/>
      <img src={result.url} alt="Después, resultado" style={{clipPath:'inset(0 '+(100-compare)+'% 0 0)'}}/>
      <span className="advanced-divider" style={{left:compare+'%'}}/>
      <span className="advanced-before">Original</span><span className="advanced-after">Editada</span>
     </div><label className="advanced-compare-range">Antes / después <input type="range" min="0" max="100" value={compare} onChange={e=>setCompare(Number(e.target.value))}/></label></>}
   </div>
   <div className="advanced-controls">
    <div className="advanced-section-title">2. Tipo de edición</div>
    <div className="advanced-goals">{GOALS.map(item=><button key={item.id} className={goal===item.id?'active':''} onClick={()=>onGoal(item.id)}><strong>{item.title}</strong><small>{item.description}</small></button>)}</div>
    <label className="advanced-textarea-label" htmlFor="advanced-instruction">Indica exactamente qué quieres cambiar</label>
    <textarea id="advanced-instruction" rows={4} value={instruction} placeholder="Ejemplo: cambiar la chaqueta por una de color azul sin modificar el rostro ni el fondo" onChange={e=>{setInstruction(e.target.value);setCopied(false)}}/>
    <div className="advanced-section-title">3. Elementos que deben conservarse</div>
    <div className="advanced-protections">{guards.map(([key,label])=><label key={key}><input type="checkbox" checked={preserve[key]} onChange={e=>{setPreserve(s=>({...s,[key]:e.target.checked}));setCopied(false);}}/><span>{label}</span></label>)}</div>
    <p className="advanced-footnote">Al elegir un cambio de postura o de ropa, se permite modificar ese elemento. Puedes ajustar las casillas manualmente. La preservación depende de la capacidad real del modelo.</p>
    <label className="advanced-textarea-label" htmlFor="advanced-prompt-preview">Instrucción preparada</label>
    <textarea id="advanced-prompt-preview" rows={8} readOnly value={prompt} onFocus={e=>e.currentTarget.select()}/>
    <button className="primary advanced-copy" disabled={!photo||(!instruction.trim()&&goal!=='restore')} onClick={copyPrompt}><Copy size={16}/>{copied?'Instrucciones copiadas':'Copiar instrucciones completas'}</button>
    <div className="advanced-notice" role="status"><ShieldCheck size={16}/>{notice}</div>
    <div className="advanced-next">
      <div className="advanced-section-title">Probar en un modelo externo</div>
      <p>Abre la demostración en otra pestaña y pega la instrucción. Si admite máscaras, sube la fotografía preparada y su máscara. Las imágenes que subas dejarán tu dispositivo.</p>
      <a href="https://huggingface.co/spaces/Qwen/Qwen-Image-2.1" target="_blank" rel="noopener noreferrer" className="secondary"><ExternalLink size={16}/> Abrir Qwen Image 2.1</a>
    </div>
   </div>
  </div>
 </section>;
}
