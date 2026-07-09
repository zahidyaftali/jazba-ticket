import express, { Router, type Request, type Response, type NextFunction } from 'express';
import Stripe from 'stripe';
import { sql, ensureSchema, newId } from './db';
import {
  signToken,
  hashPassword,
  verifyPassword,
  optionalAuth,
  requireAuth,
  requireAdmin,
  requireRole,
  isSelfOrAdmin,
  ADMIN_BOOTSTRAP_EMAIL,
  type AuthedRequest,
} from './auth';

// ---------------------------------------------------------------
// Row → API shape mappers (frontend keeps its camelCase contracts)
// ---------------------------------------------------------------

function mapUser(row: any) {
  return {
    uid: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    profileImage: row.profile_image,
    city: row.city,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

function mapOrganizer(row: any) {
  return { id: row.id, userId: row.user_id, companyName: row.company_name, email: row.email, phone: row.phone, ...(row.data || {}) };
}

function mapArtist(row: any) {
  return { id: row.id, userId: row.user_id, stageName: row.stage_name, ...(row.data || {}) };
}

function mapEvent(row: any) {
  return { ...(row.data || {}), id: row.id, status: row.status };
}

function mapBooking(row: any) {
  return {
    ...(row.data || {}),
    id: row.id,
    bookingNumber: row.booking_number,
    eventId: row.event_id,
    userId: row.user_id,
    ticketType: row.ticket_type,
    quantity: Number(row.quantity),
    amount: Number(row.amount),
    paymentStatus: row.payment_status,
    bookingStatus: row.booking_status,
    qrCode: row.qr_code,
    eventTitle: row.event_title,
    eventImage: row.event_image,
    eventDate: row.event_date,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

function mapTicket(row: any) {
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    bookingId: row.booking_id,
    userId: row.user_id,
    eventId: row.event_id,
    qrCode: row.qr_code,
    status: row.status,
  };
}

function mapPayment(row: any) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    userId: row.user_id,
    amount: Number(row.amount),
    currency: row.currency,
    provider: row.provider,
    transactionId: row.transaction_id,
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

function mapNotification(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    read: row.read,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

// Wraps async handlers so rejections hit the error middleware.
const h = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthedRequest, res).catch(next);

const api = Router();

// ---------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------

api.post('/auth/signup', h(async (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (!email || !password) { res.status(400).json({ error: 'Email and password are required' }); return; }
  if (String(password).length < 6) { res.status(400).json({ error: 'Password must be at least 6 characters' }); return; }
  const s = sql();
  const normEmail = String(email).trim().toLowerCase();
  const existing = await s`SELECT id FROM users WHERE email = ${normEmail}`;
  if (existing.length > 0) { res.status(409).json({ error: 'An account with this email already exists' }); return; }
  const id = newId();
  const role = normEmail === ADMIN_BOOTSTRAP_EMAIL ? 'admin' : 'user';
  const displayName = name || normEmail.split('@')[0];
  const rows = await s`
    INSERT INTO users (id, email, password_hash, name, phone, role)
    VALUES (${id}, ${normEmail}, ${hashPassword(String(password))}, ${displayName}, ${phone || ''}, ${role})
    RETURNING *`;
  const user = mapUser(rows[0]);
  res.json({ token: signToken({ uid: user.uid, email: user.email, role: user.role }), user });
}));

api.post('/auth/login', h(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) { res.status(400).json({ error: 'Email and password are required' }); return; }
  const s = sql();
  const rows = await s`SELECT * FROM users WHERE email = ${String(email).trim().toLowerCase()}`;
  if (rows.length === 0 || !verifyPassword(String(password), rows[0].password_hash)) {
    res.status(401).json({ error: 'Incorrect email or password' });
    return;
  }
  if (rows[0].status === 'suspended') { res.status(403).json({ error: 'This account has been suspended' }); return; }
  const user = mapUser(rows[0]);
  res.json({ token: signToken({ uid: user.uid, email: user.email, role: user.role }), user });
}));

api.get('/auth/me', requireAuth, h(async (req, res) => {
  const s = sql();
  const rows = await s`SELECT * FROM users WHERE id = ${req.user!.uid}`;
  if (rows.length === 0) { res.status(404).json({ error: 'Account not found' }); return; }
  res.json({ user: mapUser(rows[0]) });
}));

// Find-or-create a user from a verified social profile and issue a session.
// Matching by email deliberately links a social login to an existing
// email/password account — both Google and Facebook verify email ownership.
async function loginWithOAuthProfile(
  res: Response,
  profile: { email: string; name: string; picture?: string; provider: 'google' | 'facebook'; providerId: string },
) {
  const s = sql();
  const normEmail = profile.email.trim().toLowerCase();
  let rows = await s`SELECT * FROM users WHERE email = ${normEmail}`;
  if (rows.length === 0) {
    const role = normEmail === ADMIN_BOOTSTRAP_EMAIL ? 'admin' : 'user';
    rows = await s`
      INSERT INTO users (id, email, password_hash, name, role, profile_image, provider, provider_id)
      VALUES (${newId()}, ${normEmail}, ${null}, ${profile.name || normEmail.split('@')[0]}, ${role}, ${profile.picture || ''}, ${profile.provider}, ${profile.providerId})
      RETURNING *`;
  }
  if (rows[0].status === 'suspended') {
    res.status(403).json({ error: 'This account has been suspended' });
    return;
  }
  const user = mapUser(rows[0]);
  res.json({ token: signToken({ uid: user.uid, email: user.email, role: user.role }), user });
}

api.post('/auth/google', h(async (req, res) => {
  const { accessToken } = req.body || {};
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) { res.status(501).json({ error: 'Google sign-in is not configured yet.' }); return; }
  if (!accessToken) { res.status(400).json({ error: 'accessToken is required' }); return; }

  // 1. Confirm the token was issued to OUR Google OAuth client.
  const infoRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
  const info: any = await infoRes.json();
  if (!infoRes.ok || info.aud !== clientId) {
    res.status(401).json({ error: 'Google sign-in could not be verified.' });
    return;
  }

  // 2. Fetch the verified profile.
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const p: any = await profileRes.json();
  if (!profileRes.ok || !p.email) {
    res.status(401).json({ error: 'Could not read your Google profile.' });
    return;
  }
  await loginWithOAuthProfile(res, { email: p.email, name: p.name || '', picture: p.picture, provider: 'google', providerId: p.sub || '' });
}));

