/** Renovación de pólizas ASVO. Usar un proyecto y una hoja NUEVOS, separados de Fiesta.
 * Propiedades: BACKEND_SHARED_SECRET, SPREADSHEET_ID, DRIVE_FOLDER_ID, PUBLIC_SITE_URL, ADMIN_EMAIL.
 * Aplicación web: ejecutar como propietario; acceso cualquiera. Se autentica con secreto del servidor.
 */
const HEADERS = ["id", "date", "name", "email", "phone", "method", "reference", "status", "receiptId", "reason", "updatedAt", "reuploadToken", "identification", "firstName", "firstSurname", "secondSurname", "birthDate", "address", "medicalCondition", "emergencyName", "emergencyPhone", "relationship", "activeVolunteer", "memberSince", "selectedPolicy", "receivedEmailStatus", "receivedEmailSentAt", "paymentEmailStatus", "paymentEmailSentAt", "rejectionEmailStatus", "rejectionEmailSentAt", "reuploadEmailStatus", "reuploadEmailSentAt", "reuploadExpiresAt", "receiptHistory", "reviewHistory", "statusLinkSeed", "statusLinkExpiresAt", "statusEmailStatus", "statusEmailSentAt", "province", "canton", "district"];
const ADMIN_HEADERS = ['email','role','active'];
function prop_(key) {
  const v = PropertiesService.getScriptProperties().getProperty(key);
  if (!v) throw Error('Falta configuración: ' + key);
  return v;
}

function ss_() {
  return SpreadsheetApp.openById(prop_('SPREADSHEET_ID'));
}

function sheet_(name, headers) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);

  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  }

  return sh;
}

function registrations_() {
  const ss = ss_();
  let sh = ss.getSheetByName('Renovaciones');
  if (!sh) {
    sh = ss.getSheets().find(s => /^Renovaciones/.test(s.getName()));
    if (sh) sh.setName('Renovaciones');
  }
  if (!sh) return sheet_('Renovaciones', HEADERS);
  const values = sh.getDataRange().getValues();
  const existing = values[0].map(String);
  for (const header of HEADERS) {
    if (existing.includes(header)) continue;
    const column = existing.length + 1;
    sh.getRange(1, column).setValue(header);
    if (header === 'selectedPolicy' && values.length > 1) {
      const legacy = existing.map((h,i) => /^policy\d{4}$/.test(h) ? i : -1).filter(i => i >= 0);
      sh.getRange(2, column, values.length - 1, 1).setValues(values.slice(1).map(row => [legacy.map(i => row[i]).find(v => ['9000','18000'].includes(String(v))) || '']));
    }
    existing.push(header);
  }
  return sh;
}

function admins_() {
  return sheet_('Administradores', ADMIN_HEADERS);
}

function setup() {
  // Solicita el permiso de envío sin enviar correos durante la instalación.
  MailApp.getRemainingDailyQuota();
  publicSiteUrl_();
  registrations_();
  admins_();

  const email = prop_('ADMIN_EMAIL').toLowerCase();
  const sh = admins_();
  const data = sh.getDataRange().getValues();

  if (!data.slice(1).some((r) => String(r[0]).toLowerCase() === email)) {
    sh.appendRow([email, 'ADMIN', true]);
  }
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents || '{}');
    if (req.secret !== prop_('BACKEND_SHARED_SECRET')) {
      throw Error('Acceso denegado');
    }

    let data;
    switch (req.action) {
      case 'register':
        data = register_(req.data);
        break;
      case 'receipt':
        data = receipt_(req.email,req.id,req.reviewId);
        break;
      case 'reuploadInfo':
        data = reuploadInfo_(req.token);
        break;
      case 'reupload':
        data = reupload_(req.token,req.receipt,req.reference,req.method);
        break;
      case 'resendRejection':
        data = resendRejection_(req.email,req.data);
        break;
      case 'requestStatus':
        data = requestStatus_(req.id,req.token);
        break;
      case 'sendStatusLink':
        data = sendStatusLink_(req.email,req.data);
        break;
      case 'overview':
        data = overview_(req.email);
        break;
      case 'review':
        data = review_(req.email, req.data);
        break;
      case 'admins':
        data = listAdmins_(req.email);
        break;
      case 'addAdmin':
        data = addAdmin_(req.email, req.data);
        break;
      case 'removeAdmin':
        data = removeAdmin_(req.email, req.data);
        break;
      default:
        throw Error('Acción no permitida');
    }

    return respond_({ ok: true, ...data });
  } catch (err) {
    return respond_({ ok: false, error: String(err.message || err), code: err.code || '' });
  }
}

