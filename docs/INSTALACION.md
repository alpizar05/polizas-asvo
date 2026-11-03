# Instalación independiente

1. Crear una hoja de Google Sheets NUEVA y un proyecto NUEVO de Apps Script. No utilizar la hoja, despliegue ni secretos de Fiesta ASVO.
2. Copiar `google-apps-script/Code.gs`. Configurar en propiedades del script: `SPREADSHEET_ID`, `DRIVE_FOLDER_ID` (carpeta nueva y privada), `BACKEND_SHARED_SECRET` (secreto aleatorio largo), `ADMIN_EMAIL` (cuenta autorizada por ASVO).
3. Ejecutar `setup()` y autorizar los permisos. Crea `Renovaciones` y `Administradores`. Mantener la hoja privada.
4. Desplegar como aplicación web, ejecutar como propietario y acceso cualquiera. El secreto compartido protege las operaciones y solo se usa desde el servidor. Copiar URL `/exec` a `APPS_SCRIPT_URL`.
5. Crear credenciales Google OAuth para este nuevo proyecto. Agregar URI de retorno `https://DOMINIO/api/auth/callback/google` (y `http://localhost:3000/api/auth/callback/google` para desarrollo).
6. Completar variables de `.env.example` en `.env.local` o proveedor de alojamiento. `NEXTAUTH_SECRET` y `BACKEND_SHARED_SECRET` deben ser nuevos y diferentes. Nunca subir `.env.local`.
7. Ejecutar `npm run build` y desplegar como aplicación Next.js en Vercel u otro servidor Node.js. Configurar `NEXTAUTH_URL` con el dominio definitivo.
8. Probar un registro de prueba, verificar todos los campos y el comprobante privado, impedir duplicados por identificación, acceso denegado a una cuenta no autorizada, aprobación y rechazo desde `/admin`. Borrar los registros de prueba desde la hoja antes de abrir al público.

Los datos de pago deben confirmarse antes de abrir el formulario al público. No se incluyen notificaciones automáticas por correo; el estado de revisión se consulta en el panel. El administrador verifica el comprobante privado desde el panel antes de aprobar. Una aprobación registra la revisión del pago; no emite una póliza.

Para actualizar una instalación existente: reemplazar Code.gs en Apps Script, ejecutar setup() y actualizar la implementación existente desde Implementar → Administrar implementaciones → Editar → Nueva versión → Implementar. Se conserva la URL /exec. La pestaña de renovaciones se renombra a Renovaciones y se agrega selectedPolicy; las columnas históricas se conservan para no perder datos. Las nuevas solicitudes incluyen el número de referencia y ya no solicitan pólizas anteriores. Publicar esta versión de Apps Script antes de usar el formulario actualizado.
