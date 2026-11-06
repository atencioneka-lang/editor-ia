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


/** Convert the blue paint overlay alpha to a hard white-on-black RGB mask.
 * The remote FIBO model treats white as editable and black as protected. */
export function selectionToBinaryMask(source:Uint8ClampedArray):Uint8ClampedArray{
 if(source.length%4!==0)throw Error('Canal de selección inválido.');
 const output=new Uint8ClampedArray(source.length);
 for(let p=0;p<source.length;p+=4){
  const selected=source[p+3]>20?255:0;
  output[p]=selected;output[p+1]=selected;output[p+2]=selected;output[p+3]=255;
 }
 return output;
}
