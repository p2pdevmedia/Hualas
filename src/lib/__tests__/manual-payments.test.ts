import {
  appendManualPaymentReview,
  createManualPaymentRawData,
  getManualPaymentReviews,
  paymentStatusLabel,
  validateManualPaymentFile,
} from '../manual-payments';
import {
  buildAccountingMovementReceiptUrl,
  buildManualPaymentReceiptUrl,
} from '../blob-urls';

describe('manual payment helpers', () => {
  it('validates accepted proof files', () => {
    const file = new File(['content'], 'proof.png', { type: 'image/png' });
    expect(validateManualPaymentFile(file)).toBeNull();
  });

  it('rejects unsupported proof file types', () => {
    const file = new File(['content'], 'proof.txt', { type: 'text/plain' });
    expect(validateManualPaymentFile(file)).toBe(
      'Por favor subí una imagen (PNG, JPG) o un PDF'
    );
  });

  it('rejects proof files larger than 5MB', () => {
    const file = new File([new ArrayBuffer(5 * 1024 * 1024 + 1)], 'proof.png', {
      type: 'image/png',
    });
    expect(validateManualPaymentFile(file)).toBe(
      'El archivo debe pesar menos de 5 MB'
    );
  });

  it('builds a review trail from raw data', () => {
    const rawData = createManualPaymentRawData({
      uploadedBy: 'member@example.com',
      uploadedAt: new Date('2026-04-29T12:00:00Z'),
      proofFileName: 'proof.png',
      proofContentType: 'image/png',
    });

    const reviews = getManualPaymentReviews(rawData);
    expect(reviews).toHaveLength(1);
    expect(reviews[0].action).toBe('uploaded');
    expect(reviews[0].by).toBe('member@example.com');
  });

  it('appends reject reviews and increments rejection count', () => {
    const rawData = createManualPaymentRawData({
      uploadedBy: 'member@example.com',
      uploadedAt: new Date('2026-04-29T12:00:00Z'),
      proofFileName: 'proof.png',
      proofContentType: 'image/png',
    });

    const next = appendManualPaymentReview(rawData, {
      action: 'rejected',
      by: 'admin@example.com',
      at: '2026-04-29T13:00:00Z',
      result: 'rejected',
      comment: 'Blurry image',
    });

    expect(next.previousRejections).toBe(1);
    expect(next.accountantComments).toBe('Blurry image');
    expect(next.reviews).toHaveLength(2);
  });

  it('maps payment status labels', () => {
    expect(paymentStatusLabel('PENDING')).toBe('Pendiente');
    expect(paymentStatusLabel('APPROVED')).toBe('Aprobado');
    expect(paymentStatusLabel('REJECTED')).toBe('Rechazado');
  });

  it('builds proxy urls for private blob receipts', () => {
    expect(buildManualPaymentReceiptUrl('payment-123')).toBe(
      '/api/accounting/manual-payments/payment-123/receipt'
    );
    expect(buildAccountingMovementReceiptUrl('movement-456')).toBe(
      '/api/accounting/movements/movement-456/receipt'
    );
  });
});
