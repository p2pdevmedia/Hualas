import { matchesAccountingSearch } from '@/lib/accounting-search';

describe('matchesAccountingSearch', () => {
  it('ignora acentos al buscar', () => {
    expect(matchesAccountingSearch('Jose Alvarez', ['José Álvarez'])).toBe(
      true
    );
  });

  it('tolera una letra mal escrita', () => {
    expect(matchesAccountingSearch('asentos', ['Acentos contables'])).toBe(
      true
    );
  });

  it('tolera una letra repetida por error', () => {
    expect(matchesAccountingSearch('eescribe', ['Escribe comprobante'])).toBe(
      true
    );
  });

  it('requiere que todas las palabras tengan una coincidencia razonable', () => {
    expect(matchesAccountingSearch('maria escalada', ['Maria Lopez'])).toBe(
      false
    );
  });
});
