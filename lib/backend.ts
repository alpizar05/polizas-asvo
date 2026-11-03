export async function backend(action: string, payload: Record<string,unknown> = {}) {
 const endpoint=process.env.APPS_SCRIPT_URL;
 const secret=process.env.BACKEND_SHARED_SECRET;
 if(!endpoint || !secret) throw new Error("Backend sin configurar");
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),25000);
 try {
  const response=await fetch(endpoint,{
   method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},
   body:JSON.stringify({action,secret,...payload}),
   redirect:"follow",cache:"no-store",signal:controller.signal
  });
  if(!response.ok) throw new Error("Error de conexión con backend");
  const result=await response.json();
  if(!result.ok) throw new Error(result.error || "Operación rechazada");
  return result;
 } finally {clearTimeout(timer);}
}