api.post('/auth/facebook', h(async (req, res) => {
  const { accessToken } = req.body || {};
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) { res.status(501).json({ error: 'Facebook sign-in is not configured yet.' }); return; }
  if (!accessToken) { res.status(400).json({ error: 'accessToken is required' }); return; }

  // 1. Confirm the token is valid and was issued for OUR Facebook app.
  const debugRes = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`,
  );
  const debug: any = await debugRes.json();
  if (!debugRes.ok || !debug.data?.is_valid || String(debug.data.app_id) !== String(appId)) {
    res.status(401).json({ error: 'Facebook sign-in could not be verified.' });
    return;
  }

  // 2. Fetch the profile. Facebook only shares email if the account has one
  //    and the user granted it.
  const profileRes = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email,picture.width(256)&access_token=${encodeURIComponent(accessToken)}`,
  );
  const p: any = await profileRes.json();
  if (!profileRes.ok || !p.id) {
    res.status(401).json({ error: 'Could not read your Facebook profile.' });
    return;
  }
  if (!p.email) {
    res.status(400).json({ error: 'Your Facebook account did not share an email address. Please sign up with email and password instead.' });
    return;
  }
  await loginWithOAuthProfile(res, {
    email: p.email,
    name: p.name || '',
    picture: p.picture?.data?.url,
    provider: 'facebook',
    providerId: p.id,
  });
}));

