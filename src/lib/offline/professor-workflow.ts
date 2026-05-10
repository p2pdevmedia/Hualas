import { enqueueMutation } from './pending-mutations';

export type ProfessorWorkflowMutation = {
  url: string;
  method: string;
  body: Record<string, unknown>;
  dedupeKey: string;
};

export async function saveOrQueueProfessorMutation(
  mutation: ProfessorWorkflowMutation
): Promise<{ savedLocally: boolean }> {
  if (!navigator.onLine) {
    await enqueueMutation(mutation);
    return { savedLocally: true };
  }

  try {
    const res = await fetch(mutation.url, {
      method: mutation.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mutation.body),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      throw new Error(payload?.error || 'No se pudo guardar');
    }

    return { savedLocally: false };
  } catch (err) {
    if (!navigator.onLine) {
      await enqueueMutation(mutation);
      return { savedLocally: true };
    }

    throw err;
  }
}
