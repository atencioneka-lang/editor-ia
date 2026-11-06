/**
 * Ajustes fotográficos locales y no generativos.
 * El filtro se ejecuta en Canvas2D y puede aplicarse a la zona seleccionada.
 * No crea prendas, poses ni detalle nuevo por IA.
 */
export type LocalEffect='brightness'|'contrast'|'saturation'|'soften'|'grayscale'|'warm';
export const LOCAL_EFFECTS:{id:LocalEffect;label:string;description:string}[]=[
 {id:'brightness',label:'Iluminación',description:'Aclara la zona'},
 {id:'contrast',label:'Contraste',description:'Separa luces y sombras'},
 {id:'saturation',label:'Color',description:'Aumenta el color'},
 {id:'soften',label:'Suavizar',description:'Desenfoque ligero'},
 {id:'grayscale',label:'Blanco y negro',description:'Reduce el color'},
 {id:'warm',label:'Luz cálida',description:'Ajuste de tonalidad'}
];
export function localFilter(effect:LocalEffect,intensity:number):string {
 const level=Math.min(100,Math.max(0,Number.isFinite(intensity)?intensity:0));
 switch(effect){
  case 'brightness':return 'brightness('+(1+level/200).toFixed(3)+')';
  case 'contrast':return 'contrast('+(1+level/150).toFixed(3)+')';
  case 'saturation':return 'saturate('+(1+level/110).toFixed(3)+')';
  case 'soften':return 'blur('+(level/18).toFixed(2)+'px)';
  case 'grayscale':return 'grayscale('+level.toFixed(0)+'%)';
  case 'warm':return 'sepia('+(level*.35).toFixed(0)+'%) saturate('+(1+level/300).toFixed(3)+')';
 }
}
