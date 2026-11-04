import {fields,provinces} from './fields';
export function validate(data: Record<string, unknown>, today = new Date()) {
 const result: Record<string,string> = {};
 for (const field of fields) {
  const value = data[field.name];
  if(typeof value !== 'string' || !value.trim() || value.length > (field.type === 'textarea' ? 1000 : 180)) throw Error('Revisá el campo: ' + field.label);
  result[field.name] = value.trim();
  if(field.type === 'yesno' && !['Sí','No'].includes(result[field.name])) throw Error('Seleccioná Sí o No: ' + field.label);
 }
 if(!provinces.some(province=>province===result.province)) throw Error('Seleccioná una provincia válida.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw Error('Correo electrónico inválido.');
 for(const key of ['phone','emergencyPhone']) if(!/^\+?[\d\s()-]{8,25}$/.test(result[key]) || result[key].replace(/\D/g,'').length < 8) throw Error('Número telefónico inválido.');
 const date = new Date(result.birthDate+'T12:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(result.birthDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== result.birthDate || date > today || date.getUTCFullYear() < 1900) throw Error('Fecha de nacimiento inválida.');
 const year = Number(result.memberSince);
 if(!/^\d{4}$/.test(result.memberSince) || year < 1989 || year > today.getUTCFullYear() || year < date.getUTCFullYear()) throw Error('Revisá el año de ingreso a ASVO.');
 if(!['9000','18000'].includes(result.selectedPolicy)) throw Error('Seleccioná una póliza válida.');
 if(data.consent !== 'yes') throw Error('Debés autorizar el tratamiento de los datos.');
 result.address = [result.province,result.canton,result.district].join(', ');
 result.email = result.email.toLowerCase();
 return result;
}
