export type ReviewEntry={id:string;decision:'APPROVED'|'REJECTED';reviewedBy:string;reviewedAt:string;reason:string;receiptId:string;reference:string;method:string;selectedPolicy:string};
export function readReviewHistory(value:unknown):{entries:ReviewEntry[];error:boolean}{
 if(!value)return {entries:[],error:false};
 try{
  const entries=JSON.parse(String(value));
  if(!Array.isArray(entries)||!entries.every(entry=>entry&&typeof entry.id==='string'&&['APPROVED','REJECTED'].includes(entry.decision)&&['reviewedBy','reviewedAt','reason','receiptId','reference','method','selectedPolicy'].every(key=>typeof entry[key]==='string')))return {entries:[],error:true};
  return {entries:[...entries].reverse(),error:false};
 }catch{return {entries:[],error:true};}
}
export function reviewDate(value:string){
 const date=new Date(value);
 return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('es-CR',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Costa_Rica'}).format(date):'Fecha no disponible';
}
