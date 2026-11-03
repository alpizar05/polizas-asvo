const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync('google-apps-script/Code.gs','utf8');
test('registra los campos y comprobante privado, evita duplicados y conserva archivo al revisar',()=>{
 const rows=[];let uploads=0;const context=vm.createContext({Utilities:{getUuid:()=> '12345678-1234-abcd',base64Decode:s=>Array.from(Buffer.from(s,'base64')),newBlob:()=>({})},DriveApp:{getFolderById:()=>({createFile:()=>{uploads++;return {getId:()=> 'private-file'};}})},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})}});
 vm.runInContext(source,context);vm.runInContext(`prop_=()=> 'configured';registrations_=()=>({appendRow:r=>saved.push(r),getLastColumn:()=>HEADERS.length,getRange:()=>({getValues:()=>[HEADERS],setValues:r=>updated=r})});rows_=()=>saved.map(r=>({record:Object.fromEntries(HEADERS.map((h,i)=>[h,r[i]])),row:2}));getRole_=()=> 'ADMIN';`,Object.assign(context,{saved:rows}));
 const data=Object.fromEntries(['identification','firstName','firstSurname','secondSurname','gender','birthDate','phone','email','address','activeVolunteer','memberSince','selectedPolicy','method','reference','medicalCondition','emergencyName','emergencyPhone','relationship'].map(k=>[k,'dato']));
 Object.assign(data,{email:'test@example.com',selectedPolicy:'9000',activeVolunteer:'Sí',receipt:{type:'application/pdf',base64:Buffer.from('%PDF-'+ 'x'.repeat(100)).toString('base64')}});
 context.input=data;const result=vm.runInContext('register_(input)',context);assert.match(result.id,/^POL-/);assert.equal(uploads,1);assert.equal(rows[0][8],'private-file');assert.equal(rows[0][6],'dato');assert.throws(()=>vm.runInContext('register_(input)',context),/Ya existe/);assert.equal(uploads,1);
 vm.runInContext(`review_('admin',{id:saved[0][0],decision:'APPROVED'})`,context);assert.equal(context.updated[0][0],'APPROVED');assert.equal(context.updated[0][1],'private-file');
 assert.throws(()=>vm.runInContext(`validateReceipt_({type:'application/pdf',base64:'aGVsbG8='})`,context),/fuera de rango/);
});
test('migra la hoja anterior sin borrar columnas ni registros y se puede repetir',()=>{
 const values=[['id','policy'+String(2000+26)],['POL-antiguo','18000']];let sheetName='Renovaciones'+String(2000+26);
 const sheet={getName:()=>sheetName,setName:n=>sheetName=n,getDataRange:()=>({getValues:()=>values.map(r=>[...r])}),getRange:(row,col,height=1,width=1)=>({setValue:v=>{values[row-1][col-1]=v;},setValues:rows=>rows.forEach((r,i)=>r.forEach((v,j)=>values[row+i-1][col+j-1]=v))})};
 const context=vm.createContext({});vm.runInContext(source,context);context.db={getSheetByName:n=>n===sheetName?sheet:null,getSheets:()=>[sheet]};vm.runInContext('ss_=()=>db;registrations_();registrations_();',context);
 assert.equal(sheetName,'Renovaciones');assert.equal(values[1][0],'POL-antiguo');assert.equal(values[1][1],'18000');assert.equal(values[1][values[0].indexOf('selectedPolicy')],'18000');assert.equal(values[0].filter(h=>h==='selectedPolicy').length,1);
});
