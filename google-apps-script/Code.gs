/** Renovación de pólizas ASVO. Usar un proyecto y una hoja NUEVOS, separados de Fiesta.
 * Propiedades: BACKEND_SHARED_SECRET, SPREADSHEET_ID, DRIVE_FOLDER_ID, ADMIN_EMAIL.
 * Aplicación web: ejecutar como propietario; acceso cualquiera. Se autentica con secreto del servidor.
 */
const HEADERS = ["id", "date", "name", "email", "phone", "method", "reference", "status", "receiptId", "reason", "updatedAt", "reuploadToken", "identification", "firstName", "firstSurname", "secondSurname", "gender", "policy", "birthDate", "address", "activeVolunteer", "memberSince", "policy2026", "policy2025", "medicalCondition", "emergencyName", "emergencyPhone", "relationship"];
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
  return sheet_('Renovaciones2026', HEADERS);
}

function admins_() {
  return sheet_('Administradores', ADMIN_HEADERS);
}

function setup() {
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
        data = receipt_(req.email,req.id);
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
    return respond_({ ok: false, error: String(err.message || err) });
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
function register_(d) {
 if(!d || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || '')) throw Error('Datos incompletos');
 const required = ["identification", "firstName", "firstSurname", "secondSurname", "gender", "policy", "birthDate", "phone", "email", "address", "activeVolunteer", "memberSince", "policy2026", "policy2025", "method", "medicalCondition", "emergencyName", "emergencyPhone", "relationship"];
 required.forEach(key => {if(typeof d[key] !== 'string' || !d[key].trim() || d[key].length > 1000) throw Error('Datos incompletos');});
 if(!['9000','18000'].includes(d.policy2026)) throw Error('Póliza inválida');
 if(!['Sí','No'].includes(d.activeVolunteer)) throw Error('Datos inválidos');
 const lock=LockService.getScriptLock(); lock.waitLock(20000);
 try {
  const sh=registrations_();
  if(rows_(sh).some(x=>String(x.record.identification)===safe_(d.identification))) throw Error('Ya existe una solicitud con esta identificación. Contactá a Coordinación.');
  const id='POL26-'+Utilities.getUuid().slice(0,12).toUpperCase();
  const now=new Date().toISOString();
  const fileId=upload_(d.receipt,id);
  const record={...d,id,date:now,name:[d.firstName,d.firstSurname,d.secondSurname==='No aplica'?'':d.secondSurname].filter(Boolean).join(' '),reference:'',status:'PENDING',receiptId:fileId,reason:'',updatedAt:now,reuploadToken:''};
  sh.appendRow(HEADERS.map(key=>safe_(record[key])));
  return {id};
 } finally {lock.releaseLock();}
}
function overview_(email) {
 const role=getRole_(email);
 return {role,rows:rows_(registrations_()).map(x=>x.record)};
}
function find_(id) {
 const match=rows_(registrations_()).find(x=>x.record.id===id);
 if(!match) throw Error('Solicitud no encontrada');
 return match;
}
function review_(email,d) {
 getRole_(email);
 if(!d || !['APPROVED','REJECTED'].includes(d.decision)) throw Error('Decisión inválida');
 const reason=d.decision==='REJECTED'?String(d.reason || '').trim().slice(0,400):'';
 if(d.decision==='REJECTED' && !reason) throw Error('Indicá el motivo del rechazo');
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try {
  const item=find_(d.id);
  if(item.record.status!=='PENDING') throw Error('La solicitud ya fue revisada');
  registrations_().getRange(item.row,8,1,5).setValues([[d.decision,item.record.receiptId,safe_(reason),new Date().toISOString(),'']]);
  return {id:d.id,status:d.decision};
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


function receipt_(email, id) {
  getRole_(email);

  const file = DriveApp.getFileById(find_(id).record.receiptId);
  const blob = file.getBlob();
  return {
    mime: blob.getContentType(),
    base64: Utilities.base64Encode(blob.getBytes()),
  };
}
