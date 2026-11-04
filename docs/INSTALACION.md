# Instalación independiente

1. Crear una hoja de Google Sheets NUEVA y un proyecto NUEVO de Apps Script. No utilizar la hoja, despliegue ni secretos de Fiesta ASVO.
2. Copiar `google-apps-script/Code.gs`. Configurar en propiedades del script: `SPREADSHEET_ID`, `DRIVE_FOLDER_ID` (carpeta nueva y privada), `PUBLIC_SITE_URL` (dirección HTTPS principal del formulario, sin rutas), `BACKEND_SHARED_SECRET` (secreto aleatorio largo), `ADMIN_EMAIL` (cuenta autorizada por ASVO).
3. Ejecutar `setup()` y autorizar los permisos. Crea `Renovaciones` y `Administradores`. Mantener la hoja privada.
4. Desplegar como aplicación web, ejecutar como propietario y acceso cualquiera. El secreto compartido protege las operaciones y solo se usa desde el servidor. Copiar URL `/exec` a `APPS_SCRIPT_URL`.
5. Crear credenciales Google OAuth para este nuevo proyecto. Agregar URI de retorno `https://DOMINIO/api/auth/callback/google` (y `http://localhost:3000/api/auth/callback/google` para desarrollo).
6. Completar variables de `.env.example` en `.env.local` o proveedor de alojamiento. `NEXTAUTH_SECRET` y `BACKEND_SHARED_SECRET` deben ser nuevos y diferentes. Nunca subir `.env.local`.
7. Ejecutar `npm run build` y desplegar como aplicación Next.js en Vercel u otro servidor Node.js. Configurar `NEXTAUTH_URL` con el dominio definitivo.
8. Probar un registro de prueba, verificar todos los campos y el comprobante privado, impedir duplicados por identificación, acceso denegado a una cuenta no autorizada, aprobación y rechazo desde `/admin`. Borrar los registros de prueba desde la hoja antes de abrir al público.

Los datos de pago deben confirmarse antes de abrir el formulario al público. Se envía una confirmación por correo al registrar una solicitud, al aprobar el pago, al rechazar un comprobante y al recibir un comprobante nuevo. El estado de revisión también se consulta en el panel. El administrador verifica el comprobante privado desde el panel antes de aprobar. Una aprobación registra la revisión del pago; no emite una póliza.

Para actualizar una instalación existente: reemplazar Code.gs en Apps Script, ejecutar setup() y actualizar la implementación existente desde Implementar → Administrar implementaciones → Editar → Nueva versión → Implementar. Se conserva la URL /exec. La pestaña de renovaciones se renombra a Renovaciones y se agrega selectedPolicy; las columnas históricas se conservan para no perder datos. Las nuevas solicitudes incluyen el número de referencia y ya no solicitan pólizas anteriores. Publicar esta versión de Apps Script antes de usar el formulario actualizado.

## Activar las confirmaciones por correo

