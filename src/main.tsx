import React, {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Upload,Image as ImageIcon,Video,Sparkles,Undo2,Redo2,Download,RotateCcw,ShieldCheck,Play,Pause,Plus,MousePointer2,Scissors,Info,ZoomIn,ZoomOut,StopCircle,Scan,CheckCircle2,RefreshCw,FlaskConical} from 'lucide-react';
import {DEFAULT,LIMITS,parseInstruction,render,loadImage,saveCanvas,dimensions,type Settings} from './engine';
import {couldNeedNeural,dataUrlToAsset,denoiseEdges,upscaleNeural,type AiScale} from './ai-upscale';
import './style.css';
import {FreeImageLab} from './free-image-lab';

type PublishedRelease={version:string;revision:string;published:string};
type Asset={image:HTMLImageElement;url:string;width:number;height:number;name:string};
type Revision={settings:Settings;enhanced:Asset|null;noise:number};
const initial=():Revision=>({settings:{...DEFAULT},enhanced:null,noise:0});
const MAX_PIXELS=17_000_000;
const MAX_EXPORT_PIXELS=55_000_000;
const MAX_PREVIEW_PIXELS=4_000_000;

// Las muestras se calculan directamente sobre una zona transformada de la fotografía.
// No es necesario crear un lienzo 4K completo para inspeccionar 256 píxeles.
function makeSample(raw:Asset,revision:Revision,focus:[number,number],requestedSize:number=128):HTMLCanvasElement{
 const [width,height]=dimensions(raw.width,raw.height,revision.settings.rotation);
 const size=Math.max(1,Math.min(requestedSize,width,height));
 const x=Math.max(0,Math.min(width-size,Math.round(focus[0]*width-size/2)));
 const y=Math.max(0,Math.min(height-size,Math.round(focus[1]*height-size/2)));
 const tile=document.createElement('canvas');tile.width=size;tile.height=size;
 const ctx=tile.getContext('2d');if(!ctx)throw Error('No se pudo crear la muestra.');
 ctx.save();ctx.translate(width/2-x,height/2-y);
 ctx.rotate(revision.settings.rotation*Math.PI/180);
 ctx.scale(revision.settings.mirror?-1:1,1);
 ctx.drawImage(raw.image,-raw.width/2,-raw.height/2,raw.width,raw.height);
 ctx.restore();
 const adjusted=render(tile,size,size,{...revision.settings,rotation:0,mirror:false});
 if(revision.noise)denoiseEdges(adjusted,revision.noise);
 return adjusted;
}

function previewLimit(raw:Asset,zoom:boolean):number{
 if(!zoom)return 1200;
 const scale=Math.min(1,Math.sqrt(MAX_PREVIEW_PIXELS/(raw.width*raw.height)));
 return Math.max(1,Math.floor(Math.max(raw.width,raw.height)*scale));
}

const fmt=(n:number)=>new Intl.NumberFormat('es-PE').format(n);
const CURRENT_REVISION=import.meta.env.VITE_DEPLOY_SHA || 'local';
const isPublished=location.hostname.endsWith('.github.io');

