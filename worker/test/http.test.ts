import { describe, expect, it } from 'vitest';
import {
  codePointLength, errorResponse, formResult, formString, jsonResponse, methodNotAllowed, phpTrim, readForm
} from '../src/http';

describe('responses', () => {
  it('jsonResponse', async () => {
    const res = jsonResponse({ a: 1 });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    expect(await res.json()).toEqual({ a: 1 });
  });
  it('errorResponse', async () => {
    const res = errorResponse(503, 'x', 'y');
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'x', message: 'y' });
  });
  it('formResult success', async () => {
    const res = formResult('/accounts/?account=created');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, error: null, redirect: '/accounts/?account=created' });
  });
  it('formResult error', async () => {
    const res = formResult('/transfer/?error=invalidamount', 'invalidamount');
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ success: false, error: 'invalidamount' });
  });
  it('methodNotAllowed', async () => {
    const res = methodNotAllowed('POST', 'm');
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('POST');
    expect(await res.json()).toMatchObject({ error: 'invalidrequest' });
  });
});

describe('phpTrim', () => {
  it('strips PHP default characters', () => {
    expect(phpTrim('  a b \t\n')).toBe('a b');
    expect(phpTrim('\0\x0Ba\x0B')).toBe('a');
    expect(phpTrim('')).toBe('');
  });
  it('keeps NBSP', () => {
    expect(phpTrim(' a ')).toBe(' a ');
  });
});

it('codePointLength', () => {
  expect(codePointLength('abc')).toBe(3);
  expect(codePointLength('💰💰')).toBe(2);
  expect(codePointLength('é')).toBe(1);
});

describe('forms', () => {
  it('readForm parses FormData and rejects non-forms', async () => {
    const fd = new FormData();
    fd.set('a', '1');
    const form = await readForm(new Request('http://x', { method: 'POST', body: fd }));
    expect(form?.get('a')).toBe('1');
    const bad = await readForm(
      new Request('http://x', { method: 'POST', body: 'not a form', headers: { 'Content-Type': 'application/json' } })
    );
    expect(bad).toBeNull();
  });
  it('formString', () => {
    const fd = new FormData();
    fd.set('s', 'v');
    fd.set('f', new File(['x'], 'x.txt'));
    expect(formString(fd, 'missing')).toBeNull();
    expect(formString(fd, 's')).toBe('v');
    expect(formString(fd, 'f')).toBeNull();
  });
});