api.post('/auth/reset-request', h(async (req, res) => {
  const { email } = req.body || {};
  if (!email) { res.status(400).json({ error: 'Email is required' }); return; }
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    res.status(501).json({ error: 'Password reset email is not configured yet. Please contact support@jazbaentertainment.net.' });
    return;
  }
  const s = sql();
  const rows = await s`SELECT id, email FROM users WHERE email = ${String(email).trim().toLowerCase()}`;
  // Always answer 200 so the endpoint can't be used to probe for accounts.
  if (rows.length > 0) {
    const token = newId() + newId().replace(/-/g, '');
    await s`INSERT INTO password_resets (token, user_id, expires_at) VALUES (${token}, ${rows[0].id}, now() + interval '1 hour')`;
    const appUrl = process.env.APP_URL || 'https://jazba-ticket.vercel.app';
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: process.env.RESET_EMAIL_FROM || 'Jazbatickets <onboarding@resend.dev>',
        to: rows[0].email,
        subject: 'Reset your Jazbatickets password',
        html: `<p>We received a request to reset your password.</p><p><a href="${appUrl}/login?resetToken=${token}">Click here to choose a new password</a>. This link expires in 1 hour.</p><p>If you didn't ask for this, you can ignore this email.</p>`,
      }),
    });
  }
  res.json({ ok: true });
}));

api.post('/auth/reset-confirm', h(async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password || String(password).length < 6) {
    res.status(400).json({ error: 'A valid token and a password of at least 6 characters are required' });
    return;
  }
  const s = sql();
  const rows = await s`SELECT user_id FROM password_resets WHERE token = ${String(token)} AND expires_at > now()`;
  if (rows.length === 0) { res.status(400).json({ error: 'This reset link is invalid or has expired' }); return; }
  await s`UPDATE users SET password_hash = ${hashPassword(String(password))} WHERE id = ${rows[0].user_id}`;
  await s`DELETE FROM password_resets WHERE token = ${String(token)}`;
  res.json({ ok: true });
}));

// ---------------------------------------------------------------
// USERS
// ---------------------------------------------------------------

api.get('/users', requireAdmin, h(async (_req, res) => {
  const rows = await sql()`SELECT * FROM users ORDER BY created_at DESC`;
  res.json({ users: rows.map(mapUser) });
}));

api.get('/users/:uid', requireAuth, h(async (req, res) => {
  if (!isSelfOrAdmin(req, req.params.uid)) { res.status(403).json({ error: 'Not allowed' }); return; }
  const rows = await sql()`SELECT * FROM users WHERE id = ${req.params.uid}`;
  if (rows.length === 0) { res.status(404).json({ error: 'User not found' }); return; }
  res.json({ user: mapUser(rows[0]) });
}));

api.put('/users/:uid', requireAuth, h(async (req, res) => {
  if (!isSelfOrAdmin(req, req.params.uid)) { res.status(403).json({ error: 'Not allowed' }); return; }
  const { name, phone, city, profileImage } = req.body || {};
  const s = sql();
  const rows = await s`
    UPDATE users SET
      name = COALESCE(${name ?? null}, name),
      phone = COALESCE(${phone ?? null}, phone),
      city = COALESCE(${city ?? null}, city),
      profile_image = COALESCE(${profileImage ?? null}, profile_image)
    WHERE id = ${req.params.uid}
    RETURNING *`;
  if (rows.length === 0) { res.status(404).json({ error: 'User not found' }); return; }
  res.json({ user: mapUser(rows[0]) });
}));

api.patch('/users/:uid/role-status', requireAdmin, h(async (req, res) => {
  const { role, status } = req.body || {};
  const rows = await sql()`
    UPDATE users SET
      role = COALESCE(${role ?? null}, role),
      status = COALESCE(${status ?? null}, status)
    WHERE id = ${req.params.uid}
    RETURNING *`;
  if (rows.length === 0) { res.status(404).json({ error: 'User not found' }); return; }
  res.json({ user: mapUser(rows[0]) });
}));

api.delete('/users/:uid', requireAdmin, h(async (req, res) => {
  await sql()`DELETE FROM users WHERE id = ${req.params.uid}`;
  res.json({ ok: true });
}));

// ---------------------------------------------------------------
// ORGANIZERS
// ---------------------------------------------------------------

api.get('/organizers', requireAdmin, h(async (_req, res) => {
  const rows = await sql()`SELECT * FROM organizers ORDER BY company_name`;
  res.json({ organizers: rows.map(mapOrganizer) });
}));

api.get('/organizers/by-user/:userId', requireAuth, h(async (req, res) => {
  if (!isSelfOrAdmin(req, req.params.userId)) { res.status(403).json({ error: 'Not allowed' }); return; }
  const rows = await sql()`SELECT * FROM organizers WHERE user_id = ${req.params.userId}`;
  res.json({ organizer: rows.length > 0 ? mapOrganizer(rows[0]) : null });
}));

