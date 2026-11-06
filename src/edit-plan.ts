export type EditGoal='restore'|'clothes'|'pose'|'background'|'objects'|'custom';
export type Protections={face:boolean;body:boolean;pose:boolean;clothes:boolean;background:boolean};

export const GOALS:{id:EditGoal;title:string;description:string}[]=[
 {id:'restore',title:'Calidad y restauración',description:'Recuperar detalle natural sin alterar la composición'},
 {id:'clothes',title:'Cambiar prenda',description:'Modificar únicamente la ropa indicada'},
 {id:'pose',title:'Cambiar postura',description:'Cambiar posición y corregir anatomía coherente'},
 {id:'background',title:'Cambiar fondo',description:'Editar el entorno conservando la persona'},
 {id:'objects',title:'Quitar o corregir objetos',description:'Eliminar objetos o reparar zonas'},
 {id:'custom',title:'Edición libre no explícita',description:'Describir cualquier cambio fotográfico permitido'}
];

export function defaultProtections(goal:EditGoal):Protections {
 return {face:true,body:true,pose:goal!=='pose',clothes:goal!=='clothes',background:goal!=='background'};
}

export function buildEditPrompt(goal:EditGoal,instruction:string,flags:Protections,hasMask:boolean):string {
 const purpose:Record<EditGoal,string>={
  restore:'Restaura la calidad fotográfica, define detalles reales y reduce artefactos; evita el aspecto artificial.',
  clothes:'Edita solamente la prenda especificada, de forma natural y no explícita.',
  pose:'Modifica la postura según la indicación, reconstruyendo una anatomía coherente sin deformaciones.',
  background:'Modifica únicamente el fondo indicado, manteniendo la perspectiva y los bordes naturales.',
  objects:'Elimina o corrige solamente los objetos indicados; reconstruye las zonas de manera coherente.',
  custom:'Aplica únicamente el cambio fotográfico solicitado.'
 };
 const guards=[
   flags.face?'Conserva el rostro, identidad y expresión facial de la imagen de referencia.':null,
   flags.body?'Conserva las proporciones, contextura y rasgos físicos originales salvo cambio explícito.':null,
   flags.pose?'No cambies la pose ni orientación original.':null,
   flags.clothes?'Conserva exactamente las prendas que no se han solicitado modificar.':null,
   flags.background?'Conserva el fondo y encuadre originales.':null
 ].filter((x):x is string=>Boolean(x));
 const scope=hasMask?'La selección marcada indica el área de edición; preserva el resto de la imagen. Utiliza la máscara PNG como referencia solo si el proveedor la admite.':'No modifiques otras partes innecesariamente.';
 return [purpose[goal],instruction.trim()?'Solicitud concreta: '+instruction.trim():null,scope,...guards,'Mantén textura de piel, iluminación y aspecto fotográfico naturales. Evita deformaciones, objetos añadidos y reinterpretaciones innecesarias.'].filter(Boolean).join('\n');
}