function rows_(sh) {
  const values = sh.getDataRange().getValues();
  return values
    .slice(1)
    .filter((r) => r[0])
    .map((r, i) => ({
      row: i + 2,
      record: Object.fromEntries(values[0].map((h, j) => [h, r[j]])),
    }));
}

function getRole_(email) {
  if (!email) throw Error('No autorizado');

  const normalized = String(email).trim().toLowerCase();
  const match = rows_(admins_()).find(
    (x) =>
      String(x.record.email).toLowerCase() === normalized &&
      String(x.record.active).toLowerCase() === 'true',
  );

  if (!match) throw Error('Cuenta no autorizada');
  return match.record.role;
}

function requireAdmin_(email) {
  if (getRole_(email) !== 'ADMIN') throw Error('Requiere rol Administrador');
}

function safe_(value) {
 const s = String(value == null ? '' : value).trim().slice(0,1000);
 return /^[=+@\-]/.test(s) ? "'" + s : s;
}
// La referencia identifica el pago en toda la campaña, incluso en comprobantes anteriores.
// Al corregir una solicitud se puede conservar la referencia del mismo pago.
function referenceKey_(value) {
 return String(value == null ? '' : value).trim().replace(/^'/,'').normalize('NFKC').replace(/[\s\u200B-\u200D\uFEFF\-\u2010-\u2015]/g,'').toUpperCase();
}

function assertReferenceAvailable_(reference,excludeId) {
 const key=referenceKey_(reference);
 if(!key) {
  const error=Error('Ingresá un número de referencia de pago válido.');
  error.code='INVALID_PAYMENT_REFERENCE';throw error;
 }
 const duplicate=rows_(registrations_()).some(({record})=>{
  if(excludeId && String(record.id)===String(excludeId)) return false;
  if(referenceKey_(record.reference)===key) return true;
  let history=[];
  try{history=JSON.parse(record.receiptHistory || '[]');}catch(error){}
  return Array.isArray(history) && history.some(item=>item && referenceKey_(item.reference)===key);
 });
 if(duplicate) {
  const error=Error('Esta referencia de pago ya está registrada. Revisá el número o contactá a Coordinación si necesitás corregir un comprobante.');
  error.code='DUPLICATE_PAYMENT_REFERENCE';throw error;
 }
}

function register_(d) {
 if(!d || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || '')) throw Error('Datos incompletos');
 if(['province','canton','district'].some(key=>d[key]!==undefined)) {
  if(!['San José','Alajuela','Cartago','Heredia','Guanacaste','Puntarenas','Limón'].includes(d.province)) throw Error('Provincia inválida');
  ['canton','district'].forEach(key=>{if(typeof d[key]!=='string'||!d[key].trim()||d[key].length>180) throw Error('Dirección incompleta');});
  d.address=[d.province,d.canton.trim(),d.district.trim()].join(', ');
 }
 const required = ["identification", "firstName", "firstSurname", "secondSurname", "birthDate", "phone", "email", "address", "medicalCondition", "emergencyName", "emergencyPhone", "relationship", "activeVolunteer", "memberSince", "selectedPolicy", "method", "reference"];
 required.forEach(key => {if(typeof d[key] !== 'string' || !d[key].trim() || d[key].length > 1000) throw Error('Datos incompletos');});
 if(!['9000','18000'].includes(d.selectedPolicy)) throw Error('Póliza inválida');
 if(!['Sí','No'].includes(d.activeVolunteer)) throw Error('Datos inválidos');
 const lock=LockService.getScriptLock(); lock.waitLock(20000);
 try {
  const sh=registrations_();
  if(rows_(sh).some(x=>String(x.record.identification)===safe_(d.identification))) throw Error('Ya existe una solicitud con esta identificación. Contactá a Coordinación.');
  assertReferenceAvailable_(d.reference);
  const id='POL-'+Utilities.getUuid().slice(0,12).toUpperCase();
  const now=new Date().toISOString();
  const statusAccess=newStatusAccess_();
  const statusUrl=statusUrl_({id,...statusAccess});
  const fileId=upload_(d.receipt,id);
  const record={...d,...statusAccess,id,date:now,name:[d.firstName,d.firstSurname,d.secondSurname==='No aplica'?'':d.secondSurname].filter(Boolean).join(' '),status:'PENDING',receiptId:fileId,reason:'',updatedAt:now,reuploadToken:'',receivedEmailStatus:'PENDING',receivedEmailSentAt:'',paymentEmailStatus:'',paymentEmailSentAt:''};
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  sh.appendRow(headers.map(key=>safe_(record[key])));
  notify_(sh,sh.getLastRow(),record,'received');
  return {id,statusUrl};
 } finally {lock.releaseLock();}
}
function overview_(email) {
 const role=getRole_(email);
 return {role,rows:rows_(registrations_()).map(x=>{const {reuploadToken,statusLinkSeed,...record}=x.record;return record;})};
}
function find_(id) {
 const match=rows_(registrations_()).find(x=>x.record.id===id);
 if(!match) throw Error('Solicitud no encontrada');
 return match;
}
function review_(email,d) {
 getRole_(email);
 if(!d || !['APPROVED','REJECTED'].includes(d.decision)) throw Error('Decisión inválida');
 const reason=String(d.reason || '').trim().slice(0,400);
 if(d.decision==='REJECTED' && !reason) throw Error('Indicá el motivo del rechazo');
 // Validar la dirección del sitio antes de guardar un rechazo que necesita enlace.
 if(d.decision==='REJECTED') publicSiteUrl_();
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try {
  const item=find_(d.id);
  if(item.record.status!=='PENDING') throw Error('La solicitud ya fue revisada');
  if(d.decision==='APPROVED') assertReferenceAvailable_(item.record.reference,item.record.id);
  const sh=registrations_();
  const now=new Date().toISOString();
  const history=reviewHistory_(item.record);
  history.push({id:Utilities.getUuid(),decision:d.decision,reviewedBy:String(email).trim().toLowerCase(),reviewedAt:now,reason,receiptId:String(item.record.receiptId),reference:String(item.record.reference || ''),method:String(item.record.method || ''),selectedPolicy:String(item.record.selectedPolicy || '')});
  const historyJson=JSON.stringify(history);
  if(historyJson.length>45000) throw Error('El historial alcanzó el límite de esta hoja. Contactá a Coordinación antes de continuar.');
  const link=d.decision==='REJECTED'?createReuploadLink_():{hash:'',expiresAt:'',url:''};
  patchRecord_(sh,item.row,{reviewHistory:historyJson,status:d.decision,reason:safe_(reason),updatedAt:now,reuploadToken:link.hash,reuploadExpiresAt:link.expiresAt,...(d.decision==='REJECTED'?{rejectionEmailStatus:'PENDING',rejectionEmailSentAt:''}:{paymentEmailStatus:'PENDING',paymentEmailSentAt:''})});
  const record={...item.record,status:d.decision,reason,reuploadUrl:link.url,reuploadExpiresAt:link.expiresAt};
  // Cada rechazo es una nueva notificación, incluso tras un comprobante reenviado.
  record[d.decision==='REJECTED'?'rejectionEmailStatus':'paymentEmailStatus']='PENDING';
  notify_(sh,item.row,record,d.decision==='REJECTED'?'rejected':'payment');
  return {id:d.id,status:d.decision};
 } finally {lock.releaseLock();}
}

