// POST /api/contact: the Write to Us form on kepta.kitchen (a Cloudflare Pages
// Function). The visitor's browser only ever talks to kepta.kitchen; this
// passes the message to Resend, which delivers it to support@kepta.kitchen with
// Reply-To set to the visitor, so answering is just Reply.
//
// Ported from effortzero.app (effort-zero-studio src/lib/contact.ts): the same
// Origin check, honeypot, fill time, body cap, field limits and Resend call.
//
// Setup (once, by John): a Resend key with Sending access for effortzero.app,
// stored as the Pages SECRET `RESEND_API_KEY` (Cloudflare dashboard > Workers &
// Pages > kepta-site > Settings > Variables and Secrets, Production). Only
// deployments made after the secret is added can read it. Never put the key in
// code. Without it the form answers 503 and the page offers the address instead.
//
// Logs never include the visitor's name, address or message.

const TO = 'support@kepta.kitchen';
const FROM = 'Kepta site <form@effortzero.app>';
const TOPICS = ['A problem in the app', 'Food dates', 'An idea', 'Kepta Plus', 'My account', 'Something else'];
const EMAIL_RE = /^[A-Za-z0-9_%+'-]+(?:\.[A-Za-z0-9_%+'-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
const LIMITS = { name: 100, email: 254, message: 5000, body: 16000 };
// Anything sent sooner than this after the form first opened is a bot: it is
// told "sent" and dropped.
const MIN_FILL_MS = 2500;

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

// One line, no control characters (names and topics go into the subject).
const oneLine = (s) => s.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
// Keep line breaks in the message, drop every other control character.
const multiLine = (s) => s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim();

// The body as text, or null once it passes `max` characters. A declared
// Content-Length over the cap is refused before reading, and the read stops at
// the cap, so an oversized upload never sits in memory.
async function readCapped(request, max) {
  const declared = Number(request.headers.get('content-length') ?? '');
  if (Number.isFinite(declared) && declared > max * 4) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    if (text.length > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
  }
  text += decoder.decode();
  return text.length > max ? null : text;
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
  }
  // Same origin only: the page's own fetch always sends Origin on a POST.
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return json(403, { error: 'origin' });
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) {
    return json(415, { error: 'type' });
  }
  const raw = await readCapped(request, LIMITS.body);
  if (raw === null) return json(413, { error: 'size' });

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return json(400, { error: 'invalid' });
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return json(400, { error: 'invalid' });
  const str = (k) => (typeof data[k] === 'string' ? data[k] : '');

  // Honeypot (a field people never see) and fill time: quietly "succeed".
  if (str('kk_hp') !== '' || typeof data.ms !== 'number' || data.ms < MIN_FILL_MS) {
    return json(200, { ok: true });
  }

  const name = oneLine(str('name'));
  const email = oneLine(str('email'));
  const message = multiLine(str('message'));
  const topic = TOPICS.includes(str('topic')) ? str('topic') : '';

  const fields = [];
  if (!name || name.length > LIMITS.name) fields.push('name');
  if (!EMAIL_RE.test(email) || email.length > LIMITS.email) fields.push('email');
  if (!message || message.length > LIMITS.message) fields.push('message');
  if (fields.length) return json(422, { error: 'fields', fields });

  const key = env && env.RESEND_API_KEY;
  if (!key) {
    console.error('contact: RESEND_API_KEY is not set');
    return json(503, { error: 'unavailable' });
  }

  const subject = `${topic || 'Message'} from ${name} (kepta.kitchen)`;
  const text = [
    topic ? `About: ${topic}` : null,
    `From: ${name} <${email}>`,
    '',
    message,
    '',
    '--',
    `Sent with the Write to Us form on kepta.kitchen. Reply to this email to answer ${name}.`,
  ]
    .filter((l) => l !== null)
    .join('\n');

  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [TO], reply_to: email, subject, text }),
    });
  } catch (error) {
    console.error('contact: Resend unreachable', String(error && error.message ? error.message : error));
    return json(502, { error: 'send' });
  }
  if (!res.ok) {
    // Status and Resend's error name only; never the visitor's message.
    const detail = await res.text().catch(() => '');
    console.error(`contact: Resend answered ${res.status}`, detail.replace(/[^\s"'<>@]+@[^\s"'<>]+/g, '[address]').slice(0, 300));
    // An address our check let through but Resend refuses: ask for another.
    if (res.status === 422 && /reply_to|reply-to/i.test(detail)) {
      return json(422, { error: 'fields', fields: ['email'] });
    }
    return json(502, { error: 'send' });
  }
  return json(200, { ok: true });
}