api.post('/organizers', requireAuth, h(async (req, res) => {
  const { userId, companyName, email, phone, ...data } = req.body || {};
  const targetUser = req.user!.role === 'admin' && userId ? userId : req.user!.uid;
  const id = newId();
  const rows = await sql()`
    INSERT INTO organizers (id, user_id, company_name, email, phone, data)
    VALUES (${id}, ${targetUser}, ${companyName || ''}, ${email || ''}, ${phone || ''}, ${JSON.stringify(data)}::jsonb)
    RETURNING *`;
  res.json({ organizer: mapOrganizer(rows[0]) });
}));

api.patch('/organizers/:id', requireAuth, h(async (req, res) => {
  const s = sql();
  const existing = await s`SELECT * FROM organizers WHERE id = ${req.params.id}`;
  if (existing.length === 0) { res.status(404).json({ error: 'Organizer not found' }); return; }
  if (!isSelfOrAdmin(req, existing[0].user_id)) { res.status(403).json({ error: 'Not allowed' }); return; }
  const { companyName, email, phone, userId: _ignore, id: _ignore2, ...data } = req.body || {};
  const mergedData = { ...(existing[0].data || {}), ...data };
  const rows = await s`
    UPDATE organizers SET
      company_name = COALESCE(${companyName ?? null}, company_name),
      email = COALESCE(${email ?? null}, email),
      phone = COALESCE(${phone ?? null}, phone),
      data = ${JSON.stringify(mergedData)}::jsonb
    WHERE id = ${req.params.id}
    RETURNING *`;
  res.json({ organizer: mapOrganizer(rows[0]) });
}));

// ---------------------------------------------------------------
// ARTISTS
// ---------------------------------------------------------------

api.get('/artists', h(async (_req, res) => {
  const rows = await sql()`SELECT * FROM artists ORDER BY stage_name`;
  res.json({ artists: rows.map(mapArtist) });
}));

api.get('/artists/by-user/:userId', h(async (req, res) => {
  const rows = await sql()`SELECT * FROM artists WHERE user_id = ${req.params.userId}`;
  res.json({ artist: rows.length > 0 ? mapArtist(rows[0]) : null });
}));

api.post('/artists', requireAuth, h(async (req, res) => {
  const { userId, stageName, id: _ignore, ...data } = req.body || {};
  const targetUser = req.user!.role === 'admin' ? (userId || '') : req.user!.uid;
  const id = newId();
  const rows = await sql()`
    INSERT INTO artists (id, user_id, stage_name, data)
    VALUES (${id}, ${targetUser}, ${stageName || ''}, ${JSON.stringify(data)}::jsonb)
    RETURNING *`;
  res.json({ artist: mapArtist(rows[0]) });
}));

api.patch('/artists/:id', requireAuth, h(async (req, res) => {
  const s = sql();
  const existing = await s`SELECT * FROM artists WHERE id = ${req.params.id}`;
  if (existing.length === 0) { res.status(404).json({ error: 'Artist not found' }); return; }
  if (!isSelfOrAdmin(req, existing[0].user_id)) { res.status(403).json({ error: 'Not allowed' }); return; }
  const { stageName, userId: _ignore, id: _ignore2, ...data } = req.body || {};
  const mergedData = { ...(existing[0].data || {}), ...data };
  const rows = await s`
    UPDATE artists SET
      stage_name = COALESCE(${stageName ?? null}, stage_name),
      data = ${JSON.stringify(mergedData)}::jsonb
    WHERE id = ${req.params.id}
    RETURNING *`;
  res.json({ artist: mapArtist(rows[0]) });
}));

api.delete('/artists/:id', requireAdmin, h(async (req, res) => {
  await sql()`DELETE FROM artists WHERE id = ${req.params.id}`;
  res.json({ ok: true });
}));

// ---------------------------------------------------------------
// EVENTS
// ---------------------------------------------------------------

