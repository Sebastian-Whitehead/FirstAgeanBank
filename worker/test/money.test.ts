import { describe, expect, it } from 'vitest';
import { parseTransferAmount } from '../src/money';

const inv = { ok: false, error: 'invalidamount' };
const lim = { ok: false, error: 'limitreached' };
const ok = (cents: number) => ({ ok: true, cents });

const table: [string | null, unknown][] = [
  [null, inv], ['', inv], ['0', inv], ['0.00', inv],
  ['0.01', ok(1)], ['0.1', ok(10)], ['1', ok(100)], ['1.5', ok(150)], ['1.05', ok(105)],
  ['12.34', ok(1234)], ['4999.99', ok(499999)], ['5000', ok(500000)], ['5000.00', ok(500000)],
  ['5000.01', lim], ['5001', lim], ['9999', lim], ['10000', lim], ['99999999999999999999', lim],
  ['01', inv], ['00.5', inv], ['1.', inv], ['.5', inv], ['1.234', inv], ['-1', inv], ['+1', inv],
  [' 1', inv], ['1 ', inv], ['1e3', inv], ['1,00', inv], ['٣', inv],
  // PHP's `$` would accept a trailing newline; JS rejects it (safe tightening).
  ['1\n', inv]
];

describe('parseTransferAmount', () => {
  it.each(table)('%j', (input, expected) => {
    expect(parseTransferAmount(input)).toEqual(expected);
  });
});
