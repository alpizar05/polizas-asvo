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
    "name": "policy",
    "label": "Póliza (número o referencia)",
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
    "name": "activeVolunteer",
    "label": "¿Es voluntario activo?",
    "type": "yesno"
  },
  {
    "name": "memberSince",
    "label": "Año desde que es miembro voluntario de ASVO",
    "type": "number"
  },
  {
    "name": "policy2026",
    "label": "Tipo de póliza 2026",
    "type": "policy"
  },
  {
    "name": "policy2025",
    "label": "Tipo de póliza 2025",
    "type": "text"
  },
  {
    "name": "method",
    "label": "Método de pago",
    "type": "text"
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
  }
] as const;
