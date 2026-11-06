/**
 * FIBO 2.0 public Gradio Server /edit response.
 * Use only the PNG returned by the service, never an arbitrary remote URL.
 */
export function parseFiboImageData(response:unknown):string{
 const envelope=response&&typeof response==='object'?response as {data?:unknown}:null;
 const data=envelope?.data;
 const item=Array.isArray(data)?data[0]:data;
 const payload=item&&typeof item==='object'?item as {image_data?:unknown}:null;
 const imageData=payload?.image_data;
 if(typeof imageData!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(imageData)){
  throw Error('El proveedor no devolvió el PNG esperado.');
 }
 if(imageData.length>40_000_000)throw Error('El resultado supera el límite de tamaño.');
 return imageData;
}
