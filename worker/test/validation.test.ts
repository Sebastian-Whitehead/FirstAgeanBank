import { describe, expect, it } from 'vitest';
import { parseAccountName, parseAccountNumber } from '../src/validation';

describe('parseAccountName', () => {
  it.each([
    [null, null],
    ['   ', null],
    [' Savings ', 'Savings'],
    ['x'.repeat(40), 'x'.repeat(40)],
    ['x'.repeat(41), null],
    ['😀'.repeat(40), '😀'.repeat(40)],
    ['😀'.repeat(41), null],
    ['\u00a0x', '\u00a0x'] // NBSP is not trimmed (phpTrim parity)
  ])('%j -> %j', (input, expected) => {
    expect(parseAccountName(input)).toBe(expected);
  });
});

describe('parseAccountNumber', () => {
  it.each([
    ['', null],
    [null, null],
    ['a'.repeat(128), 'a'.repeat(128)],
    ['a'.repeat(129), null],
    ['é'.repeat(64), 'é'.repeat(64)],
    ['é'.repeat(65), null]
  ])('%j -> %j', (input, expected) => {
    expect(parseAccountNumber(input)).toBe(expected);
  });
});