api.get('/events', optionalAuth, h(async (req, res) => {
  const canSeeDrafts = req.user && (req.user.role === 'admin' || req.user.role === 'organizer');
  const rows = canSeeDrafts
    ? await sql()`SELECT * FROM events ORDER BY created_at DESC`
    : await sql()`SELECT * FROM events WHERE status = 'published' ORDER BY created_at DESC`;
  res.json({ events: rows.map(mapEvent) });
}));

api.post('/events', requireRole('admin', 'organizer'), h(async (req, res) => {
  const { id: _ignore, status, ...data } = req.body || {};
  const id = newId();
  const rows = await sql()`
    INSERT INTO events (id, status, data)
    VALUES (${id}, ${status || 'draft'}, ${JSON.stringify(data)}::jsonb)
    RETURNING *`;
  res.json({ event: mapEvent(rows[0]) });
}));

api.patch('/events/:id', requireRole('admin', 'organizer'), h(async (req, res) => {
  const s = sql();
  const existing = await s`SELECT * FROM events WHERE id = ${req.params.id}`;
  if (existing.length === 0) { res.status(404).json({ error: 'Event not found' }); return; }
  const { id: _ignore, status, ...data } = req.body || {};
  const mergedData = { ...(existing[0].data || {}), ...data };
  const rows = await s`
    UPDATE events SET
      status = COALESCE(${status ?? null}, status),
      data = ${JSON.stringify(mergedData)}::jsonb
    WHERE id = ${req.params.id}
    RETURNING *`;
  res.json({ event: mapEvent(rows[0]) });
}));

api.delete('/events/:id', requireRole('admin', 'organizer'), h(async (req, res) => {
  await sql()`DELETE FROM events WHERE id = ${req.params.id}`;
  res.json({ ok: true });
}));

// ---------------------------------------------------------------
// BOOKINGS
// ---------------------------------------------------------------

api.get('/bookings', requireAuth, h(async (req, res) => {
  const rows = req.user!.role === 'admin'
    ? await sql()`SELECT * FROM bookings ORDER BY created_at DESC`
    : await sql()`SELECT * FROM bookings WHERE user_id = ${req.user!.uid} ORDER BY created_at DESC`;
  res.json({ bookings: rows.map(mapBooking) });
}));

api.post('/bookings', requireAuth, h(async (req, res) => {
  const {
    id: clientId, bookingNumber, eventId, userId: bodyUserId, ticketType, quantity, amount,
    paymentStatus, bookingStatus, qrCode, eventTitle, eventImage, eventDate, createdAt: _ignore,
    ...extras
  } = req.body || {};
  const userId = req.user!.role === 'admin' && bodyUserId ? bodyUserId : req.user!.uid;
  const id = clientId || newId();
  const rows = await sql()`
    INSERT INTO bookings (id, booking_number, event_id, user_id, ticket_type, quantity, amount, payment_status, booking_status, qr_code, event_title, event_image, event_date, data)
    VALUES (${id}, ${bookingNumber || `JZB-${Date.now()}`}, ${eventId || ''}, ${userId}, ${ticketType || ''}, ${Number(quantity) || 1}, ${Number(amount) || 0}, ${paymentStatus || 'pending'}, ${bookingStatus || 'active'}, ${qrCode || ''}, ${eventTitle || ''}, ${eventImage || ''}, ${eventDate || ''}, ${JSON.stringify(extras)}::jsonb)
    RETURNING *`;
  res.json({ booking: mapBooking(rows[0]) });
}));

api.patch('/bookings/:id', requireAuth, h(async (req, res) => {
  const s = sql();
  const existing = await s`SELECT * FROM bookings WHERE id = ${req.params.id}`;
  if (existing.length === 0) { res.status(404).json({ error: 'Booking not found' }); return; }
  if (!isSelfOrAdmin(req, existing[0].user_id)) { res.status(403).json({ error: 'Not allowed' }); return; }
  const { paymentStatus, bookingStatus } = req.body || {};
  const rows = await s`
    UPDATE bookings SET
      payment_status = COALESCE(${paymentStatus ?? null}, payment_status),
      booking_status = COALESCE(${bookingStatus ?? null}, booking_status)
    WHERE id = ${req.params.id}
    RETURNING *`;
  res.json({ booking: mapBooking(rows[0]) });
}));

