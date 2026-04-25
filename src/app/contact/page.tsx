import ContactForm from './contact-form';

export default function ContactPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">

        {/* Columna izquierda — info */}
        <div className="space-y-6">
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-body">Contacto</span>
            <h1 className="font-heading text-4xl font-semibold mt-1">Hablemos</h1>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed font-body">
              ¿Tenés alguna consulta sobre nuestras actividades o querés sumarte al club? Escribinos.
            </p>
          </div>

          <ul className="space-y-4 text-sm font-body">
            <li className="flex items-start gap-3">
              <span className="text-base mt-0.5">📍</span>
              <div>
                <p className="font-medium">Ubicación</p>
                <p className="text-muted-foreground">San Martín de los Andes, Neuquén, Argentina</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-base mt-0.5">📸</span>
              <div>
                <p className="font-medium">Instagram</p>
                <a
                  href="https://www.instagram.com/hualas_patagonico"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 underline underline-offset-4"
                >
                  @hualas_patagonico
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-base mt-0.5">✉️</span>
              <div>
                <p className="font-medium">Email general</p>
                <a href="mailto:Info@clubhualas.com.ar" className="text-primary hover:text-primary/80 underline underline-offset-4">
                  Info@clubhualas.com.ar
                </a>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-base mt-0.5">💰</span>
              <div>
                <p className="font-medium">Tesorería</p>
                <a href="mailto:tesoreria@clubhualas.com.ar" className="text-primary hover:text-primary/80 underline underline-offset-4">
                  tesoreria@clubhualas.com.ar
                </a>
              </div>
            </li>
          </ul>

          {/* Mapa embebido */}
          <div className="rounded-xl overflow-hidden border border-border h-52">
            <iframe
              title="San Martín de los Andes"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d47685.15!2d-71.3586!3d-40.1569!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9610be21a87b3b29%3A0x3f3d5fc3f3da0c0!2sSan%20Mart%C3%ADn%20de%20los%20Andes%2C%20Neuqu%C3%A9n!5e0!3m2!1ses!2sar!4v1"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        {/* Columna derecha — formulario */}
        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{ background: '#F5F0E8' }}
        >
          <h2 className="font-heading text-2xl font-semibold mb-6">Envianos un mensaje</h2>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
