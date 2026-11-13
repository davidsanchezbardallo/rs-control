import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Condiciones de uso", robots: { index: false } };

export default function Page() {
  return (
    <LegalPage title="Condiciones de uso" updated="13/11/2026">
      <p>RS Control es una aplicación privada de <strong>RS Instalaciones XXI SL</strong> para la gestión interna de la empresa. Su uso está reservado al personal autorizado, con las credenciales facilitadas por la administración.</p>
      <h2>Uso permitido</h2>
      <ul>
        <li>Cada usuario accede solo a las funciones de su rol y es responsable de custodiar su contraseña.</li>
        <li>No está permitido intentar acceder a información no autorizada ni compartir el acceso con terceros.</li>
        <li>La actividad queda registrada para garantizar la seguridad y la trazabilidad.</li>
      </ul>
      <h2>Conexión bancaria</h2>
      <p>La conexión con las cuentas bancarias de la empresa es de <strong>solo lectura</strong> y se realiza mediante el proveedor autorizado Enable Banking. La autorización se concede en la web de cada banco, puede retirarse en cualquier momento y caduca como máximo a los 180 días.</p>
      <h2>Alcance</h2>
      <p>RS Control es una herramienta de gestión y control interno. No sustituye a la contabilidad oficial, a los programas de facturación ni al asesoramiento de la gestoría.</p>
      <h2>Contacto</h2>
      <p>Para cualquier consulta sobre la aplicación, dirígete a la administración de RS Instalaciones XXI SL.</p>
    </LegalPage>
  );
}