function App(){
 const [mode,setMode]=useState<'image'|'video'|'lab'>('image');
 const [availableRelease,setAvailableRelease]=useState<PublishedRelease|null>(null);
 const [asset,setAsset]=useState<Asset|null>(null);
 const [videoURL,setVideoURL]=useState('');const [videoName,setVideoName]=useState('');const [videoDuration,setVideoDuration]=useState(0);const [start,setStart]=useState(0);const [end,setEnd]=useState(0);
 const [history,setHistory]=useState<Revision[]>([initial()]);const [index,setIndex]=useState(0);
 const [draft,setDraft]=useState<Revision|null>(null);
 const active=draft??history[index];const settings=active.settings;const source=active.enhanced||asset;
 const [command,setCommand]=useState('');const [message,setMessage]=useState('Carga una imagen para comenzar.');
 const [compare,setCompare]=useState(false);const [compareAt,setCompareAt]=useState(50);
 const [format,setFormat]=useState<'image/png'|'image/jpeg'>('image/png');
 const [busy,setBusy]=useState(false);const [processing,setProcessing]=useState(false);const [progress,setProgress]=useState(0);const [aiScale,setAiScale]=useState<AiScale>(2);
 const [preview,setPreview]=useState<{before:string;after:string;width:number;height:number}|null>(null);
 const [focus,setFocus]=useState<[number,number]>([.5,.3]);const [zoom,setZoom]=useState(false);
 const [videoPlaying,setVideoPlaying]=useState(false);const [currentTime,setCurrentTime]=useState(0);
 const fileRef=useRef<HTMLInputElement>(null);const videoRef=useRef<HTMLVideoElement>(null);
 const canvasRef=useRef<HTMLCanvasElement>(null);const compareRef=useRef<HTMLCanvasElement>(null);
 const urlsRef=useRef<string[]>([]);const abortRef=useRef<AbortController|null>(null);
 const fileToken=useRef(0);
 useEffect(()=>{
   if(!isPublished)return;
   let cancelled=false;
   const check=async()=>{
     try{
       const url=`${import.meta.env.BASE_URL}release.json?nocache=${Date.now()}`;
       const res=await fetch(url,{cache:'no-store'});
       if(!res.ok)return;
       const release=await res.json() as PublishedRelease;
       if(!cancelled && release.revision && release.revision!==CURRENT_REVISION){setAvailableRelease(release);}
     }catch{ /* En modo sin conexión se mantiene la versión ya cargada. */ }
   };
   void check();
   window.addEventListener('focus',check);
   window.addEventListener('online',check);
   const interval=window.setInterval(check,90_000);
   return()=>{cancelled=true;window.clearInterval(interval);window.removeEventListener('focus',check);window.removeEventListener('online',check);};
 },[]);
 const reloadLatest=()=>{
   if(!availableRelease)return;
   if(window.confirm('Se cargará la versión nueva. Exporta primero los cambios que no hayas guardado. ¿Actualizar ahora?')){
     const url=new URL(window.location.href);
     url.searchParams.set('release',availableRelease.revision.slice(0,12));
     window.location.assign(url.toString());
   }
 };
 useEffect(()=>()=>{abortRef.current?.abort();urlsRef.current.forEach(u=>URL.revokeObjectURL(u));},[]);
 useEffect(()=>()=>{if(videoURL)URL.revokeObjectURL(videoURL)},[videoURL]);
 // Liberar las imágenes que ya no pertenecen al historial de deshacer/rehacer.
 useEffect(()=>{
   const retained=new Set<string>();
   if(asset)retained.add(asset.url);
   for(const step of history)if(step.enhanced)retained.add(step.enhanced.url);
   urlsRef.current=urlsRef.current.filter(url=>{
     if(retained.has(url))return true;
     URL.revokeObjectURL(url);return false;
   });
 },[asset,history]);
 const push=(revision:Revision,msg:string)=>{
   const newHistory=[...history.slice(0,index+1),revision].slice(-30);
   setHistory(newHistory);setIndex(newHistory.length-1);setDraft(null);setMessage(msg);setPreview(null);
 };
 // Arrastrar un control muestra cambios en vivo, pero solo crea un paso de deshacer al soltarlo.
 const commitDraft=()=>{
   if(!draft)return;
   const newHistory=[...history.slice(0,index+1),draft].slice(-30);
   setHistory(newHistory);setIndex(newHistory.length-1);
   setDraft(null);setMessage('Ajuste aplicado. Puedes deshacerlo en un solo paso.');setPreview(null);
 };
 const useOriginal=()=>{push(initial(),'Se ha vuelto a la imagen original. El archivo fuente permanece intacto.');};
 const loadFiles=async(files:FileList|null)=>{
   if(!files?.length)return;const f=files[0];if(fileRef.current)fileRef.current.value='';
   abortRef.current?.abort();const token=++fileToken.current;setDraft(null);setProcessing(false);
   try{
     if(f.type.startsWith('video/')){
       setMode('video');setVideoURL(URL.createObjectURL(f));setVideoName(f.name);setVideoDuration(0);setStart(0);setEnd(0);setPreview(null);
       setMessage('Video cargado. El recorte y la exportación de video aún no están implementados.');
     }else{
       const image=await loadImage(f);
       if(token!==fileToken.current){URL.revokeObjectURL(image.url);return;}
       urlsRef.current.push(image.url);
       setVideoURL('');setAsset({...image,name:f.name});setMode('image');setHistory([initial()]);setIndex(0);setDraft(null);setCompare(false);setZoom(false);setPreview(null);
       setMessage(`Original cargado: ${image.width} × ${image.height}. Puedes probar la IA primero sobre una zona pequeña.`);
     }
   }catch(err){setMessage(err instanceof Error?err.message:'No se pudo abrir el archivo.');}
 };
 function imageWithEdits(raw:Asset,revision:Revision,limit?:number):HTMLCanvasElement{
   const factor=limit?Math.min(1,limit/Math.max(raw.width,raw.height)):1;
   const canvas=render(raw.image,raw.width,raw.height,revision.settings,factor);
   if(revision.noise)denoiseEdges(canvas,revision.noise);
   return canvas;
 }
 useEffect(()=>{
   if(mode!=='image'||!source||!canvasRef.current)return;
   try{
     const img=imageWithEdits(source,active,previewLimit(source,zoom)),target=canvasRef.current;
     target.width=img.width;target.height=img.height;target.getContext('2d')?.drawImage(img,0,0);
     if(compareRef.current&&asset){
       const orig=imageWithEdits(asset,initial(),previewLimit(asset,zoom));
       compareRef.current.width=img.width;compareRef.current.height=img.height;
       compareRef.current.getContext('2d')?.drawImage(orig,0,0,img.width,img.height);
     }
   }catch(err){setMessage(err instanceof Error?err.message:'Error al dibujar la vista previa.');}
 },[source,asset,active,mode,compare,zoom]);
 const applyCommand=()=>{
   if(!asset){setMessage('Importa una fotografía antes de editar.');return;}
   if(couldNeedNeural(command)){
     setMessage('La restauración fotográfica avanzada todavía no está conectada a un modelo de calidad suficiente. ESRGAN Slim no mostró mejoras visibles en tus pruebas, por eso ya no lo ejecuto automáticamente. Puedes acceder a él solo desde «Experimento ESRGAN» si deseas compararlo.');
     setCommand('');return;
   }
   const result=parseInstruction(command,settings);
   if(result.changed)push({...active,settings:result.next},result.message);
   else setMessage(result.message);
   setCommand('');
 };
 const executeNeural=async(sample:boolean,scale:AiScale=aiScale,sampleSize:128|256=128)=>{
   if(!source||!asset||processing)return;
   const [expectedW,expectedH]=dimensions(source.width,source.height,active.settings.rotation);
   const pixels=expectedW*expectedH*scale*scale;
   if(!sample&&pixels>MAX_PIXELS){setMessage(`La ampliación solicitada requiere ${fmt(pixels)} píxeles. El límite preventivo es ${fmt(MAX_PIXELS)}. Prueba 2× o una imagen menor.`);return;}
   const token=fileToken.current;
   const controller=new AbortController();abortRef.current=controller;setProcessing(true);setProgress(0);setPreview(null);
   setMessage(sample?`Preparando muestra neuronal de ${sampleSize} × ${sampleSize} píxeles…`:'Preparando ampliación neuronal. La primera ejecución descarga el modelo, no la fotografía.');
   try{
     let input:HTMLCanvasElement;
     let beforeSample='';
     if(sample){
       input=makeSample(source,active,focus,sampleSize);
       beforeSample=input.toDataURL('image/png');
     }else{
       input=imageWithEdits(source,active);
     }
     const data=await upscaleNeural(input,scale,setProgress,controller.signal);
     if(controller.signal.aborted||token!==fileToken.current)return;
     if(sample){setPreview({before:beforeSample,after:data,width:input.width*scale,height:input.height*scale});setMessage(`Muestra neuronal ${scale}× completada. Es una predicción del modelo; comprueba que el rostro y las texturas sigan siendo naturales.`);}
     else{
       const enhanced=await dataUrlToAsset(data,asset.name);urlsRef.current.push(enhanced.url);
       // Los ajustes previos ya estaban aplicados al lienzo de entrada; se reinician para no duplicarlos.
       push({settings:{...DEFAULT},enhanced,noise:0},`Superresolución neuronal ESRGAN Slim ${scale}× terminada: ${enhanced.width} × ${enhanced.height}. Examina el detalle con zoom antes de exportar.`);
       setCompare(true);setCompareAt(50);
     }
   }catch(err){
     if(controller.signal.aborted){setMessage('Proceso de IA cancelado; tu imagen anterior sigue intacta.');}
     else{setMessage(`No se pudo completar la inferencia: ${err instanceof Error?err.message:String(err)}. Comprueba Internet para descargar el modelo y prueba la muestra 2×.`);}
   }finally{if(abortRef.current===controller)abortRef.current=null;setProcessing(false);}
 };
 const exportImage=async()=>{
   if(!source||busy)return;setBusy(true);
   try{
     const [exportW,exportH]=dimensions(source.width,source.height,active.settings.rotation);
     if(exportW*exportH>MAX_EXPORT_PIXELS){setMessage('La imagen supera el límite de exportación de 55 megapíxeles.');return;}
     if(active.noise>0 && exportW*exportH>12_000_000){setMessage('Para exportar más de 12 megapíxeles, desactiva primero la reducción de ruido local.');return;}
     const canvas=imageWithEdits(source,active);
     await saveCanvas(canvas,(asset?.name||'imagen').replace(/\.[^.]+$/,'')+(active.enhanced?'-IA':''),format);
     setMessage(`Exportación completa: ${canvas.width} × ${canvas.height}. Se guardaron los píxeles realmente generados, sin ampliación adicional simulada.`);
   }catch(err){setMessage(err instanceof Error?err.message:'Falló la exportación.');}
   finally{setBusy(false);}
 };
 const commands=['Aumenta ligeramente la nitidez','Aumenta ligeramente la luz','Reduce la saturación','Blanco y negro','Restablece la imagen'];
 const aspect=source?source.width/source.height:1;
 const imagePreviewWidth=source?Math.max(1,Math.round(dimensions(source.width,source.height,settings.rotation)[0]*Math.min(1,previewLimit(source,true)/Math.max(source.width,source.height)))):0;
 return <div className="app">
   <header className="topbar"><div className="brand"><span className="brand-icon">✳</span><span>EDITOR <b>IA</b></span><span className="version">ALFA 0.7</span></div><div className="top-actions">{availableRelease&&<button className="update-available" onClick={reloadLatest} title="Nueva versión publicada"><RefreshCw size={15}/> Nueva versión {availableRelease.version} · Actualizar</button>}<span className="update-status" title={isPublished?"La versión web se actualiza cuando se publica una revisión":"Este es el servidor local; F5 solo recarga archivos de tu PC"}>{isPublished?"Web · F5 actualiza":"Local · F5 recarga"}</span><span className="saved"><ShieldCheck size={15}/>Original protegido</span><button className="iconbutton" title="Deshacer" disabled={!index||processing} onClick={()=>{setDraft(null);setIndex(i=>i-1)}}><Undo2 size={18}/></button><button className="iconbutton" title="Rehacer" disabled={index>=history.length-1||processing} onClick={()=>{setDraft(null);setIndex(i=>i+1)}}><Redo2 size={18}/></button><button className="primary small" disabled={!source||mode!=='image'||processing||busy} onClick={exportImage}><Download size={16}/>{busy?'Exportando…':'Exportar imagen'}</button></div></header>
   <div className="main"><aside className="sidebar"><div className="sidebar-label">ESPACIO DE TRABAJO</div><button className={`nav ${mode==='image'?'active':''}`} onClick={()=>setMode('image')}><ImageIcon size={19}/> Fotografías</button><button className={`nav ${mode==='video'?'active':''}`} onClick={()=>setMode('video')}><Video size={19}/> Videos <span className="mini">Vista previa</span></button><button className={`nav ${mode==='lab'?'active':''}`} onClick={()=>setMode('lab')}><FlaskConical size={19}/> IA gratis <span className="mini">Prueba</span></button><div className="sidebar-label section">IMPORTAR</div><button className="upload" onClick={()=>fileRef.current?.click()}><Upload size={19}/><span>Seleccionar archivo</span><small>JPG · PNG · WEBP · MP4 · WEBM</small></button><input type="file" ref={fileRef} hidden accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={e=>loadFiles(e.target.files)}/><div className="sidebar-foot">Tus fotografías no se suben a servidores. Los pesos del modelo neuronal se descargan la primera vez desde un CDN público.</div></aside>
   {mode==='lab'?<FreeImageLab/>:<>
   <main className="workspace"><div className="workspace-head"><div><h1>{mode==='image'?'Editor de fotografías':'Estudio de video'}</h1><span>{mode==='image'?'Edición local reversible · restauración generativa avanzada aún no disponible':'Importación y visor; la exportación de video llegará después'}</span></div><span className="status"><span className="dot"/> Procesamiento local</span></div>
   <div className="viewer"><div className="viewer-toolbar"><div className="toolbar-group"><span className="pill">{mode==='image'?'LIENZO':'REPRODUCTOR'}</span><span className="filename">{mode==='image'?(asset?.name||'Sin archivo'):(videoName||'Sin archivo')}</span></div>{mode==='image'&&source&&<div className="toolbar-group"><label className="switch"><input type="checkbox" checked={compare} onChange={e=>setCompare(e.target.checked)}/> Comparar</label><span className="dimension">{fmt(source.width)} × {fmt(source.height)}</span><button className="iconbutton zoom-button" title={zoom?'Ajustar a pantalla':'Zoom real (limitado para imágenes grandes)'} onClick={()=>setZoom(z=>!z)}>{zoom?<ZoomOut size={17}/>:<ZoomIn size={17}/>}</button></div>}</div>
   <div className={`canvas-area ${zoom?'zoom-mode':''}`} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void loadFiles(e.dataTransfer.files)}}>
   {mode==='image'?(source?<div className="image-stage" style={zoom?{width:`${imagePreviewWidth}px`}:{width:`min(100%, ${Math.max(250,aspect*700)}px)`}} onClick={e=>{if(compare)return;const rect=e.currentTarget.getBoundingClientRect();setFocus([Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height))]);}}>
      <canvas ref={canvasRef} className="preview-canvas" style={zoom?{maxHeight:'none',maxWidth:'none'}:{}}/>
      {compare&&<div className="original-overlay" style={{clipPath:`inset(0 ${100-compareAt}% 0 0)`}}><canvas ref={compareRef} className="preview-canvas" aria-label="Original escalado al mismo tamaño para comparación"/></div>}
      {compare&&<><div className="split-line" style={{left:`${compareAt}%`}}/><input className="compare-slider" aria-label="Porcentaje de comparación" type="range" min="0" max="100" value={compareAt} onChange={e=>setCompareAt(Number(e.target.value))}/></>}
      {!compare&&<div className="focus-crosshair" style={{left:`${focus[0]*100}%`,top:`${focus[1]*100}%`}} title="Centro de muestra de IA"/>}
    </div>:<div className="empty"><div className="empty-icon"><ImageIcon size={38}/></div><h2>Tu creatividad comienza aquí</h2><p>Importa una fotografía para editarla sin alterar su archivo original.</p><button className="primary" onClick={()=>fileRef.current?.click()}><Plus size={18}/> Abrir fotografía</button><small>También puedes arrastrar un archivo a esta zona</small></div>):videoURL?<div className="video-stage"><video ref={videoRef} src={videoURL} playsInline onLoadedMetadata={e=>{const d=e.currentTarget.duration;setVideoDuration(Number.isFinite(d)?d:0);setEnd(Number.isFinite(d)?d:0)}} onTimeUpdate={e=>{const t=e.currentTarget.currentTime;setCurrentTime(t);if(end>start&&t>=end){e.currentTarget.pause();setVideoPlaying(false)}}} onPause={()=>setVideoPlaying(false)} onPlay={()=>setVideoPlaying(true)}/></div>:<div className="empty"><div className="empty-icon"><Video size={40}/></div><h2>Prepara tus videos</h2><p>Carga un MP4 o WebM y selecciona el segmento a previsualizar.</p><button className="primary" onClick={()=>fileRef.current?.click()}><Plus size={18}/> Abrir video</button></div>}
   </div>
   {mode==='video'&&videoURL&&<div className="timeline"><div className="timeline-actions"><button className="iconbutton" onClick={()=>{const v=videoRef.current;if(!v)return;if(v.paused){if(v.currentTime>=end)v.currentTime=start;void v.play()}else v.pause()}}>{videoPlaying?<Pause size={20}/>:<Play size={20}/>}</button><span>{currentTime.toFixed(1)} / {videoDuration.toFixed(1)} s</span><span className="timeline-caption"><Scissors size={15}/> Puntos de corte</span></div><div className="trim-row"><label>Inicio <input type="number" min="0" max={end} step="0.1" value={start} onChange={e=>{const t=Math.max(0,Math.min(Number(e.target.value),end));setStart(t);if(videoRef.current)videoRef.current.currentTime=t}}/> s</label><label>Final <input type="number" min={start} max={videoDuration} step="0.1" value={end} onChange={e=>setEnd(Math.min(videoDuration,Math.max(start,Number(e.target.value))))}/> s</label><span>Selección {Math.max(0,end-start).toFixed(1)} s</span></div><p className="video-warning"><Info size={14}/> Los puntos de corte son solo de previsualización; todavía no hay exportación MP4.</p></div>}
   </div>
   {mode==='image'&&source&&<div className="metrics"><span><strong>Original:</strong> {fmt(asset!.width)} × {fmt(asset!.height)}</span><span><strong>Actual:</strong> {fmt(source.width)} × {fmt(source.height)}</span><span><strong>Origen:</strong> {active.enhanced?'ESRGAN Slim':'Sin IA generativa'}</span></div>}
   {preview&&mode==='image'&&<div className="sample-result"><div className="sample-head"><CheckCircle2 size={16}/><strong>Prueba neuronal terminada — {fmt(preview.width)} × {fmt(preview.height)}</strong><button className="secondary" onClick={()=>setPreview(null)}>Cerrar muestra</button></div><div className="sample-pair"><div><span>Antes (ampliado para comparar)</span><img src={preview.before} alt="Recorte original" /></div><div><span>Después — inferencia IA</span><img src={preview.after} alt="Recorte mejorado con IA" /></div></div><p className="hint">La IA puede inventar detalles. Comprueba piel, rostro, cabello y bordes antes de ampliar toda la imagen.</p></div>}
   {processing&&<div className="progress-area"><div className="progress-header"><span>Procesando con ESRGAN Slim… {progress}%</span><button className="secondary" onClick={()=>abortRef.current?.abort()}><StopCircle size={15}/> Cancelar</button></div><progress value={progress} max={100}/><small>La primera carga puede requerir Internet. Evita cerrar esta pestaña mientras termina.</small></div>}
   <div className="message" role="status"><Info size={16}/>{message}</div>
   </main>
   <aside className="inspector"><div className="inspector-head"><Sparkles size={20}/><h2>Asistente de edición</h2></div>
     {mode==='image'?<>
      <div className="inspector-block ai-panel"><div className="caption"><ShieldCheck size={14}/> CALIDAD FOTOGRÁFICA</div><strong>Preservar el original primero</strong><p className="hint">La prueba anterior de ESRGAN Slim no produjo una mejora visual convincente y tardó demasiado. Ya no se inicia automáticamente. Los ajustes básicos siguen disponibles sin esperar a un modelo neuronal.</p><div className="model-notice" role="note">Restauración generativa de alta fidelidad: <b>pendiente de integración con un proveedor compatible.</b> No se simulan resultados ni se promete una calidad 4K inexistente.</div><details className="experimental-model"><summary>Experimento ESRGAN (lento y opcional)</summary><p className="hint">Este modelo aumenta el número de píxeles, pero puede producir una imagen casi idéntica a la original. Úsalo solamente si quieres hacer pruebas técnicas.</p><div className="ai-scale"><label>Factor neuronal <select value={aiScale} disabled={processing} onChange={e=>setAiScale(Number(e.target.value) as AiScale)}><option value={2}>2×</option><option value={4}>4×</option></select></label></div><button className="secondary wide" disabled={!asset||processing||busy} onClick={()=>executeNeural(true,aiScale,128)}><Scan size={16}/> Probar recorte de 128 px</button><button className="secondary wide" disabled={!asset||processing||busy} onClick={()=>executeNeural(true,aiScale,256)}><Scan size={16}/> Probar recorte de 256 px</button><button className="secondary wide" disabled={!asset||processing||busy} onClick={()=>{if(window.confirm('ESRGAN Slim tarda bastante y podría no mejorar visualmente esta imagen. ¿Ejecutar de todos modos?'))void executeNeural(false)}}><Sparkles size={16}/> Ejecutar ampliación experimental</button></details></div>
      <div className="inspector-block"><div className="caption">INSTRUCCIONES EN ESPAÑOL</div><textarea rows={4} value={command} onChange={e=>setCommand(e.target.value)} disabled={processing} placeholder="Ejemplo: Mejora la calidad con IA conservando colores y rasgos originales"/><button className="secondary wide" disabled={!asset||!command.trim()||processing} onClick={applyCommand}><Sparkles size={16}/> Aplicar instrucción</button><p className="hint">Los ajustes básicos se aplican localmente. Las instrucciones de restauración generativa se identificarán, pero no ejecutarán un modelo ineficaz en segundo plano.</p></div>
      <div className="inspector-block"><div className="caption">COMANDOS RÁPIDOS</div><div className="chips">{commands.map(c=><button key={c} onClick={()=>setCommand(c)}>{c}</button>)}</div></div>
      <div className="inspector-block"><div className="caption">RESTAURACIÓN SUAVE (SIN IA)</div><div className="slider-field"><div className="slider-label"><span>Reducción de ruido con bordes preservados</span><span>{active.noise}%</span></div><input aria-label="Reducción de ruido" type="range" min="0" max="35" step="5" value={active.noise} disabled={processing} onChange={e=>setDraft({...active,noise:Number(e.target.value)})} onPointerUp={commitDraft} onPointerCancel={commitDraft} onKeyUp={commitDraft} onBlur={commitDraft} /></div><p className="hint">Esta opción emplea un filtro bilateral local, no inteligencia artificial; niveles altos pueden suavizar texturas.</p></div>
      <div className="inspector-block"><div className="caption">AJUSTES BÁSICOS (OPCIONALES)</div>{(['brightness','contrast','saturation','sharpness','temperature','rotation'] as const).map(key=><div key={key} className="slider-field"><div className="slider-label"><span>{{brightness:'Luminosidad',contrast:'Contraste',saturation:'Saturación',sharpness:'Nitidez local',temperature:'Temperatura',rotation:'Rotación'}[key]}</span><span>{settings[key]}{key==='rotation'?'°':'%'}</span></div><input type="range" min={LIMITS[key][0]} max={LIMITS[key][1]} disabled={processing} value={settings[key]} onChange={e=>setDraft({...active,settings:{...settings,[key]:Number(e.target.value)}})} onPointerUp={commitDraft} onPointerCancel={commitDraft} onKeyUp={commitDraft} onBlur={commitDraft}/></div>)}<div className="field-actions"><button className="secondary" disabled={processing} onClick={useOriginal}><RotateCcw size={14}/> Original</button><button className="secondary" disabled={processing} onClick={()=>push({...active,settings:{...settings,mirror:!settings.mirror}},'Espejo aplicado.')}><MousePointer2 size={14}/> Espejo</button></div></div>
      <div className="inspector-block"><div className="caption">EXPORTACIÓN</div><label className="export-select">Formato<select value={format} onChange={e=>setFormat(e.target.value as 'image/png'|'image/jpeg')}><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option></select></label><p className="hint">Se exporta la resolución actual. No se falsifica una mejora mediante un escalado convencional adicional.</p></div>
     </>:<div className="inspector-block"><div className="caption">VIDEO — PRÓXIMOS MÓDULOS</div><p>Importación y previsualización listas.</p><p className="hint">FFmpeg, unión de clips y generación imagen-a-video todavía no están disponibles en esta versión.</p></div>}
   </aside></>}
   </div><footer>EDITOR IA • Alfa 0.7 • Prueba gratuita con modelo externo • No requiere GPU local</footer>
 </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
