import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Política de privacidad", robots: { index: false } };

export default function Page() {
  return (
    <LegalPage title="Política de privacidad" updated="13/11/2026">
      <p>RS Control es la aplicación de gestión interna de <strong>RS Instalaciones XXI SL</strong> (Utrera, Sevilla), de uso exclusivo para su personal autorizado. Esta política explica qué datos trata y con qué garantías, conforme al Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica 3/2018.</p>
      <h2>Responsable del tratamiento</h2>
      <p>RS Instalaciones XXI SL, Utrera (Sevilla). Para cualquier consulta sobre protección de datos puedes dirigirte a la administración de la empresa.</p>
      <h2>Datos tratados y finalidad</h2>
      <ul>
        <li><strong>Personal</strong>: datos identificativos y laborales necesarios para la gestión de obras, material, vehículos, herramientas, formación y prevención de riesgos.</li>
        <li><strong>Clientes y proveedores</strong>: datos de contacto y de facturación para la gestión administrativa.</li>
        <li><strong>Cuentas bancarias de la empresa</strong>: saldos y movimientos de las cuentas de RS Instalaciones XXI SL, obtenidos en modo <strong>solo lectura</strong> mediante banca abierta (PSD2) a través del proveedor autorizado Enable Banking, con el consentimiento expreso de la empresa. Se usan únicamente para el control de tesorería y la conciliación de facturas. La aplicación no puede realizar pagos ni conoce las claves de acceso al banco.</li>
      </ul>
      <h2>Base jurídica</h2>
      <p>Ejecución de la relación laboral y contractual, cumplimiento de obligaciones legales e interés legítimo de la empresa en la gestión de su actividad. El acceso a las cuentas bancarias se basa en el consentimiento otorgado por la empresa en su propia entidad, que puede retirarse en cualquier momento.</p>
      <h2>Destinatarios y ubicación de los datos</h2>
      <p>Los datos se alojan en la Unión Europea (Supabase, región Irlanda) y la aplicación se sirve desde Vercel (región Dublín). Los datos bancarios se obtienen a través de Enable Banking Oy (Finlandia), entidad autorizada como proveedor de servicios de información sobre cuentas. No se ceden datos a terceros salvo obligación legal.</p>
      <h2>Conservación</h2>
      <p>Los datos se conservan mientras sean necesarios para la finalidad indicada y durante los plazos legales aplicables (laborales, fiscales y mercantiles).</p>
      <h2>Seguridad</h2>
      <p>Acceso con usuario y contraseña, permisos por rol aplicados en la base de datos, documentos en almacenamiento privado, cifrado en tránsito y registro de auditoría de las operaciones relevantes.</p>
      <h2>Derechos</h2>
      <p>Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad dirigiéndote a la administración de RS Instalaciones XXI SL. También puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).</p>
    </LegalPage>
  );
}
