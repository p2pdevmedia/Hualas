import { AUDIT_REDACTED_VALUE, redactAuditValue } from '../audit-redaction';

describe('audit redaction', () => {
  it('redacts secrets, medical fields, payment raw data, mobile tokens, and message bodies', () => {
    expect(
      redactAuditValue({
        password: 'hash',
        dni: '12345678',
        child: {
          documentNumber: '87654321',
          allergies: 'sensitive',
        },
        payment: {
          rawData: { token: 'nested' },
        },
        mobile: {
          tokenHash: 'hash',
        },
      })
    ).toEqual({
      password: AUDIT_REDACTED_VALUE,
      dni: AUDIT_REDACTED_VALUE,
      child: {
        documentNumber: AUDIT_REDACTED_VALUE,
        allergies: AUDIT_REDACTED_VALUE,
      },
      payment: {
        rawData: AUDIT_REDACTED_VALUE,
      },
      mobile: {
        tokenHash: AUDIT_REDACTED_VALUE,
      },
    });

    expect(redactAuditValue({ body: 'hola' }, { model: 'Message' })).toEqual({
      body: AUDIT_REDACTED_VALUE,
    });
  });
});
