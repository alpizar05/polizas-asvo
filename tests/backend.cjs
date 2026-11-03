const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync('google-apps-script/Code.gs','utf8');
test('registra los campos y comprobante privado, evita duplicados y conserva archivo al revisar',()=>{
 const rows=[];let uploads=0;const context=vm.createContext({Utilities:{getUuid:()=> '12345678-1234-abcd',base64Decode:s=>Array.from(Buffer.from(s,'base64')),newBlob:()=>({})},DriveApp:{getFolderById:()=>({createFile:()=>{uploads++;return {getId:()=> 'private-file'};}})},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})}});
 vm.runInContext(source,context);vm.runInContext(`prop_=()=> 'configured';registrations_=()=>({appendRow:r=>saved.push(r),getRange:()=>({setValues:r=>updated=r})});rows_=()=>saved.map(r=>({record:Object.fromEntries(HEADERS.map((h,i)=>[h,r[i]])),row:2}));getRole_=()=> 'ADMIN';`,Object.assign(context,{saved:rows}));
 const data=Object.fromEntries(['identification','firstName','firstSurname','secondSurname','gender','policy','birthDate','phone','email','address','activeVolunteer','memberSince','policy2026','policy2025','method','medicalCondition','emergencyName','emergencyPhone','relationship'].map(k=>[k,'dato']));
 Object.assign(data,{email:'test@example.com',policy2026:'9000',activeVolunteer:'Sí',receipt:{type:'application/pdf',base64:Buffer.from('%PDF-'+ 'x'.repeat(100)).toString('base64')}});
 context.input=data;const result=vm.runInContext('register_(input)',context);assert.match(result.id,/^POL26-/);assert.equal(uploads,1);assert.equal(rows[0][8],'private-file');assert.throws(()=>vm.runInContext('register_(input)',context),/Ya existe/);assert.equal(uploads,1);
 vm.runInContext(`review_('admin',{id:saved[0][0],decision:'APPROVED'})`,context);assert.equal(context.updated[0][0],'APPROVED');assert.equal(context.updated[0][1],'private-file');
 assert.throws(()=>vm.runInContext(`validateReceipt_({type:'application/pdf',base64:'aGVsbG8='})`,context),/fuera de rango/);
});