function patchRecord_(sh,row,patch) {
 const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
 // Una sola escritura para la transición de estado y la invalidación del enlace.
 const range=sh.getRange(row,1,1,headers.length);
 const values=range.getValues()[0];
 for(const key of Object.keys(patch)) {
  const column=headers.indexOf(key);
  if(column<0) throw Error('Actualizá las columnas ejecutando setup().');
  values[column]=patch[key];
 }
 range.setValues([values]);
}

function publicSiteUrl_() {
 const url=prop_('PUBLIC_SITE_URL').trim().replace(/\/$/,'');
 if(!/^https:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/.test(url)) throw Error('PUBLIC_SITE_URL debe ser la dirección HTTPS del sitio, sin rutas.');
 return url;
}

function tokenHash_(token) {
 return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(token),Utilities.Charset.UTF_8).map(byte=>('0'+((byte+256)%256).toString(16)).slice(-2)).join('');
}

function createReuploadLink_() {
 const token=(Utilities.getUuid()+Utilities.getUuid()).replace(/-/g,'');
 return {hash:tokenHash_(token),expiresAt:new Date(Date.now()+7*24*60*60*1000).toISOString(),url:publicSiteUrl_()+'/reupload/'+token};
}

function reuploadItem_(token) {
 if(!/^[a-f0-9]{64}$/i.test(String(token || ''))) invalidReuploadLink_();
 const hash=tokenHash_(token);
 const item=rows_(registrations_()).find(x=>x.record.status==='REJECTED' && x.record.reuploadToken===hash);
 if(!item || !item.record.reuploadExpiresAt || !Number.isFinite(Date.parse(item.record.reuploadExpiresAt)) || Date.parse(item.record.reuploadExpiresAt)<=Date.now()) invalidReuploadLink_();
 return item;
}

