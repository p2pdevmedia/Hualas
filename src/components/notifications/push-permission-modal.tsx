'use client';

type Props = {
  isIos: boolean;
  onEnable: () => void;
  onDismiss: () => void;
};

export default function PushPermissionModal({
  isIos,
  onEnable,
  onDismiss,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-2">Activar notificaciones</h3>
        <p className="text-sm text-gray-600 mb-3">
          Recibí avisos sobre actividades, retiros, pagos y mensajes nuevos
          directamente en tu navegador o celular.
        </p>
        {isIos && (
          <p className="text-xs text-gray-500 mb-3">
            En iPhone, primero agregá la app a tu pantalla de inicio para poder
            recibir notificaciones.
          </p>
        )}
        <div className="flex gap-2 justify-end mt-4">
          <button
            type="button"
            className="px-4 py-2 text-sm rounded-md border border-gray-200 hover:bg-gray-50"
            onClick={onDismiss}
          >
            Ahora no
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
            onClick={onEnable}
          >
            Activar
          </button>
        </div>
      </div>
    </div>
  );
}
