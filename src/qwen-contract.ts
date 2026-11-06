/**
 * Contrato de Gradio Gallery. A diferencia de un gr.Image sencillo,
 * gr.Gallery espera una lista de objetos con campo "image" y "caption".
 */
export type GalleryItem<T>={image:T;caption:null};
export function galleryPayload<T>(file:T):GalleryItem<T>[] {
 return [{image:file,caption:null}];
}

export type QwenStage='conexion'|'preparacion'|'generacion'|'descarga';
export class QwenStageError extends Error {
 readonly stage:QwenStage;
 constructor(stage:QwenStage,detail:string) {
  super(detail);
  this.stage=stage;
  this.name='QwenStageError';
 }
}
export function explainQwenError(error:unknown,stage:QwenStage):QwenStageError {
 const original=error instanceof Error?error.message:String(error);
 const normalized=original.trim();
 let message:string;
 if(/classifiers|safety|moderation|invalid prompt|policy|nsfw/i.test(normalized)) {
  message='El proveedor rechazó la solicitud según sus políticas de seguridad.';
 }else if(/quota|rate.limit|resource.exhausted|too.many|gpu|queue|busy|limit reached/i.test(normalized)) {
  message='El servidor gratuito alcanzó su cuota o está ocupado.';
 }else if(/Failed to fetch|network|cors|connection|fetch failed/i.test(normalized)) {
  message='El navegador no pudo comunicarse con el proveedor. Revisa la conexión del servicio y las restricciones del navegador.';
 }else if(/An error occurred|^Error$|unknown error|internal server/i.test(normalized)) {
  message='El servidor devolvió un error genérico sin explicar la causa. Puede estar saturado o tener un fallo interno.';
 }else{
  message=normalized.slice(0,350)||'El servicio no indicó por qué falló.';
 }
 const labels:Record<QwenStage,string>={
  conexion:'Conexión',
  preparacion:'Carga y preparación',
  generacion:'Generación',
  descarga:'Descarga del resultado'
 };
 return new QwenStageError(stage,labels[stage]+': '+message);
}