function invalidReuploadLink_() {
 const error=Error('El enlace no es válido, ya fue utilizado o venció. Pedí un nuevo enlace a Coordinación.');
 error.code='REUPLOAD_LINK_INVALID';throw error;
}

function reuploadInfo_(token) {
 const item=reuploadItem_(token);
 return {id:item.record.id,reason:item.record.reason,selectedPolicy:String(item.record.selectedPolicy),method:item.record.method,expiresAt:item.record.reuploadExpiresAt};
}

function reupload_(token,file,reference,method) {
 const ref=typeof reference==='string'?reference.trim():'';
 if(!ref || ref.length>180 || !['SINPE','TRANSFERENCIA'].includes(method)) throw Error('Revisá la referencia y el método del nuevo pago.');
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try {
  const item=reuploadItem_(token);
  assertReferenceAvailable_(ref,item.record.id);
  const fileId=upload_(file,item.record.id+'-nuevo');
  const now=new Date().toISOString();
  let history=[];
  try{history=JSON.parse(item.record.receiptHistory || '[]');if(!Array.isArray(history))history=[];}catch(error){history=[];}
  history.push({receiptId:item.record.receiptId,reference:item.record.reference,method:item.record.method,reason:item.record.reason,replacedAt:now});
  const sh=registrations_();
  patchRecord_(sh,item.row,{status:'PENDING',receiptId:fileId,reference:safe_(ref),method,reason:'',updatedAt:now,reuploadToken:'',reuploadExpiresAt:'',receiptHistory:JSON.stringify(history),reuploadEmailStatus:'PENDING',reuploadEmailSentAt:''});
  notify_(sh,item.row,{...item.record,status:'PENDING',reference:ref,method,reuploadEmailStatus:'PENDING'},'reuploaded');
  return {id:item.record.id,status:'PENDING'};
 } finally {lock.releaseLock();}
}

function resendRejection_(email,d) {
 getRole_(email);
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try {
  const item=find_(d && d.id);
  if(item.record.status!=='REJECTED') throw Error('Solo se puede reenviar el enlace de una solicitud rechazada.');
  const link=createReuploadLink_();
  const sh=registrations_();
  patchRecord_(sh,item.row,{reuploadToken:link.hash,reuploadExpiresAt:link.expiresAt,rejectionEmailStatus:'PENDING',rejectionEmailSentAt:''});
  notify_(sh,item.row,{...item.record,reuploadUrl:link.url,reuploadExpiresAt:link.expiresAt,rejectionEmailStatus:'PENDING'},'rejected');
  return {id:item.record.id};
 } finally {lock.releaseLock();}
}
function listAdmins_(email) {
  requireAdmin_(email);
  return {
    admins: rows_(admins_()).map((x) => ({
      email: x.record.email,
      role: x.record.role,
      active: String(x.record.active).toLowerCase() === 'true',
    })),
  };
}

