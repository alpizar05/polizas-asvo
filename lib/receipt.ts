export async function readReceipt(file:FormDataEntryValue|null){
 if(!(file instanceof File))throw Error('Adjuntá un comprobante.');
 if(file.size>4*1024*1024 || file.size<100)throw Error('El archivo debe tener entre 100 bytes y 4 MB.');
 if(!['image/jpeg','image/png','application/pdf'].includes(file.type))throw Error('Solo JPG, PNG o PDF.');
 const bytes=Buffer.from(await file.arrayBuffer());
 const valid=file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:file.type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.subarray(0,5).toString()==='%PDF-';
 if(!valid)throw Error('El contenido no coincide con el formato declarado.');
 return {name:file.name.slice(0,130),type:file.type,base64:bytes.toString('base64')};
}
