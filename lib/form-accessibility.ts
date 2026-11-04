export function validationMessage(validity:ValidityState,type:string,customMessage=''){
 if(validity.customError&&customMessage)return customMessage;
 if(validity.valueMissing)return type==='checkbox'?'Marcá esta autorización para continuar.':type==='file'?'Seleccioná un comprobante de pago.':'Completá este campo.';
 if(validity.typeMismatch)return type==='email'?'Ingresá un correo electrónico válido.':'Revisá el formato de este campo.';
 if(validity.rangeUnderflow||validity.rangeOverflow)return 'Ingresá un valor dentro del rango indicado.';
 if(validity.badInput||validity.stepMismatch)return 'Ingresá un valor válido para este campo.';
 if(validity.tooLong||validity.tooShort)return 'Revisá la cantidad de caracteres de este campo.';
 return 'Revisá el valor de este campo.';
}
export function formErrors(form:HTMLFormElement){
 const errors:Record<string,string>={};
 for(const item of Array.from(form.elements)){
  const field=item as HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
  if(field.name&&field.willValidate&&!field.validity.valid)errors[field.name]=validationMessage(field.validity,field.type,field.validationMessage);
 }
 return errors;
}
export const formFieldHelp:Record<string,string>={medicalCondition:'Si no tenés condiciones que informar, escribí “No aplica”.',reference:'Copiá el número de referencia que aparece en el comprobante.',memberSince:'Ingresá los cuatro dígitos del año en que comenzaste como persona voluntaria de ASVO.'};
