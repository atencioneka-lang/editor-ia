export type Settings = {brightness:number;contrast:number;saturation:number;sharpness:number;temperature:number; rotation:number;mirror:boolean};
export const DEFAULT:Settings={brightness:0,contrast:0,saturation:0,sharpness:0,temperature:0,rotation:0,mirror:false};
export const LIMITS:Record<keyof Omit<Settings,'mirror'>,[number,number]>={brightness:[-100,100],contrast:[-100,100],saturation:[-100,100],sharpness:[0,100],temperature:[-100,100],rotation:[-180,180]};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export const normalize=(s:Settings):Settings=>({...s,...Object.fromEntries(Object.entries(LIMITS).map(([key,[min,max]])=>[key,clamp(s[key as keyof Settings] as number,min,max)]))});
export function parseInstruction(input:string, current:Settings):{next:Settings;message:string;changed:boolean}{
 const text=input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 let next={...current}; const changes:string[]=[];
 const amt=(small:number,big:number)=>/mucho|bastante|al maximo|fuerte|intens/.test(text)?big:small;
 if(/restablec|reinici|original|sin ajustes/.test(text)){return {next:{...DEFAULT},message:'Ajustes restablecidos. El archivo original permanece intacto.',changed:true};}
 if(/mas luz|aumenta(?:r)? (?:ligeramente )?(?:la )?luz|ilumin|aclara|aclarar|brillo|mas brillante/.test(text) && !/menos luz|baja el brillo|reduce el brillo|oscurec/.test(text)){next.brightness+=amt(18,35); changes.push('aumenté la luminosidad');}
 if(/menos luz|baja el brillo|reduce el brillo|oscurec/.test(text)){next.brightness-=amt(18,35);changes.push('reduje la luminosidad');}
 if(/contraste/.test(text)){const down=/menos|baja|reduce|disminuy/.test(text);next.contrast+=(down?-1:1)*amt(15,30);changes.push(down?'reduje el contraste':'aumenté el contraste');}
 if(/saturac|mas color|colores vivos/.test(text)){const down=/menos|baja|reduce|disminuy|desatur/.test(text);next.saturation+=(down?-1:1)*amt(18,35);changes.push(down?'reduje la saturación':'aumenté la saturación');}
 if(/blanco y negro|escala de grises|sin color/.test(text)){next.saturation=-100;changes.push('convertí a blanco y negro');}
 if(/nitid|enfoc|detalle|claridad/.test(text)){next.sharpness+=amt(20,40);changes.push('mejoré la nitidez');}
 if(/calid|restaur|mejorar la imagen/.test(text) && changes.length===0){next.sharpness+=15;next.contrast+=7;changes.push('apliqué mejora básica local (no superresolución IA)');}
 if(/calid|restaur|mejorar la imagen/.test(text) && changes.length>0 && !/nitid|enfoc|detalle|claridad/.test(text)){next.sharpness+=10;changes.push('añadí nitidez ligera');}
 if(/calid|restaur|mejorar la imagen|4k|resolucion/.test(text) && /4k|resolucion/.test(text)){changes.push('la superresolución IA aún no está incluida');}
 if(/mas calid|tono calido|calida|caliente/.test(text) && !/mejorar calidad/.test(text)){next.temperature+=18;changes.push('di calidez al color');}
 if(/tono frio|mas frio|enfria/.test(text)){next.temperature-=18;changes.push('enfrié el color');}
 if(/gira|rotar|rota/.test(text)){const match=text.match(/(-?\d{1,3})\s*(?:°|grados?)/);if(match){next.rotation+=Number(match[1]);changes.push(`giré ${match[1]}°`);}}
 if(/espejo|invertir horizontal|voltear horizontal/.test(text)){next.mirror=!next.mirror;changes.push('invertí horizontalmente');}
 next=normalize(next);
 if(changes.length===0){return {next:current,changed:false,message:'Esta versión admite ajustes locales: luz, contraste, saturación, nitidez, temperatura, blanco y negro, giro y espejo. Cambios generativos de ropa, postura, fondos e imagen a video se incorporarán en fases posteriores; no se simuló ningún resultado.'};}
 return {next,changed:JSON.stringify(next)!==JSON.stringify(current),message:'Edición aplicada: '+changes.join('; ')+'.'};
}
export function dimensions(w:number,h:number,rotation:number):[number,number]{const r=rotation*Math.PI/180;const nearIntCeil=(n:number)=>Math.ceil(n-1e-8);return [nearIntCeil(Math.abs(w*Math.cos(r))+Math.abs(h*Math.sin(r))),nearIntCeil(Math.abs(w*Math.sin(r))+Math.abs(h*Math.cos(r)))];}
function sharpen(image:ImageData,strength:number):ImageData{
 if(!strength)return image;
 const {data,width,height}=image,original=new Uint8ClampedArray(data),amount=strength/100*0.75;
 for(let y=1;y<height-1;y++){for(let x=1;x<width-1;x++){const i=(y*width+x)*4;for(let c=0;c<3;c++){const neighbor=(original[i-4+c]+original[i+4+c]+original[i-width*4+c]+original[i+width*4+c])/4;data[i+c]=clamp(Math.round(original[i+c]+(original[i+c]-neighbor)*amount),0,255);}}}
 return image;
}
export function render(source:CanvasImageSource,width:number,height:number,settings:Settings,scale=1):HTMLCanvasElement{
 const [rotw,roth]=dimensions(width,height,settings.rotation),canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(rotw*scale));canvas.height=Math.max(1,Math.round(roth*scale));
 const context=canvas.getContext('2d',{willReadFrequently:settings.sharpness>0});if(!context)throw Error('Canvas no disponible');
 context.save();context.translate(canvas.width/2,canvas.height/2);context.rotate(settings.rotation*Math.PI/180);context.scale(settings.mirror?-scale:scale,scale);
 context.filter=`brightness(${100+settings.brightness}%) contrast(${100+settings.contrast}%) saturate(${100+settings.saturation}%)`;
 context.drawImage(source,-width/2,-height/2,width,height);context.restore();
 if(settings.temperature!==0||settings.sharpness!==0){const frame=context.getImageData(0,0,canvas.width,canvas.height),d=frame.data;for(let i=0;i<d.length;i+=4){if(d[i+3]===0)continue;const warm=settings.temperature*.28;d[i]=clamp(d[i]+warm,0,255);d[i+2]=clamp(d[i+2]-warm,0,255);}context.putImageData(sharpen(frame,settings.sharpness),0,0);}
 return canvas;
}
export async function loadImage(file:File):Promise<{image:HTMLImageElement;url:string;width:number;height:number}>{
 if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw Error('Selecciona una imagen JPG, PNG o WebP.');
 const url=URL.createObjectURL(file),image=new Image();image.src=url;
 try{await image.decode();return {image,url,width:image.naturalWidth,height:image.naturalHeight};}catch{URL.revokeObjectURL(url);throw Error('No se pudo abrir esta imagen.');}
}
export async function saveCanvas(canvas:HTMLCanvasElement,filename:string,format:'image/png'|'image/jpeg'){
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error('Error de exportación')),format,.94));
 const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=filename.replace(/\.[^.]+$/,'')+(format==='image/png'?'.png':'.jpg');document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),2000);
}
