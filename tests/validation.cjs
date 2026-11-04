const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const vm=require('node:vm');
const fs=require('node:fs');
function moduleFrom(file,dependencies={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:name=>dependencies[name]});return exports;}
const {fields,provinces}=moduleFrom('lib/fields.ts');
const {validate}=moduleFrom('lib/validation.ts',{'./fields':{fields,provinces}});
const valid=Object.fromEntries(fields.map(f=>[f.name,'Dato de prueba']));
Object.assign(valid,{province:'San José',canton:'San José',district:'Carmen',birthDate:'1990-05-15',memberSince:'2010',phone:'8888 8888',emergencyPhone:'+506 8999 9999',email:'Persona@example.com',activeVolunteer:'No',selectedPolicy:'9000',consent:'yes'});
test('acepta ambas opciones y voluntario no activo',()=>{for(const selectedPolicy of ['9000','18000'])assert.equal(validate({...valid,selectedPolicy}).selectedPolicy,selectedPolicy);});
test('rechaza datos obligatorios, fechas imposibles, precios alterados y falta de consentimiento',()=>{for(const changed of [{identification:''},{reference:''},{email:'incorrecto'},{phone:'123'},{birthDate:'2023-02-30'},{birthDate:'2090-01-01'},{memberSince:'1800'},{memberSince:'1989'},{selectedPolicy:'5000'},{consent:''}])assert.throws(()=>validate({...valid,...changed}));});
test('conserva todos los campos y normaliza el correo',()=>{const result=validate(valid);assert.equal(Object.keys(result).length,21);assert.equal(result.email,'persona@example.com');});

test('valida provincia y dirección estructurada',()=>{assert.throws(()=>validate({...valid,province:'Otra'}));assert.throws(()=>validate({...valid,canton:''}));assert.throws(()=>validate({...valid,district:''}));assert.equal(validate(valid).address,'San José, San José, Carmen');});
