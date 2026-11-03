import {NextRequest,NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {authOptions} from "@/lib/auth";
import {backend} from "@/lib/backend";
export const runtime="nodejs";
export async function GET(req:NextRequest,{params}:{params:{id:string}}){
 const session=await getServerSession(authOptions);
 if(!session?.user?.email)return NextResponse.json({error:"Sin acceso"},{status:401});
 try{
  const result=await backend("receipt",{email:session.user.email,id:params.id});
  const bytes=Buffer.from(result.base64,"base64");
  return new NextResponse(bytes,{headers:{"Content-Type":result.mime,"Content-Disposition":"inline; filename=\"comprobante\"","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Sin acceso"},{status:403});}
}
