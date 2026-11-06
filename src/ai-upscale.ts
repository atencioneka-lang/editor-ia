/** ESRGAN Slim: verdadera inferencia neuronal, no interpolación de píxeles.
 *  Primera ejecución: descarga de pesos desde CDN público del paquete; la imagen se procesa en local.
 */
export type AiScale = 2 | 4;
export type AiProgress = (percent: number) => void;

// La instancia se reutiliza entre muestras para evitar recargar los pesos y
// recompilar las mismas operaciones en cada clic. Una sola escala permanece
// en memoria: cuando cambia 2× ↔ 4×, se libera la instancia anterior.
async function createUpscaler(scale:AiScale) {
  await import('@tensorflow/tfjs');
  const [{ default: Upscaler }, modelModule] = await Promise.all([
    import('upscaler'),
    scale === 2 ? import('@upscalerjs/esrgan-slim/2x') : import('@upscalerjs/esrgan-slim/4x')
  ]);
  return new Upscaler({ model: modelModule.default });
}
type UpscalerInstance = Awaited<ReturnType<typeof createUpscaler>>;
let cached: {scale:AiScale; upscaler:UpscalerInstance} | null = null;
let loading: {scale:AiScale; promise:ReturnType<typeof createUpscaler>} | null = null;

async function getUpscaler(scale:AiScale):Promise<UpscalerInstance> {
  if(cached?.scale===scale) return cached.upscaler;
  if(loading?.scale===scale) return loading.promise;
  const pending=createUpscaler(scale);
  loading={scale,promise:pending};
  try {
    const upscaler=await pending;
    if(loading?.promise===pending) {
      cached?.upscaler.dispose();
      cached={scale,upscaler};
      loading=null;
    }
    return upscaler;
  } catch(err) {
    if(loading?.promise===pending) loading=null;
    throw err;
  }
}
export async function upscaleNeural(
  source: HTMLCanvasElement | HTMLImageElement,
  scale: AiScale,
  onProgress: AiProgress,
  signal: AbortSignal
): Promise<string> {
  if(signal.aborted) throw new DOMException('Cancelado','AbortError');
  const upscaler=await getUpscaler(scale);
  if(signal.aborted) throw new DOMException('Cancelado','AbortError');
  let lastProgress=-1;
  // Los parches de 64px requieren menos inferencias que los anteriores de 48px.
  // Con padding 2 se conservan los bordes de cada fragmento.
  const output = await upscaler.upscale(source, {
    output: 'base64',
    patchSize: 64,
    padding: 2,
    signal,
    awaitNextFrame: true,
    progress: (fraction: number) => {
      const value=Math.min(100,Math.max(0,Math.round(fraction*100)));
      if(value!==lastProgress) {lastProgress=value; onProgress(value);}
    }
  });
  if(typeof output!=='string'||!output.startsWith('data:image/')) {
    throw new Error('El modelo no devolvió una imagen válida.');
  }
  onProgress(100);
  return output;
}

export function couldNeedNeural(command: string): boolean {
  const t = command.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /superresolucion|upscal|aumenta(?:r)? (?:la )?resolucion|amplia(?:r)? (?:la )?(?:imagen|resolucion)|restaurar|restaura(?:cion)?|mejor(?:a|ar) (?:la )?calidad|4k|resolucion 2x|resolucion 4x/.test(t);
}

export function dataUrlToAsset(dataUrl: string, basename: string): Promise<{image:HTMLImageElement;url:string;width:number;height:number;name:string}> {
  return fetch(dataUrl).then(r => r.blob()).then(async blob => {
    const url = URL.createObjectURL(blob);
    const image = new Image();image.src=url;
    try {
      await image.decode();
      return { image,url,width:image.naturalWidth,height:image.naturalHeight,name:basename };
    } catch (e) {
      URL.revokeObjectURL(url);throw e;
    }
  });
}

// Filtro bilateral básico: reduce ruido leve preservando bordes mejor que un blur;
// no es una red neuronal ni puede recuperar información ausente.
export function denoiseEdges(canvas:HTMLCanvasElement, amount:number):void {
  if (amount <= 0) return;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return;
  const w=canvas.width,h=canvas.height;
  // Evitar bloqueo con lienzos grandes en dispositivos modestos.
  if(w*h>12_000_000)throw Error('La reducción de ruido local está limitada a 12 megapíxeles.');
  const img=ctx.getImageData(0,0,w,h),src=new Uint8ClampedArray(img.data),d=img.data;
  const strength=Math.min(60,Math.max(1,amount));
  const colorSigma=12+strength*.7,spaceWeights=[.35,.6,.35,.6,1,.6,.35,.6,.35];
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++) {
    const i=(y*w+x)*4; const rr=src[i],gg=src[i+1],bb=src[i+2];
    if(src[i+3]===0)continue;
    let weights=0,r=0,g=0,b=0,k=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const j=((y+dy)*w+x+dx)*4;
      const dist=(Math.abs(src[j]-rr)+Math.abs(src[j+1]-gg)+Math.abs(src[j+2]-bb))/3;
      const weight=spaceWeights[k++]*Math.exp(-dist*dist/(2*colorSigma*colorSigma));
      weights+=weight;r+=weight*src[j];g+=weight*src[j+1];b+=weight*src[j+2];
    }
    const mix=strength/100;
    d[i]=Math.round(rr*(1-mix)+(r/weights)*mix);
    d[i+1]=Math.round(gg*(1-mix)+(g/weights)*mix);
    d[i+2]=Math.round(bb*(1-mix)+(b/weights)*mix);
  }
  ctx.putImageData(img,0,0);
}
