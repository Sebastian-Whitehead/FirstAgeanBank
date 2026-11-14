export type AmountResult = { ok: true; cents: number } | { ok: false; error: 'invalidamount' | 'limitreached' };

// Port of includes/transfer.inc.php amount rules; no trim, integer cents only.
export function parseTransferAmount(raw: string | null): AmountResult {
  if (raw === null || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/.test(raw)) return { ok: false, error: 'invalidamount' };
  const [dollarsText, fraction] = raw.split('.', 2);
  const dollars = parseInt(dollarsText, 10);
  if (dollarsText.length > 4 || dollars > 5000) return { ok: false, error: 'limitreached' };
  const cents = dollars * 100 + parseInt((fraction ?? '').padEnd(2, '0'), 10);
  if (cents <= 0) return { ok: false, error: 'invalidamount' };
  if (cents > 500000) return { ok: false, error: 'limitreached' };
  return { ok: true, cents };
}
