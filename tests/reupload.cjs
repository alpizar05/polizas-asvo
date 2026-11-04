const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const crypto=require('node:crypto');
const source=fs.readFileSync('google-apps-script/Code.gs','utf8');
function fixture(){
 const mails=[];const logs=[];let seq=0,quota=10;
 const context=vm.createContext({console:{error:m=>logs.push(m)},Utilities:{computeHmacSha256Signature:(value,key)=>Array.from(crypto.createHmac('sha256',key).update(value).digest()),getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_algorithm,value)=>Array.from(crypto.createHash('sha256').update(value).digest()),base64Decode:s=>Array.from(Buffer.from(s,'base64')),newBlob:()=>({})},DriveApp:{getFolderById:()=>({createFile:()=>({getId:()=>`receipt-${++seq}`})})},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},MailApp:{getRemainingDailyQuota:()=>quota,sendEmail:m=>mails.push(m)}});
 vm.runInContext(source,context);const headers=vm.runInContext('HEADERS',context);const records=[];
 const sheet={getLastColumn:()=>headers.length,getLastRow:()=>records.length+1,appendRow:r=>records.push(r),getRange:(row,col,height=1,width=1)=>({getValues:()=>[row===1?[...headers]:records[row-2].slice(col-1,col-1+width)],setValue:value=>records[row-2][col-1]=value,setValues:values=>values.forEach((r,i)=>r.forEach((v,j)=>records[row-2+i][col-1+j]=v))})};
 Object.assign(context,{sheet,records});vm.runInContext("registrations_=()=>sheet;rows_=()=>records.map((r,i)=>({row:i+2,record:Object.fromEntries(HEADERS.map((h,j)=>[h,r[j]]))}));getRole_=()=> 'ADMIN';prop_=key=>key==='PUBLIC_SITE_URL'?'https://polizas.example':'admin@example.com';",context);
 const data=Object.fromEntries(['identification','firstName','firstSurname','secondSurname','gender','birthDate','phone','email','address','medicalCondition','emergencyName','emergencyPhone','relationship','activeVolunteer','memberSince','selectedPolicy','method','reference'].map(k=>[k,'dato']));Object.assign(data,{email:'test@example.com',selectedPolicy:'9000',activeVolunteer:'Sí',reference:'original-reference',method:'SINPE',receipt:{type:'application/pdf',base64:Buffer.from('%PDF-'+ 'x'.repeat(100)).toString('base64')}});context.input=data;
 vm.runInContext('register_(input)',context);
 const get=key=>records[0][headers.indexOf(key)];const set=(key,value)=>records[0][headers.indexOf(key)]=value;
 const run=code=>vm.runInContext(code,context);const reject=()=>run("review_('admin',{id:records[0][0],decision:'REJECTED',reason:'El comprobante está borroso.'})");const token=()=>mails.at(-1).body.match(/https:\/\/polizas.example\/reupload\/([a-f0-9]{64})/)[1];
 return {context,mails,logs,get,set,run,reject,token,quota:value=>quota=value,uploads:()=>seq};
}
test('recepción → rechazo con motivo → nuevo comprobante → aprobación conserva solicitud y notifica cada paso',()=>{
 const f=fixture();const id=f.get('id');const originalFile=f.get('receiptId');f.reject();const token=f.token();f.context.token=token;
 assert.equal(f.get('status'),'REJECTED');assert.equal(f.get('rejectionEmailStatus'),'SENT');assert.notEqual(f.get('reuploadToken'),token);assert.match(f.mails[1].body,/borroso/);assert.match(f.mails[1].body,/7 días/);
 const info=f.run('reuploadInfo_(token)');assert.equal(info.id,id);assert.equal(info.reason,'El comprobante está borroso.');assert.equal(info.email,undefined);assert.equal(info.reuploadToken,undefined);
 f.run("reupload_(token,input.receipt,'new-reference','TRANSFERENCIA')");assert.equal(f.get('status'),'PENDING');assert.equal(f.get('id'),id);assert.equal(f.get('reference'),'new-reference');assert.equal(f.get('method'),'TRANSFERENCIA');assert.notEqual(f.get('receiptId'),originalFile);assert.equal(f.get('reason'),'');assert.equal(f.get('reuploadToken'),'');assert.equal(f.get('reuploadExpiresAt'),'');assert.equal(JSON.parse(f.get('receiptHistory'))[0].receiptId,originalFile);assert.match(f.mails[2].subject,/nuevo comprobante/);assert.equal(f.get('reuploadEmailStatus'),'SENT');
 assert.throws(()=>f.run('reuploadInfo_(token)'),/no es válido/);assert.throws(()=>f.run("reupload_(token,input.receipt,'duplicate','SINPE')"),/no es válido/);assert.equal(f.uploads(),2);
 f.run("review_('admin',{id:records[0][0],decision:'APPROVED'})");assert.equal(f.get('status'),'APPROVED');assert.equal(f.mails.length,4);assert.match(f.mails[3].subject,/aprobado/);
});
test('enlaces inválidos o vencidos y archivos inválidos no reemplazan el comprobante',()=>{
 const f=fixture();f.reject();f.context.token=f.token();const original=f.get('receiptId');assert.throws(()=>f.run("reuploadInfo_('x')"),/no es válido/);assert.throws(()=>f.run("reupload_(token,{type:'text/plain',base64:'abc'},'ref','SINPE')"),/Comprobante inválido/);assert.throws(()=>f.run("reupload_(token,input.receipt,'','SINPE')"),/referencia/);assert.equal(f.get('receiptId'),original);assert.equal(f.get('status'),'REJECTED');assert.ok(f.get('reuploadToken'));f.set('reuploadExpiresAt','2000-01-01T00:00:00Z');assert.throws(()=>f.run("reupload_(token,input.receipt,'ref','SINPE')"),/no es válido/);assert.equal(f.uploads(),1);
});
test('reenviar enlace invalida el anterior y puede volver a rechazarse tras una corrección',()=>{
 const f=fixture();f.reject();const first=f.token();f.run("resendRejection_('admin',{id:records[0][0]})");const second=f.token();assert.notEqual(first,second);f.context.token=first;assert.throws(()=>f.run('reuploadInfo_(token)'),/no es válido/);f.context.token=second;f.run("reupload_(token,input.receipt,'ref','SINPE')");f.reject();assert.equal(f.mails.length,5);assert.notEqual(f.token(),second);assert.equal(f.get('rejectionEmailStatus'),'SENT');
});
test('si falla el correo se conserva el rechazo o el nuevo comprobante y el panel puede regenerar enlace',()=>{
 const f=fixture();f.quota(0);f.reject();assert.equal(f.get('status'),'REJECTED');assert.equal(f.get('rejectionEmailStatus'),'ERROR');f.quota(10);f.run("resendRejection_('admin',{id:records[0][0]})");f.context.token=f.token();f.quota(0);f.run("reupload_(token,input.receipt,'ref','SINPE')");assert.equal(f.get('status'),'PENDING');assert.equal(f.get('reuploadEmailStatus'),'ERROR');assert.equal(f.get('reuploadToken'),'');
});
test('falta de dominio o de autorización no modifica una solicitud',()=>{
 const f=fixture();f.run("prop_=()=> 'invalid-domain'");assert.throws(()=>f.reject(),/PUBLIC_SITE_URL/);assert.equal(f.get('status'),'PENDING');f.run("getRole_=()=>{throw Error('Cuenta no autorizada')}");assert.throws(()=>f.reject(),/no autorizada/);assert.equal(f.mails.length,1);
});
test('bloquea referencia repetida en otra identificación aunque cambie el método o el formato',()=>{
 const f=fixture();f.context.second={...f.context.input,identification:'second-id',reference:' ORIGINAL – reference ',method:'TRANSFERENCIA'};
 assert.throws(()=>f.run('register_(second)'),e=>e.code==='DUPLICATE_PAYMENT_REFERENCE');assert.equal(f.run('records.length'),1);assert.equal(f.uploads(),1);assert.equal(f.mails.length,1);
 f.context.second.reference='originalreference';assert.throws(()=>f.run('register_(second)'),e=>e.code==='DUPLICATE_PAYMENT_REFERENCE');
});
test('no confunde referencias diferentes ni elimina ceros iniciales',()=>{
 const f=fixture();f.set('reference','00123');f.context.second={...f.context.input,identification:'second-id',reference:'123'};assert.doesNotThrow(()=>f.run('register_(second)'));assert.equal(f.run('records.length'),2);
});
test('corregir un comprobante permite conservar la referencia de la misma solicitud',()=>{
 const f=fixture();f.reject();f.context.token=f.token();assert.doesNotThrow(()=>f.run("reupload_(token,input.receipt,' ORIGINAL – REFERENCE ','SINPE')"));assert.equal(f.get('status'),'PENDING');assert.equal(f.uploads(),2);
});
test('una referencia histórica no puede usarse en otra solicitud',()=>{
 const f=fixture();f.reject();f.context.token=f.token();f.run("reupload_(token,input.receipt,'replacement-reference','SINPE')");f.context.second={...f.context.input,identification:'second-id',reference:' original reference '};assert.throws(()=>f.run('register_(second)'),e=>e.code==='DUPLICATE_PAYMENT_REFERENCE');assert.equal(f.run('records.length'),1);assert.equal(f.uploads(),2);
});
test('reenvío duplicado no consume el enlace ni guarda archivos y permite corregir el número',()=>{
 const f=fixture();f.context.second={...f.context.input,identification:'second-id',reference:'another-reference'};f.run('register_(second)');f.reject();f.context.token=f.token();const tokenHash=f.get('reuploadToken');
 assert.throws(()=>f.run("reupload_(token,input.receipt,' another reference ','TRANSFERENCIA')"),e=>e.code==='DUPLICATE_PAYMENT_REFERENCE');assert.equal(f.get('status'),'REJECTED');assert.equal(f.get('reuploadToken'),tokenHash);assert.equal(f.uploads(),2);assert.doesNotThrow(()=>f.run('reuploadInfo_(token)'));f.run("reupload_(token,input.receipt,'corrected-reference','SINPE')");assert.equal(f.get('status'),'PENDING');
});
test('bloquea aprobación si ya había una referencia duplicada en la hoja',()=>{
 const f=fixture();f.context.second={...f.context.input,identification:'second-id',reference:'different'};f.run('register_(second)');f.run("records[1][HEADERS.indexOf('reference')]=' ORIGINAL REFERENCE '");assert.throws(()=>f.run("review_('admin',{id:records[0][0],decision:'APPROVED'})"),e=>e.code==='DUPLICATE_PAYMENT_REFERENCE');assert.equal(f.get('status'),'PENDING');assert.equal(f.mails.length,2);
});
test('referencias vacías tras normalizar se rechazan sin archivos nuevos',()=>{
 const f=fixture();f.context.second={...f.context.input,identification:'second-id',reference:' - – '};assert.throws(()=>f.run('register_(second)'),e=>e.code==='INVALID_PAYMENT_REFERENCE');assert.equal(f.uploads(),1);
});
test('historial conserva autor, fecha, motivo y comprobante de cada revisión tras reemplazar archivo',()=>{
 const f=fixture();const original=f.get('receiptId');f.run("review_('Reviewer.One@Example.com',{id:records[0][0],decision:'REJECTED',reason:'  No se distingue el monto.  '})");
 const first=JSON.parse(f.get('reviewHistory'))[0];assert.equal(first.reviewedBy,'reviewer.one@example.com');assert.equal(first.decision,'REJECTED');assert.equal(first.reason,'No se distingue el monto.');assert.equal(first.receiptId,original);assert.equal(first.reference,'original-reference');assert.ok(Number.isFinite(Date.parse(first.reviewedAt)));
 f.context.token=f.token();f.run("reupload_(token,input.receipt,'updated-reference','TRANSFERENCIA')");assert.deepEqual(JSON.parse(f.get('reviewHistory')),[first]);const current=f.get('receiptId');f.run("review_('Reviewer.Two@Example.com',{id:records[0][0],decision:'APPROVED',reason:'  Monto y referencia verificados.  '})");const history=JSON.parse(f.get('reviewHistory'));assert.equal(history.length,2);assert.deepEqual(history[0],first);assert.equal(history[1].reviewedBy,'reviewer.two@example.com');assert.equal(history[1].decision,'APPROVED');assert.equal(history[1].reason,'Monto y referencia verificados.');assert.equal(history[1].receiptId,current);assert.equal(history[1].reference,'updated-reference');assert.notEqual(history[0].id,history[1].id);
 assert.throws(()=>f.run("review_('admin',{id:records[0][0],decision:'APPROVED'})"),/ya fue revisada/);assert.equal(JSON.parse(f.get('reviewHistory')).length,2);
});
test('historial corrupto o falta de permisos no permite registrar una decisión',()=>{
 const f=fixture();f.set('reviewHistory','{corrupt');assert.throws(()=>f.run("review_('admin',{id:records[0][0],decision:'APPROVED'})"),/historial/);assert.equal(f.get('status'),'PENDING');assert.equal(f.mails.length,1);assert.equal(f.get('reviewHistory'),'{corrupt');
 f.set('reviewHistory','[null]');assert.throws(()=>f.run("review_('admin',{id:records[0][0],decision:'APPROVED'})"),/historial/);assert.equal(f.get('status'),'PENDING');
 f.set('reviewHistory','');f.run("getRole_=()=>{throw Error('Cuenta no autorizada')}");assert.throws(()=>f.reject(),/no autorizada/);assert.equal(f.get('reviewHistory'),'');
});
test('acceso a comprobantes históricos verifica rol y pertenencia a la solicitud',()=>{
 const f=fixture();f.reject();const history=JSON.parse(f.get('reviewHistory'));f.context.reviewId=history[0].id;const readFiles=[];
 f.context.DriveApp.getFileById=id=>{readFiles.push(id);return {getBlob:()=>({getContentType:()=> 'application/pdf',getBytes:()=>[1,2,3]})};};f.context.Utilities.base64Encode=bytes=>Buffer.from(bytes).toString('base64');
 f.run("receipt_('admin',records[0][0],reviewId)");assert.deepEqual(readFiles,[history[0].receiptId]);assert.throws(()=>f.run("receipt_('admin',records[0][0],'other-review')"),/Revisión no encontrada/);assert.equal(readFiles.length,1);
 f.run("getRole_=()=>{throw Error('Cuenta no autorizada')}");assert.throws(()=>f.run("receipt_('admin',records[0][0],reviewId)"),/no autorizada/);assert.equal(readFiles.length,1);
});
function statusAccess(f){const url=f.run('statusUrl_(rows_(sheet)[0].record)');const match=url.match(/\/estado\/([^/]+)\/([a-f0-9]{64})$/);f.context.statusId=decodeURIComponent(match[1]);f.context.statusToken=match[2];return {url,token:match[2],id:f.context.statusId};}
test('enlace privado permite consultar el estado sin exponer datos personales ni comprobantes',()=>{
 const f=fixture();const access=statusAccess(f);assert.match(f.mails[0].body,new RegExp(access.token));assert.match(f.mails[0].htmlBody,/Consultar estado de mi solicitud/);assert.notEqual(f.get('statusLinkSeed'),access.token);
 const info=f.run('requestStatus_(statusId,statusToken)');assert.equal(info.status,'PENDING');assert.deepEqual(Object.keys(info).sort(),['expiresAt','id','reason','selectedPolicy','status','updatedAt']);assert.equal(info.id,access.id);assert.equal(info.reason,'');assert.equal(f.run("overview_('admin').rows[0].statusLinkSeed"),undefined);
});
test('un mismo enlace refleja rechazo, reemplazo y aprobación sin permitir modificaciones',()=>{
 const f=fixture();const access=statusAccess(f);f.reject();let info=f.run('requestStatus_(statusId,statusToken)');assert.equal(info.status,'REJECTED');assert.equal(info.reason,'El comprobante está borroso.');assert.match(f.mails[1].body,new RegExp(access.token));f.context.token=f.token();f.run("reupload_(token,input.receipt,'corrected-reference','SINPE')");info=f.run('requestStatus_(statusId,statusToken)');assert.equal(info.status,'PENDING');assert.equal(info.reason,'');assert.match(f.mails[2].body,new RegExp(access.token));f.run("review_('admin',{id:records[0][0],decision:'APPROVED'})");info=f.run('requestStatus_(statusId,statusToken)');assert.equal(info.status,'APPROVED');assert.equal(info.reason,'');assert.match(f.mails[3].body,new RegExp(access.token));
});
test('código sin token, token incorrecto, otra solicitud y enlace vencido no permiten consulta',()=>{
 const f=fixture();statusAccess(f);assert.throws(()=>f.run("requestStatus_(statusId,'')"),e=>e.code==='STATUS_LINK_INVALID');assert.throws(()=>f.run("requestStatus_(statusId,'0'.repeat(64))"),e=>e.code==='STATUS_LINK_INVALID');assert.throws(()=>f.run("requestStatus_('POL-OTRA-SOLICITUD',statusToken)"),e=>e.code==='STATUS_LINK_INVALID');f.set('statusLinkExpiresAt','2000-01-01T00:00:00Z');assert.throws(()=>f.run('requestStatus_(statusId,statusToken)'),e=>e.code==='STATUS_LINK_INVALID');assert.equal(f.get('status'),'PENDING');
});
test('cuenta autorizada puede enviar un enlace nuevo y el anterior deja de funcionar',()=>{
 const f=fixture();const original=statusAccess(f);f.run("sendStatusLink_('admin',{id:records[0][0]})");assert.throws(()=>f.run('requestStatus_(statusId,statusToken)'),e=>e.code==='STATUS_LINK_INVALID');const replacement=statusAccess(f);assert.notEqual(replacement.token,original.token);assert.doesNotThrow(()=>f.run('requestStatus_(statusId,statusToken)'));assert.equal(f.get('statusEmailStatus'),'SENT');assert.match(f.mails.at(-1).subject,/Consultá el estado/);assert.equal(f.get('status'),'PENDING');
});
test('solicitudes anteriores reciben enlace al reenviarlo; sin permiso no se puede generarlo',()=>{
 const f=fixture();f.set('statusLinkSeed','');f.set('statusLinkExpiresAt','');f.run("sendStatusLink_('admin',{id:records[0][0]})");statusAccess(f);assert.doesNotThrow(()=>f.run('requestStatus_(statusId,statusToken)'));const seed=f.get('statusLinkSeed');f.run("getRole_=()=>{throw Error('Cuenta no autorizada')}");assert.throws(()=>f.run("sendStatusLink_('admin',{id:records[0][0]})"),/no autorizada/);assert.equal(f.get('statusLinkSeed'),seed);
});