function addAdmin_(email, d) {
  requireAdmin_(email);

  const target = String(d.targetEmail || '')
    .trim()
    .toLowerCase();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target) ||
    !['ADMIN', 'REVIEWER'].includes(d.role)
  ) {
    throw Error('Datos inválidos');
  }

  const sh = admins_();
  const match = rows_(sh).find(
    (x) => String(x.record.email).toLowerCase() === target,
  );

  if (match) {
    sh.getRange(match.row, 1, 1, 3).setValues([[target, d.role, true]]);
  } else {
    sh.appendRow([target, d.role, true]);
  }

  return { email: target };
}

function removeAdmin_(email, d) {
  requireAdmin_(email);

  const target = String(d.targetEmail || '')
    .trim()
    .toLowerCase();
  if (
    target === prop_('ADMIN_EMAIL').toLowerCase() ||
    target === String(email).toLowerCase()
  ) {
    throw Error('No se puede deshabilitar esta cuenta');
  }

  const match = rows_(admins_()).find(
    (x) => String(x.record.email).toLowerCase() === target,
  );
  if (!match) throw Error('Cuenta no encontrada');

  admins_().getRange(match.row, 3).setValue(false);
  return { email: target };
}

function doGet(){return respond_({status:'online',application:'Pólizas ASVO'});}

function validateReceipt_(file) {
  if (
    !file ||
    !['image/jpeg', 'image/png', 'application/pdf'].includes(file.type) ||
    !file.base64
  ) {
    throw Error('Comprobante inválido');
  }

  const bytes = Utilities.base64Decode(file.base64);
  if (bytes.length < 100 || bytes.length > 4 * 1024 * 1024) {
    throw Error('Archivo fuera de rango');
  }

  const b = bytes.map((x) => (x + 256) % 256);
  const ok =
    file.type === 'image/jpeg'
      ? b[0] === 255 && b[1] === 216 && b[2] === 255
      : file.type === 'image/png'
        ? b.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10'
        : String.fromCharCode.apply(null, b.slice(0, 5)) === '%PDF-';

  if (!ok) throw Error('Tipo de archivo incorrecto');
  return bytes;
}

function upload_(file, id) {
  const bytes = validateReceipt_(file);
  const extension =
    file.type === 'application/pdf'
      ? 'pdf'
      : file.type === 'image/png'
        ? 'png'
        : 'jpg';
  const blob = Utilities.newBlob(bytes, file.type, id + '.' + extension);
  return DriveApp.getFolderById(prop_('DRIVE_FOLDER_ID'))
    .createFile(blob)
    .getId();
}


function reviewHistory_(record) {
 if(!record.reviewHistory) return [];
 try {
  const history=JSON.parse(record.reviewHistory);
  if(Array.isArray(history) && history.every(event=>event && typeof event.id==='string' && ['APPROVED','REJECTED'].includes(event.decision) && ['reviewedBy','reviewedAt','reason','receiptId','reference','method','selectedPolicy'].every(key=>typeof event[key]==='string'))) return history;
 } catch(error) {}
 throw Error('No se pudo leer el historial de revisiones. Contactá a Coordinación antes de modificar esta solicitud.');
}

function receipt_(email, id, reviewId) {
  getRole_(email);
  const record=find_(id).record;
  let fileId=record.receiptId;
  if(reviewId) {
    const review=reviewHistory_(record).find(event=>event.id===reviewId);
    if(!review || !review.receiptId) throw Error('Revisión no encontrada en esta solicitud.');
    fileId=review.receiptId;
  }
  const file=DriveApp.getFileById(fileId);
  const blob=file.getBlob();
  return {mime:blob.getContentType(),base64:Utilities.base64Encode(blob.getBytes())};
}

// Un fallo de correo nunca revierte un registro o una aprobación ya guardados.
function notify_(sh,row,record,event) {
  const prefix={received:'receivedEmail',payment:'paymentEmail',rejected:'rejectionEmail',reuploaded:'reuploadEmail',status:'statusEmail'}[event];
  if(!prefix) throw Error('Notificación desconocida');
  if(record[prefix+'Status']==='SENT') return;
  let status='ERROR';
  let sentAt='';
  try {
    if(MailApp.getRemainingDailyQuota()<1) throw Error('Sin cuota de correo');
    const statusRecord=ensureStatusAccess_(sh,row,record);
    const message=notificationMessage_({...statusRecord,statusUrl:statusUrl_(statusRecord)},event);
    MailApp.sendEmail({...message,name:'Coordinación de Voluntariado ASVO',replyTo:prop_('ADMIN_EMAIL')});
    status='SENT';sentAt=new Date().toISOString();
  } catch(error) {
    console.error('No se pudo enviar la notificación '+event+' de '+record.id+'. Revisar permisos y cuota de MailApp.');
  }
  try {
    const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
    for(const [key,value] of [[prefix+'Status',status],[prefix+'SentAt',sentAt]]) {
      const column=headers.indexOf(key)+1;
      if(!column) throw Error('Falta columna de notificación');
      sh.getRange(row,column).setValue(value);
    }
  } catch(error) {
    console.error('No se pudo guardar el estado de notificación '+event+' de '+record.id+'.');
  }
}

