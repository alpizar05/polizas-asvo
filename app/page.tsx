'use client';

import {useEffect, useRef, useState} from 'react';
import {fields} from '@/lib/fields';

const sections = [
  {id:'personales', title:'Datos personales', description:'Empecemos con tus datos de contacto.', start:0, end:9},
  {id:'emergencia', title:'Salud y contacto de emergencia', description:'La información que necesitamos para acompañarte.', start:9, end:13},
  {id:'voluntariado', title:'Tu vínculo con ASVO', description:'Contanos sobre tu camino en el voluntariado.', start:13, end:15},
  {id:'pago', title:'Información del pago', description:'Elegí tu póliza y adjuntá el comprobante.', start:15, end:18},
];
const money = (value:string) => '₡'+Number(value).toLocaleString('es-CR');

function Icon({name, ...props}:{name:'leaf'|'arrow'|'copy'|'check'|'upload'|'file'|'lock'} & React.SVGProps<SVGSVGElement>){
  const paths = {
    leaf:<><path d="M20 4C9 2 3 7 5 14c2 7 13 6 15-10Z"/><path d="M4 21 15 10"/></>,
    arrow:<><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    copy:<><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></>,
    check:<path d="m5 12 4 4L19 6"/>,
    upload:<><path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/></>,
    file:<><path d="M14 3H5v18h14V8l-5-5Z"/><path d="M14 3v5h5M8 13h8M8 17h5"/></>,
    lock:<><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/></>,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

export default function Home(){
  const [copyStatus,setCopyStatus]=useState<Record<string,string>>({});
  const [status,setStatus]=useState('');
  const [code,setCode]=useState('');
  const [statusUrl,setStatusUrl]=useState('');
  const [busy,setBusy]=useState(false);
  const [policy,setPolicy]=useState('');
  const [receipt,setReceipt]=useState<File|null>(null);
  const [preview,setPreview]=useState('');
  const [receiptError,setReceiptError]=useState('');
  const [completed,setCompleted]=useState<boolean[]>([false,false,false,false]);
  const fileInput=useRef<HTMLInputElement>(null);
  const successRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    if(!receipt || !receipt.type.startsWith('image/')){setPreview('');return;}
    const url=URL.createObjectURL(receipt);setPreview(url);
    return ()=>URL.revokeObjectURL(url);
  },[receipt]);
  useEffect(()=>{if(code){successRef.current?.focus();successRef.current?.scrollIntoView({behavior:'smooth',block:'center'});}},[code]);

  async function copyPayment(key:string,value:string){
    try{await navigator.clipboard.writeText(value);setCopyStatus(previous=>({...previous,[key]:'Copiado'}));}
    catch{setCopyStatus(previous=>({...previous,[key]:'No se pudo copiar. Seleccioná el dato y copialo manualmente.'}));}
  }
  function updateProgress(form:HTMLFormElement){
    const values=new FormData(form);
    setCompleted(sections.map(section=>fields.slice(section.start,section.end).every(field=>String(values.get(field.name)||'').trim()) && (section.id!=='pago' || (Boolean(fileInput.current?.files?.length) && Boolean(fileInput.current?.validity.valid) && values.get('consent')==='yes'))));
  }
  function chooseReceipt(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0]||null;
    const error=file && (!['image/jpeg','image/png','application/pdf'].includes(file.type) || file.size>4*1024*1024 || file.size<100) ? 'Elegí un JPG, PNG o PDF de entre 100 bytes y 4 MB.' : '';
    e.target.setCustomValidity(error);setReceiptError(error);setReceipt(error?null:file);
  }
  async function send(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setStatus('');
    try{
      const response=await fetch('/api/register',{method:'POST',body:new FormData(e.currentTarget)});
      const data=await response.json();
      if(!response.ok)throw Error(data.error||'No se pudo enviar la solicitud.');
      setStatusUrl(typeof data.statusUrl==='string'?data.statusUrl:'');
      setCode(data.id);
    }catch(error){setStatus(error instanceof Error?error.message:'Error de envío.');}
    finally{setBusy(false);}
  }
  const copyButton=(key:string,value:string,label:string)=><div className="copy-action"><button type="button" className="copy-button" aria-label={label} onClick={()=>copyPayment(key,value)}><Icon name={copyStatus[key]==='Copiado'?'check':'copy'}/>{copyStatus[key]==='Copiado'?'Copiado':'Copiar'}</button><span className="copy-status" role="status">{copyStatus[key] && copyStatus[key]!=='Copiado'?copyStatus[key]:copyStatus[key]==='Copiado'?'Copiado al portapapeles':''}</span></div>;

  return <main className="renewal-page">
    <header className="site-header"><a href="/" className="brand" aria-label="ASVO, inicio"><img src="/logo-asvo.png" alt="ASVO — Conservación, educación y acción" width="180" height="61"/></a><div className="header-right"><span>Portal de voluntariado</span><a href="/admin"><Icon name="lock"/>Administración</a></div></header>
    <section className="hero">
      <div className="hero-copy"><span className="eyebrow"><span className="status-dot"/> RENOVACIÓN DE PÓLIZAS</span><h1>Tu compromiso sigue.<br/><em>Tu protección también.</em></h1><p>Renová tu póliza para el próximo año y mantenete como persona voluntaria activa de ASVO.</p><a className="button" href="#formulario">Renovar mi póliza<Icon name="arrow"/></a><div className="hero-note"><Icon name="leaf"/><span>Seguimos cuidando lo que nos une.</span></div></div>
      <figure className="hero-photo"><img src="/voluntariado-asvo.jpeg" alt="Personas voluntarias de ASVO reunidas en una actividad de conservación" width="1280" height="720"/><figcaption><span className="photo-mark"><Icon name="leaf"/></span><span>Una comunidad que cuida.<small>Voluntariado ASVO · Costa Rica</small></span></figcaption></figure>
    </section>
    <div className="form-layout" id="formulario">
      <aside className="guide"><div className="guide-sticky"><span className="eyebrow">TU RENOVACIÓN</span><h2>Un paso más<br/>para seguir ayudando.</h2><p>Tené a mano tus datos y el comprobante de pago.</p><nav aria-label="Secciones del formulario"><ol>{sections.map((section,index)=><li key={section.id}><a href={'#'+section.id}><span className={'step-number'+(completed[index]?' complete':'')}>{completed[index]?<Icon name="check"/>:String(index+1).padStart(2,'0')}</span><span>{section.id==='emergencia'?'Contacto de emergencia':section.title}</span></a></li>)}</ol></nav><div className="guide-note"><Icon name="lock"/><p>Tus datos y comprobante se utilizan para gestionar tu renovación. Coordinación revisará el pago antes de confirmarlo.</p></div></div></aside>
      <div className="form-content">{code?<div className="success-card" role="status" tabIndex={-1} ref={successRef}><span className="success-icon"><Icon name="check" width="32" height="32"/></span><span className="eyebrow">SOLICITUD RECIBIDA</span><h2>¡Gracias por seguir siendo parte!</h2><p>Recibimos tus datos y el comprobante. Tu pago está pendiente de revisión por Coordinación.</p><div className="request-code"><span>Código de tu solicitud</span><strong>{code}</strong>{copyButton('code',code,'Copiar código de solicitud')}</div><div className="status-link-actions">{statusUrl&&<><a className="button" href={statusUrl}>Consultar mi solicitud<Icon name="arrow"/></a>{copyButton('statusLink',statusUrl,'Copiar enlace privado de consulta')}<p className="muted">Guardá este enlace privado para consultar tu estado. No lo compartás.</p></>}</div><p className="muted">Guardá este código para consultar sobre tu renovación. La recepción de la solicitud no confirma la vigencia de la póliza.</p></div>:<>
        <div className="form-intro"><div><span className="eyebrow">FORMULARIO DE RENOVACIÓN</span><h2>Sigamos haciendo la diferencia.</h2></div><span className="required-note">* Campos obligatorios</span></div>
        <form onSubmit={send} onChange={e=>updateProgress(e.currentTarget)} aria-busy={busy}>
          {sections.map((section,index)=><fieldset className="section-card" id={section.id} key={section.id}>
            <legend><span className="section-number">{String(index+1).padStart(2,'0')}</span><span>{section.title}</span></legend><p className="section-description">{section.description}</p>
            <div className="fields">{fields.slice(section.start,section.end).map(field=>field.type==='policy'?<div className="policy-field wide" key={field.name}><span className="field-label" id="policy-label">{field.label} <span className="required">*</span></span><div className="policy-options" role="radiogroup" aria-labelledby="policy-label">{['9000','18000'].map((amount,option)=><label className={'policy-option'+(policy===amount?' selected':'')} key={amount}><input type="radio" name={field.name} value={amount} checked={policy===amount} onChange={()=>setPolicy(amount)} required/><span className="policy-option-top">Opción {option+1}<span className="radio-mark">{policy===amount&&<Icon name="check" width="14" height="14"/>}</span></span><strong>{money(amount)}</strong><span className="policy-caption">Póliza de voluntariado</span></label>)}</div></div>:<label className={field.type==='textarea'?'wide':''} key={field.name}>{field.label} <span className="required">*</span>{field.type==='textarea'?<textarea name={field.name} required maxLength={1000} rows={3} placeholder={field.name==='medicalCondition'?'Si no tenés condiciones que informar, escribí “No aplica”.':undefined}/>:field.type==='yesno'?<select name={field.name} required defaultValue=""><option value="" disabled>Seleccioná una opción</option><option>Sí</option><option>No</option></select>:field.name==='method'?<select name={field.name} required defaultValue=""><option value="" disabled>Seleccioná el método</option><option value="SINPE">SINPE Móvil</option><option value="TRANSFERENCIA">Transferencia bancaria</option></select>:<input name={field.name} type={field.type} required maxLength={180} min={field.type==='number'?1989:undefined} max={field.type==='number'?new Date().getFullYear():field.type==='date'?new Date().toISOString().slice(0,10):undefined} autoComplete={field.name==='email'?'email':field.name==='phone'?'tel':field.name==='firstName'?'given-name':field.name==='firstSurname'?'family-name':field.name==='birthDate'?'bday':undefined} placeholder={field.name==='reference'?'Número que aparece en tu comprobante':field.name==='secondSurname'?'Escribí “No aplica” si corresponde':undefined}/>}</label>)}</div>
            {section.id==='pago'&&<>
              <section className="payment-details" aria-labelledby="payment-title"><div className="payment-heading"><span className="payment-leaf"><Icon name="leaf"/></span><div><h3 id="payment-title">Datos para realizar el pago</h3><p>Incluí tu nombre y la póliza seleccionada en el detalle.</p></div></div><dl><div className="bank-row"><div><dt>SINPE Móvil</dt><dd className="bank-value">8843 2327</dd></div>{copyButton('sinpe','88432327','Copiar número de SINPE Móvil')}</div><div className="bank-row"><div><dt>Cuenta IBAN en colones</dt><dd className="iban">CR16015100010012210664</dd><dd className="bank-name">Banco Nacional de Costa Rica</dd></div>{copyButton('iban','CR16015100010012210664','Copiar cuenta IBAN en colones')}</div><div className="account-owner"><dt>Titular de la cuenta</dt><dd>Asociación de Voluntarios para el Servicio en las Áreas Protegidas</dd></div></dl></section>
              <div className="receipt-field"><span className="field-label">Comprobante de pago <span className="required">*</span></span><label className={'upload-zone'+(receipt?' has-file':'')}><input ref={fileInput} name="receipt" type="file" accept=".jpg,.jpeg,.png,.pdf" required onChange={chooseReceipt} aria-label={receipt?'Reemplazar comprobante de pago':'Seleccionar comprobante de pago'} aria-describedby="receipt-help"/>{preview?<img className="receipt-preview" src={preview} alt="Vista previa del comprobante seleccionado"/>:<span className="upload-icon"><Icon name={receipt?'file':'upload'} width="25" height="25"/></span>}<span className="upload-copy"><strong>{receipt?receipt.name:'Seleccionar comprobante'}</strong><span>{receipt?`${(receipt.size/1024/1024).toFixed(2)} MB · Seleccionar otro archivo`:'Elegí el archivo desde tu dispositivo'}</span></span><span className="upload-select">{receipt?'Cambiar':'Seleccionar'}</span></label><small id="receipt-help">JPG, PNG o PDF · Máximo 4 MB · El archivo se guarda de forma privada.</small>{receiptError&&<p className="error" role="alert">{receiptError}</p>}</div>
              <label className="check"><input type="checkbox" name="consent" value="yes" required/><span>Autorizo a ASVO a utilizar mis datos personales, de salud y de contacto de emergencia para gestionar la renovación de mi póliza y la atención de emergencias.</span></label>
            </>}
          </fieldset>)}
          <div className="honeypot" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off"/></div>
          {status&&<p role="alert" className="error submit-error">{status}</p>}
          <div className="submit-area"><p><Icon name="lock"/>Tu solicitud quedará pendiente de revisión.</p><button className="button submit-button" type="submit" disabled={busy}>{busy?'Enviando solicitud…':'Enviar solicitud de renovación'}{!busy&&<Icon name="arrow"/>}</button></div>
        </form>
      </>}</div>
    </div>
    <footer className="site-footer"><img src="/logo-asvo.png" alt="ASVO" width="128" height="43"/><p>Conservación, educación y acción.<span>Asociación de Voluntarios para el Servicio en las Áreas Protegidas</span></p><span className="footer-country">Costa Rica <Icon name="leaf"/></span></footer>
  </main>;
}
