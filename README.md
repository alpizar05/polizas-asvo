# Renovación de pólizas ASVO

Proyecto independiente basado en [fiesta-asvo-2026](https://github.com/alpizar05/fiesta-asvo-2026), referencia main c77e5921668f262acd9a51b9121d963c6d03a836.

Formulario de 18 campos y comprobante adjunto, validación en servidor, almacenamiento en Google Sheets y revisión de pagos mediante panel con Google OAuth. Confirmaciones por correo al recibir la solicitud, aprobar el pago, rechazar un comprobante con motivo y recibir un nuevo comprobante. Enlaces privados para corregir comprobantes sin repetir el formulario. El comprobante se carga en el formulario y se guarda en Google Drive privado. No procesa tarjetas ni cobra dinero automáticamente.

## Iniciar

Node.js 20 o posterior:

```sh
npm install
cp .env.example .env.local
npm run dev
```

Sin backend configurado se puede revisar la página, pero el servidor responde 503 al enviar: nunca simula un registro exitoso.

## Pendientes de información de Coordinación

- Nombres y coberturas de las opciones de póliza (₡9.000 y ₡18.000).
- Definir dominio, responsable y conservación de datos.

Ver [instalación](docs/INSTALACION.md). El backend de Google Apps Script se actualiza por separado siguiendo esa guía.
