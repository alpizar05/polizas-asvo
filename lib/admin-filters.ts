export type AdminFilters={search:string;status:string;policy:string;method:string};
export const emptyAdminFilters:AdminFilters={search:'',status:'',policy:'',method:''};
const normalize=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export function paymentMethodKey(value:unknown){
 const text=normalize(value);const compact=text.replace(/[\s_-]/g,'');
 if(['sinpe','sinpemovil'].includes(compact))return 'SINPE';
 if(['transferencia','transferenciabancaria'].includes(compact))return 'TRANSFERENCIA';
 return text?text.toUpperCase():'__missing__';
}
export function paymentMethodOptions(rows:Record<string,unknown>[]){
 const options=new Map([['SINPE','SINPE Móvil'],['TRANSFERENCIA','Transferencia bancaria']]);
 for(const row of rows){const key=paymentMethodKey(row.method);if(!options.has(key))options.set(key,key==='__missing__'?'Sin indicar':String(row.method).trim());}
 return Array.from(options,([value,label])=>({value,label}));
}
export function policyOptions(rows:Record<string,unknown>[]){
 const options=new Map([['9000','₡9.000'],['18000','₡18.000']]);
 for(const row of rows){const key=String(row.selectedPolicy??'').trim()||'__missing__';if(!options.has(key))options.set(key,key==='__missing__'?'Sin indicar':key);}
 return Array.from(options,([value,label])=>({value,label}));
}
export function filterAdminRows<T extends Record<string,unknown>>(rows:T[],filters:AdminFilters):T[]{
 const query=normalize(filters.search);
 return rows.filter(row=>(!filters.status||row.status===filters.status)
  &&(!filters.policy||(String(row.selectedPolicy??'').trim()||'__missing__')===filters.policy)
  &&(!filters.method||paymentMethodKey(row.method)===filters.method)
  &&(!query||normalize([row.name,row.email,row.id,row.identification,row.reference,row.phone].join(' ')).includes(query)));
}