function notificationMessage_(record,event) {
  const templates={
    received:{title:'Recibimos tu solicitud de renovación',state:'Pendiente de revisión',detail:'Recibimos tus datos y el comprobante de pago. Coordinación revisará la información y te enviará otro correo cuando el pago sea aprobado.',note:'Este correo confirma la recepción de tu solicitud. El pago y la vigencia de la póliza aún no están confirmados.'},
    payment:{title:'Tu pago fue aprobado',state:'Pago aprobado',detail:'Coordinación revisó y aprobó el pago de tu solicitud de renovación de póliza. Gracias por seguir siendo parte del voluntariado ASVO.',note:'Esta confirmación corresponde a la revisión del pago y no sustituye la emisión ni la confirmación de vigencia de la póliza.'},
    rejected:{title:'Necesitamos un nuevo comprobante de pago',state:'Comprobante rechazado',detail:'Coordinación no pudo aprobar tu comprobante. Revisá el motivo y cargá uno nuevo desde el enlace privado que aparece a continuación, sin completar otra solicitud.',note:'El enlace es personal, de un solo uso y vence en 7 días. No lo compartás. Si vence o necesitás ayuda, respondé a este correo para solicitar otro enlace.'},
    status:{title:'Consultá el estado de tu solicitud',state:{PENDING:'Pendiente de revisión',APPROVED:'Pago aprobado',REJECTED:'Comprobante rechazado'}[record.status] || 'En revisión',detail:'Usá el enlace privado de este correo para consultar el estado actualizado de tu solicitud cuando lo necesités.',note:'Este enlace es personal y vence en 90 días. No lo compartás. Si recibiste un enlace nuevo, el anterior dejó de funcionar.'},
    reuploaded:{title:'Recibimos tu nuevo comprobante',state:'Pendiente de revisión',detail:'Tu nuevo comprobante se guardó en la misma solicitud. Coordinación volverá a revisarlo y te avisará cuando apruebe el pago.',note:'Conservá tu código de solicitud. Este correo confirma la recepción del nuevo comprobante y no confirma el pago ni la vigencia de la póliza.'},
  };
  const {title,state,detail,note}=templates[event];
  const rejectionText=event==='rejected'?'\n\nMotivo del rechazo: '+String(record.reason)+'\n\nCargar nuevo comprobante: '+record.reuploadUrl:'';
  const rejectionHtml=event==='rejected'?'<div style="padding:18px;background:#fff3e9;border-radius:8px"><strong>Motivo del rechazo</strong><p style="white-space:pre-wrap">'+escapeHtml_(record.reason)+'</p></div><p><a style="display:inline-block;padding:14px 20px;background:#203f32;color:white;border-radius:6px" href="'+escapeHtml_(record.reuploadUrl)+'">Cargar nuevo comprobante</a></p>':'';

  const statusText=record.statusUrl?'\n\nConsultar estado de mi solicitud: '+record.statusUrl+'\nEste enlace es privado. No lo compartás.':'';
  const statusHtml=record.statusUrl?'<p><a style="display:inline-block;padding:14px 20px;background:#203f32;color:white;border-radius:6px" href="'+escapeHtml_(record.statusUrl)+'">Consultar estado de mi solicitud</a></p><p style="font-size:12px">Enlace privado. No lo compartás.</p>':'';
  const amount='₡'+Number(record.selectedPolicy).toLocaleString('es-CR');
  const name=String(record.firstName || record.name || '');
  const body=['Hola, '+name+'.','',detail+rejectionText,'','Código de solicitud: '+record.id,'Póliza seleccionada: '+amount,'Estado: '+state+statusText,'',note,'','Guardá este código para cualquier consulta. Podés responder a este correo si necesitás ayuda.','','Coordinación de Voluntariado ASVO'].join('\n');
  const htmlBody='<div style="font-family:Arial,sans-serif;background:#f5f7f0;padding:24px;color:#203f32"><div style="max-width:560px;margin:auto;background:white;padding:30px;border-radius:12px"><p style="font-size:22px;font-weight:bold">ASVO</p><h1 style="font-size:24px">'+escapeHtml_(title)+'</h1><p>Hola, '+escapeHtml_(name)+'.</p><p style="line-height:1.7">'+escapeHtml_(detail)+'</p>'+rejectionHtml+'<div style="padding:18px;background:#eff4e5;border-radius:8px"><p>Código de solicitud: <strong>'+escapeHtml_(record.id)+'</strong></p><p>Póliza seleccionada: <strong>'+escapeHtml_(amount)+'</strong></p><p>Estado: <strong>'+escapeHtml_(state)+'</strong></p></div>'+statusHtml+'<p style="font-size:12px;line-height:1.7;color:#68745f">'+escapeHtml_(note)+'</p><p style="font-size:12px">Guardá este código para cualquier consulta. Podés responder a este correo si necesitás ayuda.</p><p>Coordinación de Voluntariado ASVO</p></div></div>';
  return {to:String(record.email).trim().toLowerCase(),subject:title+' | ASVO',body,htmlBody};
}

