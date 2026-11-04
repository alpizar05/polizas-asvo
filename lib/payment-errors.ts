import {BackendError} from './backend';
export function paymentError(error:unknown){
 if(!(error instanceof BackendError))return null;
 if(error.code==='DUPLICATE_PAYMENT_REFERENCE')return {status:409,message:'Esta referencia de pago ya está registrada. Revisá el número o contactá a Coordinación si necesitás corregir un comprobante.'};
 if(error.code==='INVALID_PAYMENT_REFERENCE')return {status:400,message:'Ingresá un número de referencia de pago válido.'};
 return null;
}
