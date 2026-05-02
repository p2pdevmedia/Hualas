import Link from 'next/link';

export default function FAQPage() {
  const sections = [
    {
      title: '🏔️ Sobre el Club Hualas',
      faqs: [
        {
          question: '¿Quién es Club Hualas?',
          answer:
            'Somos un club de montaña ubicado en San Martín de los Andes, Neuquén, Patagonia. Nos especializamos en actividades de escalada, trekking y programas especiales para infancias en los Andes neuquinos.',
        },
        {
          question: '¿Cuáles son nuestras principales actividades?',
          answer:
            'Ofrecemos: expediciones y travesías en montaña para todos los niveles, cursos y salidas de escalada en roca con instructores certificados, y actividades especiales diseñadas para niñas, niños y adolescentes.',
        },
      ],
    },
    {
      title: '👥 Tipos de Usuarios y Roles',
      faqs: [
        {
          question:
            '¿Cuáles son los diferentes tipos de usuarios en la plataforma?',
          answer:
            'Hay cinco tipos de usuarios: Público (sin registro), Miembro, Profesor, Admin y Super Admin. Cada uno con diferentes permisos y funcionalidades.',
        },
        {
          question: '¿Qué puede hacer un Miembro?',
          answer: `Los Miembros pueden:
- Ver el catálogo completo de actividades disponibles
- Registrarse en actividades (para ellos mismos o para sus hijos)
- Pagar actividades a través de Mercado Pago de forma segura
- Acceder a su perfil personal y gestionar su información
- Agregar y gestionar perfiles de sus hijos
- Participar en el chat interno del club para comunicarse con otros miembros
- Ver el historial de actividades en las que han participado
- Consultar y pagar la cuota social mensual del club`,
        },
        {
          question: '¿Qué puede hacer un Profesor?',
          answer: `Los Profesores pueden realizar todas las acciones de un Miembro, además de:
- Acceder a la sección "Mis Actividades" para ver solo las actividades que tienen asignadas
- Gestionar los días programados de sus actividades
- Confirmar la asistencia de participantes por día
- Organizar participantes en grupos dentro de las actividades
- Ver detalles completos de sus alumnos registrados`,
        },
        {
          question: '¿Qué puede hacer un Admin?',
          answer: `Los Admins tienen acceso completo para:
- Crear, editar y eliminar actividades
- Gestionar el catálogo de actividades y su programación
- Administrar participantes y grupos dentro de actividades
- Gestionar usuarios del club (perfiles, roles, permisos)
- Crear y personalizar formularios para recabar información
- Ver todas las notificaciones de pagos de Mercado Pago
- Acceder al módulo de contabilidad completo`,
        },
        {
          question: '¿Qué puede hacer un Super Admin?',
          answer: `Los Super Admins tienen todas las capacidades de un Admin, más:
- Acceso total a la configuración del sitio (logo, favicon, branding)
- Gestión avanzada de roles y permisos del sistema
- Control completo de la plataforma`,
        },
      ],
    },
    {
      title: '📝 Registro e Inicio de Sesión',
      faqs: [
        {
          question: '¿Cómo me registro en la plataforma?',
          answer: `Para registrarte:
1. Haz clic en el botón "Conocer el club" en la página principal
2. Completa el formulario de registro con tu información personal
3. Recibirás una confirmación de tu cuenta
4. Podrás iniciar sesión y acceder a tu perfil

Solo necesitas un correo electrónico válido y una contraseña segura.`,
        },
        {
          question: '¿Puedo tener múltiples miembros en mi familia?',
          answer:
            'Sí, los miembros pueden agregar hijos o dependientes a sus perfiles. Cada miembro de la familia tendrá su propio perfil vinculado al tuyo, lo que permite registrar a tus hijos en actividades específicas.',
        },
        {
          question: '¿Qué información debo proporcionar al registrarme?',
          answer: `Al registrarte necesitas:
- Nombre completo
- Correo electrónico válido
- Contraseña segura
- Número de teléfono (opcional pero recomendado)

Posteriormente puedes agregar una foto de perfil y completar más información en tu panel.`,
        },
      ],
    },
    {
      title: '🎯 Cómo Funcionan las Actividades',
      faqs: [
        {
          question: '¿Cómo veo las actividades disponibles?',
          answer: `Puedes ver todas las actividades disponibles:
1. En la página principal ("Próximas actividades")
2. En la sección "Ver actividades" (disponible sin necesidad de login)
3. Dentro de tu cuenta si eres miembro

Cada actividad muestra: fecha, descripción, precio, cupos disponibles y nivel de dificultad.`,
        },
        {
          question: '¿Cómo me registro en una actividad?',
          answer: `Para registrarte en una actividad:
1. Accede a la plataforma con tu cuenta
2. Selecciona la actividad que te interesa
3. Elige si quieres registrarte a ti mismo o a uno de tus hijos
4. Haz clic en "Registrarse"
5. Completa el pago a través de Mercado Pago
6. Una vez confirmado el pago, tu inscripción está lista

¡Es importante registrarte antes de la fecha de inicio de la actividad!`,
        },
        {
          question: '¿Qué métodos de pago aceptan?',
          answer: `Aceptamos pagos a través de Mercado Pago, que permite:
- Tarjetas de crédito y débito
- Transferencias bancarias
- Billetera virtual
- Otros métodos según tu país

Mercado Pago es una plataforma segura y reconocida en toda América Latina.`,
        },
        {
          question: '¿Cuántos cupos hay en cada actividad?',
          answer:
            'El número de cupos varía según la actividad y el tipo de experiencia. En la página de cada actividad verás exactamente cuántos cupos disponibles hay. Las actividades se cierran cuando se alcanza el máximo de participantes.',
        },
        {
          question: '¿Puedo cancelar mi inscripción en una actividad?',
          answer:
            'Las políticas de cancelación pueden variar según la actividad. Te recomendamos contactar directamente al club a través de la sección de contacto para conocer las condiciones específicas de cada actividad.',
        },
        {
          question: '¿Qué son los "grupos" dentro de una actividad?',
          answer: `Los grupos son subconjuntos de participantes dentro de una actividad, útiles para:
- Dividir actividades grandes en grupos más pequeños
- Asignar profesores específicos a cada grupo
- Organizar mejor el itinerario y la dinámica
- Algunos días pueden estar restringidos a un grupo específico

Los profesores gestiona la asignación a grupos.`,
        },
        {
          question: '¿Cómo funciona la confirmación de asistencia?',
          answer: `Los profesores confirman la asistencia por cada día de la actividad:
- Después de cada día, el profesor marca quiénes asistieron
- Esto genera un registro histórico de tu participación
- Solo los participantes asignados a un grupo pueden confirmar asistencia si ese día tiene restricción de grupo`,
        },
      ],
    },
    {
      title: '💳 Cuota Social y Pagos',
      faqs: [
        {
          question: '¿Qué es la cuota social?',
          answer: `La cuota social es una contribución mensual obligatoria de todos los miembros del club. Ayuda a financiar:
- Mantenimiento de las instalaciones
- Gestión administrativa del club
- Proyectos y mejoras comunitarias
- Costos operativos generales

La cuota se genera automáticamente cada mes y debe pagarse para mantener tu membresía activa.`,
        },
        {
          question: '¿Cómo funciona el sistema de pagos familiar?',
          answer: `El club funciona con un sistema de pagos familiar:
- Los miembros se vinculan a un "Grupo Familiar"
- Cada mes se genera una factura conjunta para toda la familia
- Esta factura incluye: la cuota social de cada miembro + actividades pagadas
- Pueden pagar la factura completa de una sola vez o en cuotas
- Todos los miembros de la familia ven sus deudas pendientes en su panel

Esto simplifica el pago y permite mejor gestión de las finanzas familiares.`,
        },
        {
          question: '¿Cuál es el monto de la cuota social mensual?',
          answer:
            'El monto de la cuota social puede variar y es establecido por la administración del club. Puedes ver el monto actual en tu panel de usuario bajo "Contabilidad" o consultar directamente con el club.',
        },
        {
          question: '¿Qué sucede si no pago la cuota social?',
          answer: `Si no pagas la cuota social a tiempo:
- Se genera una deuda que se acumula mes a mes
- Podrías perder acceso a ciertos beneficios del club
- No podrías registrarte en nuevas actividades

Te recomendamos mantener tus pagos al día para disfrutar plenamente de los beneficios de la membresía.`,
        },
        {
          question: '¿Cómo puedo ver mis deudas pendientes?',
          answer: `Para ver tus deudas:
1. Inicia sesión en tu cuenta
2. Ve a "Mi Perfil" o "Panel"
3. Busca la sección "Cuota Social" o "Mis Pagos"
4. Verás un resumen de: deudas pendientes, montos, fechas de vencimiento`,
        },
        {
          question: '¿Qué pasa cuando realizo un pago?',
          answer: `Cuando pagas una actividad o la cuota social:
1. Se procesa a través de Mercado Pago de forma segura
2. Recibes una confirmación inmediata
3. El estado se actualiza en tu cuenta (pendiente → pagado)
4. Tu inscripción en actividades se confirma
5. Se genera un comprobante que puedes descargar

Los pagos se registran en tu historial de transacciones.`,
        },
      ],
    },
    {
      title: '👨‍👩‍👧‍👦 Gestión de Perfil e Hijos',
      faqs: [
        {
          question: '¿Cómo agrego un hijo a mi perfil?',
          answer: `Para agregar un hijo:
1. Ve a "Mi Perfil"
2. Busca la sección "Mis Hijos" o "Dependientes"
3. Haz clic en "Agregar Hijo"
4. Completa la información: nombre, edad, fecha de nacimiento
5. Guarda los cambios

Una vez agregado, podrás inscribir a tu hijo en actividades disponibles.`,
        },
        {
          question: '¿Puedo cambiar la información de mi perfil?',
          answer: `Sí, puedes actualizar:
- Tu nombre y datos personales
- Tu foto de perfil
- Tu teléfono y contacto
- Información de tus hijos
- Contraseña

Ve a "Mi Perfil" y haz clic en "Editar" para realizar cambios.`,
        },
        {
          question: '¿Cómo subo una foto de perfil?',
          answer: `Para subir una foto:
1. Ve a "Mi Perfil"
2. Haz clic en tu foto actual o en "Subir Foto"
3. Selecciona una imagen desde tu dispositivo
4. Confirma y guarda

Se aceptan formatos JPG, PNG. La foto debe ser menor a 5MB.`,
        },
      ],
    },
    {
      title: '💬 Chat y Comunicación',
      faqs: [
        {
          question: '¿Cómo funciona el chat interno?',
          answer: `El chat interno permite comunicarte con otros miembros del club:
1. Ve a la sección "Chat" en tu panel
2. Selecciona una conversación o inicia una nueva
3. Escribe tu mensaje y envía
4. Los mensajes se guardan en tu historial

Es una forma directa de contactar con otros miembros sin necesidad de email.`,
        },
        {
          question: '¿Puedo hablar con un profesor?',
          answer:
            'Sí, puedes iniciar una conversación privada con cualquier profesor o miembro del club a través del chat interno. También puedes usar la sección de contacto para comunicarte con la administración directamente.',
        },
      ],
    },
    {
      title: '📱 Contabilidad y Reportes',
      faqs: [
        {
          question: '¿Dónde veo mi historial de pagos?',
          answer: `Para ver tu historial:
1. Inicia sesión en tu cuenta
2. Ve a "Contabilidad" o "Mis Pagos"
3. Verás un listado de todas tus transacciones
4. Puedes filtrar por fecha, tipo de pago, etc.
5. Puedes descargar comprobantes`,
        },
        {
          question: '¿Puedo descargar un resumen de mis movimientos?',
          answer:
            'Sí, en la sección de Contabilidad encontrarás opciones para exportar tus datos en PDF o CSV. Esto es útil para registros personales y contables.',
        },
      ],
    },
    {
      title: '❓ Preguntas Generales',
      faqs: [
        {
          question: '¿Cómo contacto al club si tengo más preguntas?',
          answer: `Puedes contactarnos de varias formas:
1. Usando el formulario de contacto en la web
2. A través del chat interno si eres miembro
3. Por correo electrónico a la dirección que aparece en el sitio

Nuestro equipo responde en el menor tiempo posible.`,
        },
        {
          question: '¿Es segura mi información en esta plataforma?',
          answer: `Sí, implementamos múltiples medidas de seguridad:
- Encriptación de datos sensibles
- Conexión segura HTTPS
- Validación de pagos a través de Mercado Pago (procesador certificado)
- Protección de privacidad según estándares internacionales
- Acceso controlado por contraseña

Tu privacidad es importante para nosotros.`,
        },
        {
          question: '¿Qué hago si olvido mi contraseña?',
          answer: `Si olvidas tu contraseña:
1. En la página de login, haz clic en "¿Olvidaste tu contraseña?"
2. Ingresa tu correo electrónico
3. Recibirás un enlace para resetear tu contraseña
4. Sigue las instrucciones en el email
5. Crea una nueva contraseña segura

Si no recibes el email, verifica tu carpeta de spam.`,
        },
        {
          question: '¿Puedo dar de baja mi cuenta?',
          answer:
            'Si deseas cancelar tu membresía o eliminar tu cuenta, contacta directamente con la administración del club. Te ayudaremos con el proceso según las políticas establecidas.',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-gradient-to-r from-primary to-primary/80 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-heading text-4xl font-semibold text-white mb-3">
            Preguntas Frecuentes
          </h1>
          <p className="text-white/90 font-body">
            Todo lo que necesitas saber sobre Club Hualas y cómo funciona
            nuestra plataforma
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {sections.map((section, sectionIdx) => (
            <div key={sectionIdx} className="mb-12">
              <h2 className="font-heading text-2xl font-semibold mb-6 text-foreground">
                {section.title}
              </h2>
              <div className="space-y-4">
                {section.faqs.map((faq, faqIdx) => (
                  <details
                    key={faqIdx}
                    className="group border border-border rounded-lg bg-card overflow-hidden transition-all duration-200 hover:shadow-sm"
                  >
                    <summary className="cursor-pointer px-5 py-4 font-body font-medium text-foreground flex justify-between items-center select-none">
                      <span>{faq.question}</span>
                      <span className="text-xl text-muted-foreground group-open:rotate-180 transition-transform ml-2 flex-shrink-0">
                        ▼
                      </span>
                    </summary>
                    <div className="px-5 pb-4 pt-0 border-t border-border text-muted-foreground font-body whitespace-pre-wrap leading-relaxed">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}

          {/* Contact CTA */}
          <div className="mt-12 p-6 bg-primary/5 rounded-lg border border-primary/20">
            <h3 className="font-heading text-xl font-semibold mb-2">
              ¿No encontraste tu respuesta?
            </h3>
            <p className="text-muted-foreground font-body mb-4">
              Si tienes más preguntas o necesitas ayuda adicional, no dudes en
              contactarnos directamente.
            </p>
            <Link
              href="/contact"
              className="inline-block bg-primary px-6 py-2 rounded-full text-white text-sm font-medium hover:bg-primary/90 transition-colors font-body"
            >
              Contactar al Club
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
