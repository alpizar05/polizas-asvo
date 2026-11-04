import {NextRequest,NextResponse} from 'next/server';
import {backend,BackendError} from '@/lib/backend';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'};
const invalid='El enlace de consulta no es válido, fue reemplazado o venció. Solicitá a Coordinación que te envíe uno nuevo.';
export async function GET(_request:NextRequest,{params}:{params:{id:string;token:string}}){
 if(!/^POL(?:\d+)?-[A-Z0-9-]{8,50}$/i.test(params.id)||!/^[a-f0-9]{64}$/i.test(params.token))return NextResponse.json({error:invalid},{status:410,headers});
 try{
  const result=await backend('requestStatus',{id:params.id,token:params.token});
  return NextResponse.json({id:result.id,status:result.status,selectedPolicy:result.selectedPolicy,updatedAt:result.updatedAt,reason:result.reason,expiresAt:result.expiresAt},{headers});
 }catch(error){return error instanceof BackendError&&error.code==='STATUS_LINK_INVALID'?NextResponse.json({error:invalid},{status:410,headers}):NextResponse.json({error:'No pudimos consultar el estado. Intentá actualizar dentro de unos minutos.'},{status:502,headers});}
}
