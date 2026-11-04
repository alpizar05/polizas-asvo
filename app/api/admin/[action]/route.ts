import {NextRequest,NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {paymentError} from '@/lib/payment-errors';
import {backend} from "@/lib/backend";
export const runtime="nodejs";
const actions=["overview","review","admins","addAdmin","removeAdmin","resendRejection","sendStatusLink"];
export async function POST(req:NextRequest,{params}:{params:{action:string}}){
 const session=await getServerSession(authOptions);
 const email=session?.user?.email?.toLowerCase();
 if(!email)return NextResponse.json({error:"Iniciá sesión con Google."},{status:401});
 if(!actions.includes(params.action))return NextResponse.json({error:"Acción desconocida"},{status:404});
 try{
  const data=await req.json().catch(()=>({}));
  const result=await backend(params.action,{email,data});
  return NextResponse.json(result);
 }catch(e){const payment=paymentError(e);if(payment)return NextResponse.json({error:payment.message},{status:payment.status});return NextResponse.json({error:e instanceof Error?e.message:"Error de servidor"},{status:403});}
}
