export const fields = [
  {
    "name": "identification",
    "label": "Número de identificación",
    "type": "text"
  },
  {
    "name": "firstName",
    "label": "Nombre",
    "type": "text"
  },
  {
    "name": "firstSurname",
    "label": "Primer apellido",
    "type": "text"
  },
  {
    "name": "secondSurname",
    "label": "Segundo apellido",
    "type": "text"
  },
  {
    "name": "gender",
    "label": "Género",
    "type": "text"
  },
  {
    "name": "birthDate",
    "label": "Fecha de nacimiento (día/mes/año)",
    "type": "date"
  },
  {
    "name": "phone",
    "label": "Número telefónico",
    "type": "tel"
  },
  {
    "name": "email",
    "label": "Correo electrónico",
    "type": "email"
  },
  {
    "name": "address",
    "label": "Dirección exacta",
    "type": "textarea"
  },
  {
    "name": "medicalCondition",
    "label": "¿Tiene alguna condición médica que debamos conocer?",
    "type": "textarea"
  },
  {
    "name": "emergencyName",
    "label": "Contacto de emergencia",
    "type": "text"
  },
  {
    "name": "emergencyPhone",
    "label": "Teléfono del contacto de emergencia",
    "type": "tel"
  },
  {
    "name": "relationship",
    "label": "Parentesco",
    "type": "text"
  },
  {
    "name": "activeVolunteer",
    "label": "¿Es una persona voluntaria activa?",
    "type": "yesno"
  },
  {
    "name": "memberSince",
    "label": "Año desde que es persona voluntaria de ASVO",
    "type": "number"
  },
  {
    "name": "selectedPolicy",
    "label": "Tipo de póliza a pagar",
    "type": "policy"
  },
  {
    "name": "method",
    "label": "Método de pago",
    "type": "text"
  },
  {
    "name": "reference",
    "label": "Número de referencia del pago",
    "type": "text"
  }
] as const;
