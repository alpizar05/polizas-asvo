const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const crypto=require('node:crypto');
const source=fs.readFileSync('google-apps-script/Code.gs','utf8');
function fixture(options={}){
 const messages=[];const status={};const logs=[];
 const context=vm.createContext({Utilities:{computeHmacSha256Signature:(value,key)=>Array.from(crypto.createHmac('sha256',key).update(value).digest())},console:{error:message=>logs.push(message)},MailApp:{getRemainingDailyQuota:()=>options.quota??10,sendEmail:message=>{if(options.fail)throw Error('Mail failed');messages.push(message);}}});vm.runInContext(source,context);vm.runInContext("prop_=key=>key==='PUBLIC_SITE_URL'?'https://polizas.example':'coordinacion@example.com'",context);
 const headers=['receivedEmailStatus','receivedEmailSentAt','paymentEmailStatus','paymentEmailSentAt'];
 context.sheet={getLastColumn:()=>headers.length,getRange:(row,column)=>({getValues:()=>[headers],setValue:value=>status[headers[column-1]]=value})};
 context.record={id:'POL-prueba',firstName:'<script>persona</script>',email:'PERSONA@example.com',selectedPolicy:'18000',medicalCondition:'MEDICAL_PRIVATE',identification:'ID_PRIVATE',emergencyPhone:'PHONE_PRIVATE',status:'APPROVED',statusLinkSeed:'fixture-seed',statusLinkExpiresAt:new Date(Date.now()+90*24*60*60*1000).toISOString()};
 return {context,messages,status,logs};
}
test('confirmaciones incluyen estado y código, escapan HTML y omiten datos sensibles',()=>{
 const f=fixture();for(const event of ['received','payment'])vm.runInContext(`notify_(sheet,2,record,'${event}')`,f.context);
 assert.equal(f.messages.length,2);assert.equal(f.messages[0].to,'persona@example.com');assert.equal(f.messages[0].replyTo,'coordinacion@example.com');assert.match(f.messages[0].body,/Pendiente de revisión/);assert.match(f.messages[1].body,/Pago aprobado/);
 for(const m of f.messages){assert.match(m.body,/POL-prueba/);assert.match(m.htmlBody,/&lt;script&gt;/);assert.doesNotMatch(m.htmlBody,/<script>/);assert.doesNotMatch(JSON.stringify(m),/MEDICAL_PRIVATE|ID_PRIVATE|PHONE_PRIVATE/);assert.equal(m.attachments,undefined);}
 assert.equal(f.status.receivedEmailStatus,'SENT');assert.equal(f.status.paymentEmailStatus,'SENT');assert.ok(f.status.receivedEmailSentAt);
});
test('fallo de envío o cuota deja ERROR sin lanzar error al registro',()=>{
 for(const options of [{fail:true},{quota:0}]){const f=fixture(options);assert.doesNotThrow(()=>vm.runInContext("notify_(sheet,2,record,'received')",f.context));assert.equal(f.messages.length,0);assert.equal(f.status.receivedEmailStatus,'ERROR');assert.equal(f.status.receivedEmailSentAt,'');assert.equal(f.logs.length,1);}
});
test('no vuelve a enviar una notificación registrada como enviada',()=>{
 const f=fixture();f.context.record.receivedEmailStatus='SENT';vm.runInContext("notify_(sheet,2,record,'received')",f.context);assert.equal(f.messages.length,0);
});
test('correo de rechazo incluye motivo y enlace privado en texto y HTML',()=>{
 const f=fixture();Object.assign(f.context.record,{reason:'El monto no coincide <revisar>',reuploadUrl:'https://polizas.example/reupload/'+'a'.repeat(64)});
 vm.runInContext("const message=notificationMessage_(record,'rejected');",f.context);const message=vm.runInContext('message',f.context);assert.match(message.body,/El monto no coincide/);assert.match(message.body,/https:\/\/polizas.example\/reupload\//);assert.match(message.htmlBody,/&lt;revisar&gt;/);assert.match(message.htmlBody,/Cargar nuevo comprobante/);assert.doesNotMatch(message.subject,/aprobado/);
});