// ---------------------------------------------------------------
// TICKETS
// ---------------------------------------------------------------

api.get('/tickets', requireAuth, h(async (req, res) => {
  const rows = req.user!.role === 'admin'
    ? await sql()`SELECT * FROM tickets ORDER BY ticket_number DESC`
    : await sql()`SELECT * FROM tickets WHERE user_id = ${req.user!.uid} ORDER BY ticket_number DESC`;
  res.json({ tickets: rows.map(mapTicket) });
}));

api.post('/tickets', requireAuth, h(async (req, res) => {
  const t = req.body || {};
  const userId = req.user!.role === 'admin' && t.userId ? t.userId : req.user!.uid;
  const id = newId();
  const rows = await sql()`
    INSERT INTO tickets (id, ticket_number, booking_id, user_id, event_id, qr_code, status)
    VALUES (${id}, ${t.ticketNumber || `TKT-${Date.now()}`}, ${t.bookingId || ''}, ${userId}, ${t.eventId || ''}, ${t.qrCode || ''}, ${t.status || 'active'})
    RETURNING *`;
  res.json({ ticket: mapTicket(rows[0]) });
}));

api.patch('/tickets/:id/status', requireAdmin, h(async (req, res) => {
  const { status } = req.body || {};
  if (!['active', 'cancelled', 'scanned'].includes(status)) { res.status(400).json({ error: 'Invalid status' }); return; }
  const rows = await sql()`UPDATE tickets SET status = ${status} WHERE id = ${req.params.id} RETURNING *`;
  if (rows.length === 0) { res.status(404).json({ error: 'Ticket not found' }); return; }
  res.json({ ticket: mapTicket(rows[0]) });
}));

// ---------------------------------------------------------------
// PAYMENTS
// ---------------------------------------------------------------

let _stripe: Stripe | null = null;
function stripeClient(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(key);
  }
  return _stripe;
}

api.post('/payments/create-intent', requireAuth, h(async (req, res) => {
  const { amount, currency } = req.body || {};
  const value = Number(amount);
  if (!value || value <= 0) { res.status(400).json({ error: 'A positive amount is required' }); return; }
  const intent = await stripeClient().paymentIntents.create({
    amount: Math.round(value * 100),
    currency: String(currency || 'gbp').toLowerCase(),
    metadata: { userId: req.user!.uid },
  });
  res.json({ clientSecret: intent.client_secret });
}));

api.get('/payments', requireAdmin, h(async (_req, res) => {
  const rows = await sql()`SELECT * FROM payments ORDER BY created_at DESC`;
  res.json({ payments: rows.map(mapPayment) });
}));

api.post('/payments', requireAuth, h(async (req, res) => {
  const p = req.body || {};
  const userId = req.user!.role === 'admin' && p.userId ? p.userId : req.user!.uid;
  const id = newId();
  const rows = await sql()`
    INSERT INTO payments (id, booking_id, user_id, amount, currency, provider, transaction_id, status)
    VALUES (${id}, ${p.bookingId || ''}, ${userId}, ${Number(p.amount) || 0}, ${p.currency || 'GBP'}, ${p.provider || 'stripe'}, ${p.transactionId || ''}, ${p.status || 'pending'})
    RETURNING *`;
  res.json({ payment: mapPayment(rows[0]) });
}));

// ---------------------------------------------------------------
// NOTIFICATIONS
// ---------------------------------------------------------------

api.get('/notifications', requireAuth, h(async (req, res) => {
  const rows = await sql()`SELECT * FROM notifications WHERE user_id = ${req.user!.uid} ORDER BY created_at DESC`;
  res.json({ notifications: rows.map(mapNotification) });
}));

api.post('/notifications', requireAuth, h(async (req, res) => {
  const n = req.body || {};
  const userId = req.user!.role === 'admin' && n.userId ? n.userId : req.user!.uid;
  const id = newId();
  const rows = await sql()`
    INSERT INTO notifications (id, user_id, title, message, read)
    VALUES (${id}, ${userId}, ${n.title || ''}, ${n.message || ''}, ${!!n.read})
    RETURNING *`;
  res.json({ notification: mapNotification(rows[0]) });
}));