function escapeHtml_(value) {
  return String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}


function newStatusAccess_() {
 return {statusLinkSeed:Utilities.getUuid(),statusLinkExpiresAt:new Date(Date.now()+90*24*60*60*1000).toISOString()};
}

function statusToken_(record) {
 const value='ASVO:request-status:v1:'+record.id+':'+record.statusLinkSeed;
 return Utilities.computeHmacSha256Signature(value,prop_('BACKEND_SHARED_SECRET')).map(byte=>('0'+((byte+256)%256).toString(16)).slice(-2)).join('');
}

function statusUrl_(record) {
 return publicSiteUrl_()+'/estado/'+encodeURIComponent(record.id)+'/'+statusToken_(record);
}

function ensureStatusAccess_(sh,row,record) {
 if(record.statusLinkSeed && Date.parse(record.statusLinkExpiresAt)>Date.now()) return record;
 const access=newStatusAccess_();
 patchRecord_(sh,row,access);
 return {...record,...access};
}

function invalidStatusLink_() {
 const error=Error('El enlace de consulta no es válido, fue reemplazado o venció. Solicitá a Coordinación que te envíe uno nuevo.');
 error.code='STATUS_LINK_INVALID';throw error;
}

function requestStatus_(id,token) {
 if(typeof id!=='string' || !/^POL(?:\d+)?-[A-Z0-9-]{8,50}$/i.test(id) || !/^[a-f0-9]{64}$/i.test(String(token || ''))) invalidStatusLink_();
 const item=rows_(registrations_()).find(x=>x.record.id===id);
 if(!item || !item.record.statusLinkSeed || !(Date.parse(item.record.statusLinkExpiresAt)>Date.now())) invalidStatusLink_();
 const expected=statusToken_(item.record);
 let mismatch=0;for(let i=0;i<expected.length;i++)mismatch|=expected.charCodeAt(i)^token.charCodeAt(i);
 if(mismatch || !['PENDING','APPROVED','REJECTED'].includes(item.record.status)) invalidStatusLink_();
 const r=item.record;
 return {id:r.id,status:r.status,selectedPolicy:String(r.selectedPolicy),updatedAt:String(r.updatedAt),reason:r.status==='REJECTED'?String(r.reason || ''):'',expiresAt:String(r.statusLinkExpiresAt)};
}

function sendStatusLink_(email,d) {
 getRole_(email);
 publicSiteUrl_();
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try {
  const item=find_(d && d.id);
  const access=newStatusAccess_();
  const sh=registrations_();
  patchRecord_(sh,item.row,{...access,statusEmailStatus:'PENDING',statusEmailSentAt:''});
  notify_(sh,item.row,{...item.record,...access,statusEmailStatus:'PENDING'},'status');
  return {id:item.record.id};
 } finally {lock.releaseLock();}
}
