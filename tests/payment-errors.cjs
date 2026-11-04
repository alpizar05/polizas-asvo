const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function load(path,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText,{exports,require:name=>deps[name],process:{env:{APPS_SCRIPT_URL:'configured',BACKEND_SHARED_SECRET:'configured'}}});return exports;}
const {BackendError}=load('lib/backend.ts');const {paymentError}=load('lib/payment-errors.ts',{'./backend':{BackendError}});
test('los duplicados son 409 y no exponen la solicitud de otra persona',()=>{
 const result=paymentError(new BackendError('PRIVATE_BACKEND_DETAILS','DUPLICATE_PAYMENT_REFERENCE'));assert.equal(result.status,409);assert.match(result.message,/ya está registrada/);assert.doesNotMatch(result.message,/PRIVATE_BACKEND_DETAILS/);assert.equal(paymentError(Error('PRIVATE')),null);assert.equal(paymentError(new BackendError('PRIVATE','UNKNOWN')),null);
});
function route(path,code){return load(path,{'next/server':{NextResponse:{json:(body,init={})=>({body,status:init.status||200})}},'@/lib/payment-errors':{paymentError},'@/lib/backend':{BackendError,backend:async()=>{throw new BackendError('PRIVATE',code);}},'@/lib/receipt':{readReceipt:async()=>({})},'@/lib/validation':{validate:()=>({reference:'ref'})}});}
const request=()=>({headers:new Headers(),formData:async()=>{const form=new FormData();form.set('reference','ref');form.set('method','SINPE');return form;}});
test('API de registro muestra el mensaje de duplicado en vez del error genérico',async()=>{
 const result=await route('app/api/register/route.ts','DUPLICATE_PAYMENT_REFERENCE').POST(request());assert.equal(result.status,409);assert.match(result.body.error,/ya está registrada/);assert.doesNotMatch(result.body.error,/PRIVATE/);
});
test('API de reemplazo muestra el duplicado y conserva la respuesta de enlace inválido',async()=>{
 const params={params:{token:'a'.repeat(64)}};
 const duplicate=await route('app/api/reupload/[token]/route.ts','DUPLICATE_PAYMENT_REFERENCE').POST(request(),params);assert.equal(duplicate.status,409);assert.match(duplicate.body.error,/ya está registrada/);
 const invalid=await route('app/api/reupload/[token]/route.ts','REUPLOAD_LINK_INVALID').GET(request(),params);assert.equal(invalid.status,410);
});