api.patch('/notifications/:id/read', requireAuth, h(async (req, res) => {
  const s = sql();
  const existing = await s`SELECT user_id FROM notifications WHERE id = ${req.params.id}`;
  if (existing.length === 0) { res.status(404).json({ error: 'Notification not found' }); return; }
  if (!isSelfOrAdmin(req, existing[0].user_id)) { res.status(403).json({ error: 'Not allowed' }); return; }
  await s`UPDATE notifications SET read = true WHERE id = ${req.params.id}`;
  res.json({ ok: true });
}));

// ---------------------------------------------------------------
// FOLLOWS
// ---------------------------------------------------------------

api.get('/follows/count', h(async (req, res) => {
  const { targetType, targetId } = req.query;
  const rows = await sql()`SELECT count(*)::int AS count FROM follows WHERE target_type = ${String(targetType)} AND target_id = ${String(targetId)}`;
  res.json({ count: rows[0]?.count ?? 0 });
}));

api.get('/follows/status', requireAuth, h(async (req, res) => {
  const { targetType, targetId } = req.query;
  const rows = await sql()`SELECT 1 FROM follows WHERE follower_id = ${req.user!.uid} AND target_type = ${String(targetType)} AND target_id = ${String(targetId)}`;
  res.json({ following: rows.length > 0 });
}));

api.get('/follows/mine', requireAuth, h(async (req, res) => {
  const { targetType } = req.query;
  const rows = await sql()`SELECT target_id FROM follows WHERE follower_id = ${req.user!.uid} AND target_type = ${String(targetType)}`;
  res.json({ ids: rows.map((r: any) => r.target_id) });
}));

api.post('/follows', requireAuth, h(async (req, res) => {
  const { targetType, targetId } = req.body || {};
  if (!targetType || !targetId) { res.status(400).json({ error: 'targetType and targetId are required' }); return; }
  await sql()`
    INSERT INTO follows (follower_id, target_type, target_id)
    VALUES (${req.user!.uid}, ${targetType}, ${targetId})
    ON CONFLICT DO NOTHING`;
  res.json({ ok: true });
}));

api.delete('/follows/:targetType/:targetId', requireAuth, h(async (req, res) => {
  await sql()`DELETE FROM follows WHERE follower_id = ${req.user!.uid} AND target_type = ${req.params.targetType} AND target_id = ${req.params.targetId}`;
  res.json({ ok: true });
}));

// ---------------------------------------------------------------
// ANALYTICS (computed live from the tables — no counters to drift)
// ---------------------------------------------------------------

api.get('/analytics', requireAdmin, h(async (_req, res) => {
  const s = sql();
  const [users, organizers, artists, events, sales] = await Promise.all([
    s`SELECT count(*)::int AS n FROM users`,
    s`SELECT count(*)::int AS n FROM organizers`,
    s`SELECT count(*)::int AS n FROM artists`,
    s`SELECT count(*)::int AS n FROM events`,
    s`SELECT COALESCE(sum(quantity), 0)::int AS tickets, COALESCE(sum(amount), 0)::numeric AS revenue FROM bookings WHERE payment_status = 'paid'`,
  ]);
  res.json({
    analytics: {
      totalUsers: users[0].n,
      totalOrganizers: organizers[0].n,
      totalArtists: artists[0].n,
      totalEvents: events[0].n,
      totalTicketsSold: Number(sales[0].tickets),
      totalRevenue: Number(sales[0].revenue),
    },
  });
}));

api.get('/health', h(async (_req, res) => {
  res.json({ ok: true });
}));

// ---------------------------------------------------------------
// App assembly
// ---------------------------------------------------------------

const app = express();
app.use(express.json({ limit: '2mb' }));

// Make sure tables exist before any route runs (memoized per cold start).
app.use((_req, res, next) => {
  ensureSchema().then(() => next()).catch((err) => {
    console.error('Schema init failed:', err);
    res.status(500).json({ error: 'Database is not reachable. Check DATABASE_URL.' });
  });
});

app.use('/api', api);

app.use((req, res) => {
  res.status(404).json({ error: `No such endpoint: ${req.method} ${req.path}` });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API error:', err);
  res.status(500).json({ error: err?.message || 'Something went wrong' });
});

export default app;
