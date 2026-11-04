import {NextRequest,NextResponse} from 'next/server';
import {paymentError} from '@/lib/payment-errors';
import {backend} from '@/lib/backend';
import {readReceipt} from '@/lib/receipt';
import {validate} from '@/lib/validation';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 if(!process.env.APPS_SCRIPT_URL || !process.env.BACKEND_SHARED_SECRET) return NextResponse.json({error:'El formulario aún no está habilitado. Contactá a Coordinación.'},{status:503});
 const length=Number(req.headers.get('content-length') || 0);
 if(length>6*1024*1024)return NextResponse.json({error:'Solicitud demasiado grande.'},{status:413});
 let data; let receipt;
 try{const form=await req.formData();if(form.get('website'))return NextResponse.json({error:'Solicitud inválida.'},{status:400});
receipt=await readReceipt(form.get('receipt'));data=validate(Object.fromEntries(form.entries()));}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Datos inválidos.'},{status:400});}
 try{const result=await backend('register',{data:{...data,receipt}});return NextResponse.json({ok:true,id:result.id});}catch(error){const payment=paymentError(error);if(payment)return NextResponse.json({error:payment.message},{status:payment.status});return NextResponse.json({error:'No se pudo registrar la solicitud. Contactá a Coordinación antes de reenviarla.'},{status:502});}
}
