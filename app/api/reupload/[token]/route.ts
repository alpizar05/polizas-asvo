import {NextRequest,NextResponse} from 'next/server';
import {paymentError} from '@/lib/payment-errors';
import {backend,BackendError} from '@/lib/backend';
import {readReceipt} from '@/lib/receipt';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
const invalidLink='El enlace no es válido, ya fue utilizado o venció. Pedí un nuevo enlace a Coordinación.';
function failure(error:unknown){const payment=paymentError(error);if(payment)return NextResponse.json({error:payment.message},{status:payment.status,headers});return error instanceof BackendError && error.code==='REUPLOAD_LINK_INVALID'?NextResponse.json({error:invalidLink},{status:410,headers}):NextResponse.json({error:'No se pudo completar la operación. Consultá a Coordinación antes de volver a intentarlo.'},{status:502,headers});}
export async function GET(_req:NextRequest,{params}:{params:{token:string}}){
 if(!/^[a-f0-9]{64}$/i.test(params.token))return NextResponse.json({error:invalidLink},{status:410,headers});
 try{return NextResponse.json(await backend('reuploadInfo',{token:params.token}),{headers});}catch(error){return failure(error);}
}
export async function POST(req:NextRequest,{params}:{params:{token:string}}){
 if(!/^[a-f0-9]{64}$/i.test(params.token))return NextResponse.json({error:invalidLink},{status:410,headers});
 if(Number(req.headers.get('content-length')||0)>6*1024*1024)return NextResponse.json({error:'Solicitud demasiado grande.'},{status:413,headers});
 let receipt,reference,method;
 try{
  const form=await req.formData();
  if(form.get('website'))throw Error('Solicitud inválida.');
  reference=String(form.get('reference')||'').trim();method=String(form.get('method')||'');
  if(!reference || reference.length>180 || !['SINPE','TRANSFERENCIA'].includes(method))throw Error('Revisá la referencia y el método del nuevo pago.');
  receipt=await readReceipt(form.get('receipt'));
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Revisá los datos.'},{status:400,headers});}
 try{return NextResponse.json(await backend('reupload',{token:params.token,receipt,reference,method}),{headers});}catch(error){return failure(error);}
}
