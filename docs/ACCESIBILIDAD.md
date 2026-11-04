# Revisión de accesibilidad

Objetivo: WCAG 2.2 nivel AA, manteniendo la identidad visual de ASVO. Esta revisión documenta mejoras y comprobaciones; no constituye una declaración de conformidad completa ni una auditoría con lectores de pantalla.

Referencia: https://www.w3.org/WAI/WCAG22/quickref/

## Cambios

- Texto principal y campos de 1 rem (16 px con la configuración predeterminada). Ayudas y texto secundario de al menos 0,875 rem (14 px). Se retiraron tamaños absolutos de fuente en píxeles, incluidos los de las reglas para celular. El mínimo de 14 px es una decisión editorial; WCAG no establece ese mínimo universal.
- Paleta de texto secundario y placeholders reforzada. En las combinaciones principales se midieron relaciones de contraste de 6,32:1 o superiores para texto secundario, 5,80:1 para placeholders y 3,78:1 para bordes de campos. El texto de fotografías usa un fondo sólido oscuro.
- Botones de al menos 44 × 44 px, casillas de 24 × 24 px con etiqueta completa clicable, selector de póliza accesible con teclado y foco visible de alto contraste.
- Enlace Saltar al contenido principal en las pantallas públicas y en el panel. Foco al destino del salto, al resumen de errores, a los campos enlazados y a las respuestas de envío/consulta. Encabezados y regiones de tabla identificados.
- Etiquetas explícitas de formulario, ayudas persistentes enlazadas mediante aria-describedby, errores por campo y resumen navegable. Los errores no dependen únicamente del color. Se conserva la validación del servidor.
- El panel tiene etiquetas visibles para correo y rol al administrar accesos, encabezados de tabla con scope y región desplazable accesible por teclado.
- Se conservan la preferencia de movimiento reducido y el zoom del navegador. Se agrega presentación para colores forzados. Los estados completados incluyen texto para tecnología de asistencia.

## Comprobaciones realizadas

- Navegación real por teclado: primer foco en el enlace de salto; salto al formulario; siguiente Tab al primer campo; resumen de errores recibe foco; enlace de error lleva al campo correspondiente.
- Selector de póliza mediante Espacio y flechas. Confirmado el cambio entre ambas opciones sin ratón.
- Página pública con viewport de 320 px: ancho de documento de 320 px, sin desplazamiento horizontal.
- Prueba temporal, retirada del código final: tamaño de texto al 200 %, interlineado de 1,5, espaciado de letras de 0,12 em, de palabras de 0,16 em y separación entre párrafos de 2 em, manteniendo viewport de 320 px. No se detectó desplazamiento horizontal. La prueba representa ampliación del texto; no reemplaza ensayos en cada navegador y dispositivo con zoom real.
- Inspección del árbol de accesibilidad de etiquetas, grupos y mensajes del formulario y acceso administrativo. No se enviaron solicitudes ni correos reales.
- Pruebas automatizadas de mensajes de error y tamaños de fuente, junto con la suite funcional y la compilación de Next.js.

## Pendiente para una auditoría completa

Validar todas las pantallas y estados autenticados con VoiceOver/NVDA, realizar un escaneo especializado de accesibilidad, comprobar el zoom real y colores forzados en distintos navegadores y revisar todos los contrastes y casos extremos de contenido. La tabla administrativa conserva desplazamiento horizontal cuando necesita una presentación bidimensional. Las comprobaciones manuales de esta iteración no incluyeron una sesión administrativa autenticada ni los flujos privados con solicitudes reales.

Los cambios no modifican Apps Script ni requieren nuevas variables de configuración.
