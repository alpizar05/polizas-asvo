import {NextRequest,NextResponse} from 'next/server';
import {backend} from '@/lib/backend';
import {validate} from '@/lib/validation';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 if(!process.env.APPS_SCRIPT_URL || !process.env.BACKEND_SHARED_SECRET) return NextResponse.json({error:'El formulario aún no está habilitado. Contactá a Coordinación.'},{status:503});
 const length=Number(req.headers.get('content-length') || 0);
 if(length>6*1024*1024)return NextResponse.json({error:'Solicitud demasiado grande.'},{status:413});
 let data; let receipt;
 try{const form=await req.formData();if(form.get('website'))return NextResponse.json({error:'Solicitud inválida.'},{status:400});  const file=form.get("receipt");
  if(!(file instanceof File))return NextResponse.json({error:"Adjuntá un comprobante."},{status:400});
  if(file.size>4*1024*1024 || file.size<100) return NextResponse.json({error:"El archivo debe tener entre 100 bytes y 4 MB."},{status:400});
  const allowed=["image/jpeg","image/png","application/pdf"];
  if(!allowed.includes(file.type))return NextResponse.json({error:"Solo JPG, PNG o PDF."},{status:400});
  const buf=Buffer.from(await file.arrayBuffer());
  const signature=buf.subarray(0,8);
  const valid=file.type==="image/jpeg" ? signature[0]===0xff&&signature[1]===0xd8&&signature[2]===0xff
   :file.type==="image/png" ? signature.equals(Buffer.from([137,80,78,71,13,10,26,10]))
   :buf.subarray(0,5).toString()==="%PDF-";
  if(!valid)return NextResponse.json({error:"El contenido no coincide con el formato declarado."},{status:400});

receipt={name:file.name.slice(0,130),type:file.type,base64:buf.toString('base64')};data=validate(Object.fromEntries(form.entries()));}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Datos inválidos.'},{status:400});}
 try{const result=await backend('register',{data:{...data,receipt}});return NextResponse.json({ok:true,id:result.id});}catch{return NextResponse.json({error:'No se pudo registrar la solicitud. Contactá a Coordinación antes de reenviarla.'},{status:502});}
}
