import "./styles.css";

export const metadata = {
  title: "Renovación de pólizas | ASVO",
  description:
    "Formulario de renovación de pólizas para el voluntariado de ASVO.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body><a className="skip-link" href="#main-content">Saltar al contenido principal</a>{children}</body>
    </html>
  );
}