1. Reemplazar Code.gs por la versión actual del repositorio.
2. Configurar PUBLIC_SITE_URL en las propiedades del script con la dirección principal HTTPS del sitio (por ejemplo https://polizas.example.com), sin /admin ni otras rutas. Guardar y ejecutar setup(). Aceptar el permiso de envío de correo de Google. Esta función consulta la cuota y agrega las columnas de seguimiento; no envía correos.
3. Actualizar la implementación existente: Implementar → Administrar implementaciones → Editar → Nueva versión → Implementar. Conservar la URL /exec en Vercel.
4. Enviar una solicitud de prueba a una cuenta propia y comprobar el correo de recepción (también en spam). Aprobar esa solicitud desde el panel y comprobar el segundo correo.

Los correos salen desde la cuenta propietaria que ejecuta Apps Script, con el nombre «Coordinación de Voluntariado ASVO». Las respuestas se dirigen a ADMIN_EMAIL. No se necesitan nuevas variables en Vercel ni un proveedor externo.

Las columnas receivedEmailStatus / receivedEmailSentAt y paymentEmailStatus / paymentEmailSentAt registran el resultado. SENT significa que MailApp aceptó el envío; no confirma entrega o lectura. ERROR indica un fallo de permisos, cuota o envío. El registro y la aprobación se conservan aunque falle el correo. No hay reintentos automáticos ni envíos retroactivos a solicitudes existentes; al aprobar una solicitud anterior sí se intenta el correo de aprobación. Al rechazar se envía el motivo y el enlace privado para corregir el comprobante.

## Rechazo y nuevo comprobante

1. Coordinación rechaza una solicitud pendiente e indica el motivo obligatorio.
2. Se guarda el rechazo y se envía un correo con el motivo y el enlace personal /reupload/TOKEN. El enlace vence a los 7 días. En la hoja se guarda el hash del token, no el enlace completo.
3. La persona abre el enlace, ve el motivo y el mismo código de solicitud, selecciona el método de pago, indica la referencia del comprobante nuevo y lo adjunta (JPG, PNG o PDF, máximo 4 MB).
4. Un envío correcto cambia la misma solicitud a PENDING e invalida el enlace. Conserva el comprobante anterior y su motivo en receiptHistory; los archivos siguen privados en Drive. Envía el correo de nuevo comprobante recibido.
5. Coordinación revisa otra vez. Puede aprobar y enviar el correo de aprobación, o rechazar nuevamente y generar otro enlace.
6. Si el enlace venció o falló el envío del correo, el panel ofrece Reenviar enlace para solicitudes rechazadas. Genera un enlace nuevo e invalida el anterior.

Se agregan las columnas rejectionEmailStatus / rejectionEmailSentAt, reuploadEmailStatus / reuploadEmailSentAt, reuploadExpiresAt y receiptHistory. Los estados de envío aparecen en el panel. No se altera el registro o la aprobación si falla MailApp.

Para activar esta versión: configurar PUBLIC_SITE_URL, actualizar Code.gs, ejecutar setup() y aceptar el permiso de correo; después actualizar la implementación existente de Apps Script y desplegar la aplicación Next.js con las nuevas rutas. Las rutas de reemplazo y el backend deben estar actualizados antes de enviar los primeros rechazos con enlace. No requiere cambios en Google OAuth. Probar con una cuenta propia el ciclo completo de rechazo, reemplazo, nuevo rechazo y aprobación. Los tests locales usan servicios simulados y no envían correos reales.

## Referencias de pago repetidas

El registro inicial, el reemplazo de un comprobante y la aprobación verifican que la referencia no pertenezca a otra solicitud. La comparación es global entre métodos de pago e incluye las referencias históricas de comprobantes reemplazados y las solicitudes pendientes, aprobadas o rechazadas. Ignora espacios, guiones y mayúsculas; conserva los ceros iniciales en la comparación. No se utiliza el monto para decidir si una referencia está repetida.

Al reemplazar un comprobante de la misma solicitud se puede conservar su referencia, por ejemplo para volver a cargar una imagen legible del mismo pago. Una referencia de otra solicitud produce un mensaje de conflicto (HTTP 409). No se crea un archivo nuevo, no se consume el enlace de reemplazo y no se modifica el registro existente. La comprobación y la escritura se realizan bajo el mismo bloqueo de Apps Script para impedir que dos registros simultáneos reserven la misma referencia.

Si ya existen referencias duplicadas en la hoja, tampoco se permite aprobarlas hasta que Coordinación revise y corrija los registros implicados. No se eliminan ni se fusionan solicitudes automáticamente. La validación depende de la referencia ingresada; la comprobación visual del documento sigue a cargo de Coordinación. Esta actualización no agrega columnas ni publica cambios automáticamente.

## Filtros del panel

Los filtros de estado, póliza y método de pago se combinan con la búsqueda. La búsqueda incluye nombre, correo, código, identificación, teléfono y referencia, sin distinguir mayúsculas ni tildes. Limpiar filtros restablece la lista completa. El contador muestra las coincidencias respecto al total; el resumen superior conserva los totales generales y está identificado como tal. Exportar resultados CSV incluye exactamente las solicitudes visibles. Los métodos antiguos se agrupan con SINPE Móvil o transferencia cuando corresponda; otros métodos y valores sin indicar siguen disponibles en los selectores. Los filtros se conservan al actualizar el panel. No se necesitan columnas nuevas ni cambios en Apps Script por esta función.

## Historial de revisiones

Se agrega reviewHistory a la hoja mediante setup(). Cada decisión nueva guarda un identificador de revisión, el correo de la cuenta autenticada que revisó, fecha y hora UTC, aprobación o rechazo, motivo u observaciones y el comprobante, referencia, método y póliza revisados en ese momento. El rechazo exige motivo; la aprobación permite observaciones opcionales. Estado e historial se guardan juntos bajo el mismo bloqueo. Un fallo posterior de correo no elimina la decisión.

El panel muestra el historial por solicitud, más reciente primero, con fechas en hora de Costa Rica. Permite abrir el comprobante de cada revisión mediante una ruta que verifica la cuenta y la pertenencia de la revisión a esa solicitud. El reemplazo de un comprobante conserva las revisiones anteriores. Reenviar un enlace de rechazo no agrega una decisión nueva. No hay edición ni eliminación de revisiones desde el panel. Las decisiones previas a esta función no se reconstruyen ni se les atribuye un autor desconocido.

Si la columna contiene un historial inválido, se bloquea una revisión nueva para evitar sobrescribirlo. La hoja y Drive siguen siendo editables por su propietario; este historial no es un registro externo a prueba de modificaciones. Antes de activar, actualizar Code.gs, ejecutar setup() y publicar la nueva versión del backend junto con las rutas y el panel actualizados.
