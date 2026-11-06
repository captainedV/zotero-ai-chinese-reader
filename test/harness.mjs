import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');

/** Load plugin scripts into the Node global so `globalThis.Moonlit` is shared. */
/**
 * Minimal XMLHttpRequest shim over node:http(s) for the Node-side tests.
 *
 * The plugin talks to providers through XMLHttpRequest (the sandbox API Zotero
 * actually exposes), so the Node tests need the same surface. Only the parts the
 * client uses are implemented: open/setRequestHeader/send/abort, status,
 * responseText, readyState, onprogress/onload/onerror/onabort/ontimeout.
 */
function installXhrShim() {
  if (globalThis.XMLHttpRequest) {
    return;
  }
  const http = require('node:http');
  const https = require('node:https');

  class FakeXHR {
    constructor() {
      this.readyState = 0;
      this.status = 0;
      this.responseText = '';
      this.timeout = 0;
      this._headers = {};
      this._aborted = false;
    }

    open(method, url) {
      this._method = method;
      this._url = url;
      this.readyState = 1;
    }

    setRequestHeader(name, value) {
      this._headers[name] = value;
    }

    abort() {
      this._aborted = true;
      this._req?.destroy();
      this.onabort?.();
    }

    send(body) {
      const target = new URL(this._url);
      const client = target.protocol === 'https:' ? https : http;
      const options = {
        method: this._method,
        headers: { ...this._headers, 'Content-Length': Buffer.byteLength(body || '') }
      };
      this._req = client.request(target, options, (response) => {
        this.status = response.statusCode;
        this.readyState = 3;
        this.onreadystatechange?.();
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          this.responseText += chunk;
          this.onprogress?.();
        });
        response.on('end', () => {
          this.readyState = 4;
          if (this._aborted) {
            return;
          }
          this.onload?.();
        });
      });
      this._req.on('error', (error) => {
        if (this._aborted) {
          return;
        }
        this.onerror?.(error);
      });
      if (this.timeout) {
        this._req.setTimeout(this.timeout, () => {
          this._req.destroy();
          this.ontimeout?.();
        });
      }
      this._req.write(body || '');
      this._req.end();
    }
  }

  globalThis.XMLHttpRequest = FakeXHR;
}

installXhrShim();

export function loadPlugin(...files) {
  globalThis.Zotero = globalThis.Zotero || {
    debug: () => {},
    logError: (e) => { throw e; },
    Prefs: {
      _store: new Map(),
      get(key) { return this._store.get(key); },
      set(key, value) { this._store.set(key, value); },
      clear(key) { this._store.delete(key); },
      registerObserver() { return Symbol('observer'); },
      unregisterObserver() {}
    },
    DataDirectory: { dir: '/tmp' }
  };
  for (const file of files) {
    const code = fs.readFileSync(path.join(ROOT, 'content/scripts', file), 'utf8');
    // eslint-disable-next-line no-new-func
    new Function(code)();
  }
  return globalThis.Moonlit;
}

export const results = { pass: 0, fail: 0, failures: [] };

export function test(name, fn) {
  try {
    const value = fn();
    if (value && typeof value.then === 'function') {
      throw new Error('use testAsync for async tests');
    }
    results.pass++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (e) {
    results.fail++;
    results.failures.push({ name, error: e });
    console.log(`  \x1b[31m✗\x1b[0m ${name}\n      ${e.message}`);
  }
}

export async function testAsync(name, fn) {
  try {
    await fn();
    results.pass++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (e) {
    results.fail++;
    results.failures.push({ name, error: e });
    console.log(`  \x1b[31m✗\x1b[0m ${name}\n      ${e.message}`);
  }
}

export function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion failed');
}

export function assertEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message || 'not equal'}: ${a} !== ${e}`);
}

export function assertClose(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message || 'not close'}: ${actual} vs ${expected} (tol ${tolerance})`);
  }
}

export function summary() {
  console.log(`\n${results.pass} passed, ${results.fail} failed`);
  if (results.fail) process.exitCode = 1;
}
