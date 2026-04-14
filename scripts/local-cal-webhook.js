const http = require('http');
const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

function loadRootEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadRootEnv();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in root .env.local');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

async function resolveValidUserId(candidateUserId) {
  const candidate = typeof candidateUserId === 'string' ? candidateUserId.trim() : '';
  if (!candidate) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', candidate)
    .maybeSingle();

  if (error) {
    console.error('Error validating profile user id:', error);
    return null;
  }

  return data?.id || null;
}

function normalizeEmail(candidate) {
  return typeof candidate === 'string' ? candidate.trim().toLowerCase() : '';
}

function extractRoomIdFromPayload(payload, metadata) {
  const directRoomId =
    typeof metadata?.roomId === 'string'
      ? metadata.roomId.trim()
      : typeof metadata?.room_id === 'string'
      ? metadata.room_id.trim()
      : '';

  if (directRoomId) {
    return directRoomId;
  }

  const notesCandidates = [
    payload?.additionalNotes,
    payload?.responses?.notes?.value,
    payload?.notes,
  ];

  for (const notes of notesCandidates) {
    if (typeof notes !== 'string') {
      continue;
    }

    const match = notes.match(/room(?:\s+reference|\s+id)?\s*[:#-]\s*([a-z0-9-]+)/i);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function extractClientBookingRef(metadata, payload) {
  const candidates = [
    metadata?.clientBookingRef,
    metadata?.client_booking_ref,
    payload?.metadata?.clientBookingRef,
    payload?.metadata?.client_booking_ref,
  ];

  const value = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim());
  return typeof value === 'string' ? value.trim() : null;
}

async function storeCalWebhook(body) {
  const { triggerEvent, payload } = body || {};

  if (!triggerEvent || !payload) {
    return { status: 400, body: { error: 'Invalid webhook payload' } };
  }

  const normalizedEvent = String(triggerEvent).toUpperCase();

  // Cal sends a PING event when testing the webhook connection — return 200 immediately
  if (normalizedEvent === 'PING') {
    return { status: 200, body: { success: true, message: 'Ping received' } };
  }

  const attendee = payload?.attendees?.[0] || null;
  const metadata = payload?.metadata || {};
  const bookingId = String(payload?.uid || payload?.bookingUid || payload?.id || '');

  if (!bookingId) {
    return { status: 400, body: { error: 'Missing booking id in payload' } };
  }

  const validUserId = await resolveValidUserId(metadata?.clerkUserId || metadata?.clerk_user_id);
  const normalizedEmail =
    normalizeEmail(attendee?.email) || normalizeEmail(payload?.email) || 'unknown@unknown.local';
  const resolvedRoomId = extractRoomIdFromPayload(payload, metadata);
  const clientBookingRef = extractClientBookingRef(metadata, payload);

  const baseRecord = {
    booking_id: bookingId,
    user_id: validUserId,
    user_email: normalizedEmail,
    user_name: attendee?.name || payload?.name || null,
    room_id: resolvedRoomId,
    booking_date: payload?.startTime || payload?.start || null,
    event_id: payload?.eventTypeId ? String(payload.eventTypeId) : null,
    metadata: {
      ...metadata,
      ...(clientBookingRef ? { clientBookingRef } : {}),
      calTriggerEvent: normalizedEvent,
      rawPayload: payload,
    },
    updated_at: new Date().toISOString(),
  };

  if (
    normalizedEvent === 'BOOKING_CREATED' ||
    normalizedEvent === 'BOOKING_CONFIRMED' ||
    normalizedEvent === 'BOOKING_REQUESTED'
  ) {
    const { error } = await supabase
      .from('booking_metadata')
      .upsert(baseRecord, { onConflict: 'booking_id' });

    if (error) {
      console.error('Error storing booking metadata:', error);
      return { status: 500, body: { error: 'Failed to store booking metadata' } };
    }

    return { status: 200, body: { success: true, message: 'Booking metadata stored' } };
  }

  if (normalizedEvent === 'BOOKING_CANCELLED') {
    const { error } = await supabase
      .from('booking_metadata')
      .upsert(
        {
          ...baseRecord,
          metadata: {
            ...baseRecord.metadata,
            bookingStatus: 'cancelled',
            cancelledAt: new Date().toISOString(),
          },
        },
        { onConflict: 'booking_id' }
      );

    if (error) {
      console.error('Error storing cancellation metadata:', error);
      return { status: 500, body: { error: 'Failed to store cancellation metadata' } };
    }

    return { status: 200, body: { success: true, message: 'Booking cancellation stored' } };
  }

  if (normalizedEvent === 'BOOKING_RESCHEDULED') {
    const { error } = await supabase
      .from('booking_metadata')
      .upsert(
        {
          ...baseRecord,
          metadata: {
            ...baseRecord.metadata,
            bookingStatus: 'rescheduled',
            rescheduledAt: new Date().toISOString(),
            previousStartTime: payload?.prevStartTime || null,
          },
        },
        { onConflict: 'booking_id' }
      );

    if (error) {
      console.error('Error storing reschedule metadata:', error);
      return { status: 500, body: { error: 'Failed to store reschedule metadata' } };
    }

    return { status: 200, body: { success: true, message: 'Booking reschedule stored' } };
  }

  return { status: 200, body: { success: true, message: 'Event ignored' } };
}

function resolveStripeBookingIdDirect(event) {
  const objectData = event?.data?.object || {};

  return (
    objectData?.metadata?.bookingId ||
    objectData?.client_reference_id ||
    objectData?.metadata?.booking_id ||
    null
  );
}

async function resolveStripeBookingIdFromPaymentIntent(paymentIntentId) {
  if (!stripe || !paymentIntentId) {
    return null;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const metadata = paymentIntent?.metadata || {};

    return metadata.bookingId || metadata.booking_id || null;
  } catch (error) {
    console.warn(
      `Unable to resolve bookingId from payment_intent=${paymentIntentId}:`,
      error?.message || error
    );
    return null;
  }
}

async function resolveStripeBookingIdFromCharge(chargeId) {
  if (!stripe || !chargeId) {
    return null;
  }

  try {
    const charge = await stripe.charges.retrieve(chargeId);
    const metadata = charge?.metadata || {};
    const direct = metadata.bookingId || metadata.booking_id || null;
    if (direct) {
      return direct;
    }

    const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
    if (!paymentIntentId) {
      return null;
    }

    const fromPaymentIntent = await resolveStripeBookingIdFromPaymentIntent(paymentIntentId);
    if (fromPaymentIntent) {
      return fromPaymentIntent;
    }

    return await resolveStripeBookingIdFromStoredPaymentIntent(paymentIntentId);
  } catch (error) {
    console.warn(`Unable to resolve bookingId from charge=${chargeId}:`, error?.message || error);
    return null;
  }
}

async function resolveStripeBookingIdFromStoredPaymentIntent(paymentIntentId) {
  if (!paymentIntentId) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('booking_metadata')
      .select('booking_id')
      .contains('metadata', { stripePaymentIntentId: paymentIntentId })
      .maybeSingle();

    if (error) {
      console.warn('Failed to lookup booking by stored payment intent:', error.message);
      return null;
    }

    return data?.booking_id || null;
  } catch (error) {
    console.warn('Unexpected lookup error for stored payment intent:', error?.message || error);
    return null;
  }
}

async function resolveStripeBookingId(event) {
  const directBookingId = resolveStripeBookingIdDirect(event);
  if (directBookingId) {
    return directBookingId;
  }

  const objectData = event?.data?.object || {};
  const paymentIntentId =
    typeof objectData?.payment_intent === 'string'
      ? objectData.payment_intent
      : event?.type?.startsWith('payment_intent.') && typeof objectData?.id === 'string'
        ? objectData.id
        : null;

  const chargeId =
    event?.type === 'charge.refund.updated' && typeof objectData?.charge === 'string'
      ? objectData.charge
      : event?.type?.startsWith('charge.') && typeof objectData?.id === 'string'
        ? objectData.id
        : event?.type?.startsWith('refund.') && typeof objectData?.charge === 'string'
          ? objectData.charge
          : null;

  if (chargeId) {
    const fromCharge = await resolveStripeBookingIdFromCharge(chargeId);
    if (fromCharge) {
      return fromCharge;
    }
  }

  const fromPaymentIntentMetadata = await resolveStripeBookingIdFromPaymentIntent(paymentIntentId);
  if (fromPaymentIntentMetadata) {
    return fromPaymentIntentMetadata;
  }

  return await resolveStripeBookingIdFromStoredPaymentIntent(paymentIntentId);
}

async function createStripeCheckoutSession(body) {
  if (!stripe) {
    return { status: 500, body: { error: 'Missing STRIPE_SECRET_KEY in .env.local' } };
  }

  const {
    bookingId,
    amount,
    currency = 'usd',
    customerEmail,
    roomLabel,
  } = body || {};

  if (!bookingId || !amount || Number(amount) <= 0) {
    return { status: 400, body: { error: 'bookingId and amount are required' } };
  }

  const { data: booking, error: selectError } = await supabase
    .from('booking_metadata')
    .select('booking_id, user_email, metadata')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (selectError) {
    console.error('Error loading booking metadata:', selectError);
    return { status: 500, body: { error: 'Failed to load booking' } };
  }

  if (!booking) {
    return { status: 404, body: { error: 'Booking not found' } };
  }

  const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: customerEmail || booking.user_email,
    payment_intent_data: {
      metadata: {
        bookingId,
      },
    },
    success_url: `${appBaseUrl}/?payment=success&bookingId=${encodeURIComponent(bookingId)}`,
    cancel_url: `${appBaseUrl}/?payment=cancelled&bookingId=${encodeURIComponent(bookingId)}`,
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: roomLabel || `Gateway Resort reservation (${bookingId})`,
          },
          unit_amount: Math.round(Number(amount)),
        },
        quantity: 1,
      },
    ],
    metadata: {
      bookingId,
    },
  });

  const existingMetadata =
    typeof booking.metadata === 'object' && booking.metadata ? booking.metadata : {};

  const { error: updateError } = await supabase
    .from('booking_metadata')
    .update({
      metadata: {
        ...existingMetadata,
        paymentProvider: 'stripe',
        paymentStatus: 'pending',
        stripeCheckoutSessionId: session.id,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('booking_id', bookingId);

  if (updateError) {
    console.error('Error updating pending payment status:', updateError);
  }

  return {
    status: 200,
    body: {
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      bookingId,
    },
  };
}

async function registerBooking(body) {
  const { bookingId, clientBookingRef, roomId, email, clerkUserId, userName } = body || {};
  const normalizedBookingId =
    typeof bookingId === 'string' && bookingId.trim()
      ? bookingId.trim()
      : `pending-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const normalizedClientBookingRef =
    typeof clientBookingRef === 'string' && clientBookingRef.trim() ? clientBookingRef.trim() : '';
  const normalizedRoomId = typeof roomId === 'string' ? roomId.trim() : '';
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedRoomId || !normalizedEmail) {
    return { status: 400, body: { error: 'roomId and email are required' } };
  }

  const validUserId = await resolveValidUserId(clerkUserId);
  const { data: existingRow, error: existingRowError } = await supabase
    .from('booking_metadata')
    .select('metadata')
    .eq('booking_id', normalizedBookingId)
    .maybeSingle();

  if (existingRowError) {
    console.error('Error loading existing booking during fallback registration:', existingRowError);
    return { status: 500, body: { error: 'Failed to register booking' } };
  }

  const existingMetadata =
    typeof existingRow?.metadata === 'object' && existingRow.metadata ? existingRow.metadata : {};

  const { error } = await supabase
    .from('booking_metadata')
    .upsert(
      {
        booking_id: normalizedBookingId,
        room_id: normalizedRoomId,
        user_id: validUserId,
        user_email: normalizedEmail,
        user_name: typeof userName === 'string' ? userName : null,
        booking_date: new Date().toISOString(),
        metadata: {
          ...existingMetadata,
          bookingSource: existingMetadata.bookingSource || 'cal_embed_fallback',
          calTriggerEvent: 'BOOKING_CREATED',
          ...(normalizedClientBookingRef ? { clientBookingRef: normalizedClientBookingRef } : {}),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'booking_id' }
    );

  if (error) {
    console.error('Error registering booking fallback:', error);
    return { status: 500, body: { error: 'Failed to register booking' } };
  }

  return {
    status: 200,
    body: {
      success: true,
      bookingId: normalizedBookingId,
      clientBookingRef: normalizedClientBookingRef || undefined,
    },
  };
}

async function resolveLatestBooking(body) {
  const { roomId, email, clientBookingRef, clerkUserId } = body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedClientBookingRef =
    typeof clientBookingRef === 'string' ? clientBookingRef.trim() : '';

  if (!normalizedClientBookingRef && (!roomId || !normalizedEmail)) {
    return { status: 400, body: { error: 'clientBookingRef or roomId and email are required' } };
  }

  let data = null;
  let error = null;

  if (normalizedClientBookingRef) {
    const directMatch = await supabase
      .from('booking_metadata')
      .select('booking_id, created_at')
      .contains('metadata', { clientBookingRef: normalizedClientBookingRef })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    data = directMatch.data;
    error = directMatch.error;
  }

  if (!data && !error && roomId && normalizedEmail) {
    const directByRoomAndEmail = await supabase
      .from('booking_metadata')
      .select('booking_id, created_at')
      .eq('room_id', roomId)
      .eq('user_email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    data = directByRoomAndEmail.data;
    error = directByRoomAndEmail.error;
  }

  if (!data && !error && clerkUserId && roomId) {
    const fallback = await supabase
      .from('booking_metadata')
      .select('booking_id, created_at')
      .eq('room_id', roomId)
      .eq('user_id', clerkUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    data = fallback.data;
    error = fallback.error;
  }

  if (!data && !error && normalizedEmail) {
    const recentThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const fallbackRows = await supabase
      .from('booking_metadata')
      .select('booking_id, created_at, room_id, user_id, metadata')
      .eq('user_email', normalizedEmail)
      .gte('created_at', recentThreshold)
      .order('created_at', { ascending: false })
      .limit(25);

    if (fallbackRows.error) {
      error = fallbackRows.error;
    } else {
      const matched = (fallbackRows.data || []).find((row) => {
        if (normalizedClientBookingRef) {
          const extractedClientBookingRef = extractClientBookingRef(row?.metadata || {}, row?.metadata?.rawPayload || {});
          if (extractedClientBookingRef === normalizedClientBookingRef) {
            return true;
          }
        }

        if (row?.room_id === roomId) {
          return true;
        }

        const extractedRoomId = extractRoomIdFromPayload(row?.metadata?.rawPayload || {}, {});
        if (extractedRoomId === roomId) {
          return true;
        }

        return !!clerkUserId && row?.user_id === clerkUserId;
      });

      if (matched) {
        data = {
          booking_id: matched.booking_id,
          created_at: matched.created_at,
        };
      }
    }
  }

  if (error) {
    console.error('Resolve booking lookup failed:', error);
    return { status: 500, body: { error: 'Failed to resolve booking' } };
  }

  if (!data?.booking_id) {
    return { status: 404, body: { error: 'Booking not found' } };
  }

  return {
    status: 200,
    body: {
      success: true,
      bookingId: data.booking_id,
      createdAt: data.created_at,
    },
  };
}

async function markCounterPayment(body) {
  const { bookingId, customerEmail } = body || {};
  const normalizedBookingId = typeof bookingId === 'string' ? bookingId.trim() : '';
  const normalizedEmail = normalizeEmail(customerEmail);

  if (!normalizedBookingId) {
    return { status: 400, body: { error: 'bookingId is required' } };
  }

  const { data: booking, error: selectError } = await supabase
    .from('booking_metadata')
    .select('booking_id, room_id, user_email, metadata')
    .eq('booking_id', normalizedBookingId)
    .maybeSingle();

  if (selectError) {
    console.error('Error loading booking metadata for counter payment:', selectError);
    return { status: 500, body: { error: 'Failed to load booking' } };
  }

  if (!booking) {
    return { status: 404, body: { error: 'Booking not found' } };
  }

  const existingMetadata =
    typeof booking.metadata === 'object' && booking.metadata ? booking.metadata : {};

  const emailTarget = normalizedEmail || normalizeEmail(booking.user_email);
  const emailResult = emailTarget
    ? await sendCounterConfirmationEmail({
        toEmail: emailTarget,
        bookingId: normalizedBookingId,
        roomId: booking.room_id,
      })
    : { status: 'skipped', error: 'No recipient email available' };

  const { error: updateError } = await supabase
    .from('booking_metadata')
    .update({
      user_email: emailTarget || undefined,
      metadata: {
        ...existingMetadata,
        paymentOption: 'counter',
        paymentStatus: 'pending_counter',
        awaitingEmailConfirmation: true,
        counterSelectedAt: new Date().toISOString(),
        confirmationEmailStatus: emailResult.status,
        ...(emailResult.providerId ? { confirmationEmailProviderId: emailResult.providerId } : {}),
        ...(emailResult.status === 'sent' ? { confirmationEmailSentAt: new Date().toISOString() } : {}),
        ...(emailResult.error ? { confirmationEmailError: emailResult.error } : {}),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('booking_id', normalizedBookingId);

  if (updateError) {
    console.error('Error updating counter payment status:', updateError);
    return { status: 500, body: { error: 'Failed to save payment option' } };
  }

  return {
    status: 200,
    body: {
      success: true,
      bookingId: normalizedBookingId,
      paymentStatus: 'pending_counter',
      confirmationEmailStatus: emailResult.status,
      confirmationEmailError: emailResult.error || null,
    },
  };
}

function getReservationLabel(roomId) {
  const normalizedRoom = typeof roomId === 'string' && roomId.trim() ? roomId.trim() : 'your selected room';
  return `Gateway Resort room ${normalizedRoom}`;
}

async function sendCounterConfirmationEmail({ toEmail, bookingId, roomId }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !resendFromEmail) {
    return {
      status: 'skipped',
      error: 'Missing RESEND_API_KEY or RESEND_FROM_EMAIL',
    };
  }

  const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const reservationLabel = getReservationLabel(roomId);
  const subject = 'Gateway Resort reservation received - awaiting email confirmation';

  const html = [
    '<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">',
    '<h2 style="margin: 0 0 12px;">Reservation received</h2>',
    `<p>Thank you. We received your reservation for <strong>${reservationLabel}</strong>.</p>`,
    '<p>Your reservation is currently awaiting email confirmation.</p>',
    '<p>We will hold your room until <strong>6:00 PM</strong> on arrival day if it is not confirmed. After 6:00 PM, unconfirmed reservations may be released.</p>',
    '<p>No cancellation fee is charged.</p>',
    `<p><strong>Booking ID:</strong> ${bookingId}</p>`,
    `<p>You can return to the booking page here: <a href="${appBaseUrl}">${appBaseUrl}</a></p>`,
    '<p style="margin-top: 20px;">Gateway Resort</p>',
    '</div>',
  ].join('');

  const text = [
    'Reservation received',
    '',
    `Thank you. We received your reservation for ${reservationLabel}.`,
    'Your reservation is currently awaiting email confirmation.',
    'We will hold your room until 6:00 PM on arrival day if it is not confirmed.',
    'After 6:00 PM, unconfirmed reservations may be released.',
    'No cancellation fee is charged.',
    '',
    `Booking ID: ${bookingId}`,
    `Return to booking page: ${appBaseUrl}`,
    '',
    'Gateway Resort',
  ].join('\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [toEmail],
        subject,
        html,
        text,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        status: 'failed',
        error: payload?.message || payload?.error || `Email provider error (${response.status})`,
      };
    }

    return {
      status: 'sent',
      providerId: typeof payload?.id === 'string' ? payload.id : undefined,
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown email error',
    };
  }
}

async function updateBookingPaymentStatus(bookingId, paymentStatus, paymentFields) {
  const { data: booking, error: selectError } = await supabase
    .from('booking_metadata')
    .select('booking_id, metadata')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (selectError) {
    console.error('Error loading booking during payment update:', selectError);
    return false;
  }

  if (!booking) {
    console.warn(`No booking_metadata row found for booking_id=${bookingId}`);
    return false;
  }

  const existingMetadata =
    typeof booking.metadata === 'object' && booking.metadata ? booking.metadata : {};
  const currentPaymentStatus =
    typeof existingMetadata.paymentStatus === 'string' ? existingMetadata.paymentStatus : null;

  // Ignore out-of-order retries that would move payment state backwards.
  if (
    (currentPaymentStatus === 'refunded' && paymentStatus !== 'refunded') ||
    (currentPaymentStatus === 'paid' && (paymentStatus === 'pending' || paymentStatus === 'failed')) ||
    (currentPaymentStatus === 'failed' && paymentStatus === 'pending')
  ) {
    console.warn(
      `Skipping payment status regression for booking_id=${bookingId}: ${currentPaymentStatus} -> ${paymentStatus}`
    );
    return true;
  }

  const { error: updateError } = await supabase
    .from('booking_metadata')
    .update({
      metadata: {
        ...existingMetadata,
        paymentProvider: 'stripe',
        paymentStatus,
        ...paymentFields,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('booking_id', bookingId);

  if (updateError) {
    console.error('Error updating payment status in booking_metadata:', updateError);
    return false;
  }

  return true;
}

async function logStripeEvent(event, bookingId, matchedBooking) {
  const { error } = await supabase.from('payment_event_log').insert({
    provider: 'stripe',
    event_id: event.id,
    event_type: event.type,
    booking_id: bookingId,
    matched_booking: matchedBooking,
    payload: event,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.warn('payment_event_log insert failed (non-blocking):', error.message);
  }
}

async function storeStripeWebhook(rawBody, headers) {
  if (!stripe || !stripeWebhookSecret || stripeWebhookSecret === 'whsec_REPLACE_ME') {
    return {
      status: 500,
      body: { error: 'Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET in .env.local' },
    };
  }

  try {
    const signature = headers['stripe-signature'];
    let event;

    if (typeof signature === 'string') {
      event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
    } else if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'Stripe signature missing in non-production mode; accepting unsigned payload for local tests.'
      );
      event = rawBody ? JSON.parse(rawBody) : {};
    } else {
      return { status: 400, body: { error: 'Missing stripe-signature header' } };
    }

    const bookingId = await resolveStripeBookingId(event);
    if (!bookingId) {
      await logStripeEvent(event, null, false);
      return { status: 200, body: { success: true, message: 'No booking reference found' } };
    }

    let matchedBooking = false;

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object || {};
      matchedBooking = await updateBookingPaymentStatus(bookingId, 'paid', {
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : null,
        paidAt: new Date().toISOString(),
        paymentAmountTotal: session.amount_total,
        paymentCurrency: session.currency,
      });
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object || {};
      matchedBooking = await updateBookingPaymentStatus(bookingId, 'failed', {
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : null,
        paymentFailureReason: 'checkout_expired',
      });
    } else if (
      event.type === 'charge.refunded' ||
      event.type === 'refund.created' ||
      event.type === 'refund.updated' ||
      event.type === 'charge.refund.updated'
    ) {
      const charge = event.data.object || {};
      matchedBooking = await updateBookingPaymentStatus(bookingId, 'refunded', {
        stripeChargeId: charge.charge || charge.id || null,
        stripePaymentIntentId:
          typeof charge.payment_intent === 'string' ? charge.payment_intent : null,
        refundedAt: new Date().toISOString(),
        paymentCurrency: charge.currency || null,
      });
    }

    await logStripeEvent(event, bookingId, matchedBooking);
    return { status: 200, body: { success: true, message: 'Stripe webhook processed' } };
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return { status: 500, body: { error: 'Internal server error' } };
  }
}

const server = http.createServer((req, res) => {
  // Apply CORS headers to all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  const parsedUrl = new URL(req.url || '/', 'http://localhost');
  const normalizedPath =
    parsedUrl.pathname.length > 1 && parsedUrl.pathname.endsWith('/')
      ? parsedUrl.pathname.slice(0, -1)
      : parsedUrl.pathname;
  const isCalWebhookPath =
    normalizedPath === '/api/webhooks/cal' || normalizedPath.startsWith('/api/webhooks/cal/');
  const isStripeWebhookPath =
    normalizedPath === '/api/webhooks/stripe' || normalizedPath.startsWith('/api/webhooks/stripe/');
  const isStripeCheckoutPath =
    normalizedPath === '/api/payments/create-checkout-session' ||
    normalizedPath.startsWith('/api/payments/create-checkout-session/');
  const isRegisterBookingPath =
    normalizedPath === '/api/payments/register-booking' ||
    normalizedPath.startsWith('/api/payments/register-booking/');
  const isMarkCounterPaymentPath =
    normalizedPath === '/api/payments/mark-counter-payment' ||
    normalizedPath.startsWith('/api/payments/mark-counter-payment/');
  const isStripeResolveBookingPath =
    normalizedPath === '/api/payments/resolve-latest-booking' ||
    normalizedPath.startsWith('/api/payments/resolve-latest-booking/');

  console.log(`[webhook] ${req.method} ${normalizedPath}${parsedUrl.search}`);

  if (req.method !== 'POST' && isCalWebhookPath) {
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(
      JSON.stringify({
        ok: true,
        route: '/api/webhooks/cal',
        method: req.method,
        message: 'Endpoint reachable. POST required for event ingestion.',
      })
    );
    return;
  }

  if (req.method !== 'POST' && isStripeWebhookPath) {
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(
      JSON.stringify({
        ok: true,
        route: '/api/webhooks/stripe',
        method: req.method,
        message: 'Endpoint reachable. POST required for event ingestion.',
      })
    );
    return;
  }

  if (
    req.method !== 'POST' &&
    (isStripeCheckoutPath || isStripeResolveBookingPath || isRegisterBookingPath || isMarkCounterPaymentPath)
  ) {
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(
      JSON.stringify({
        ok: true,
        route: isMarkCounterPaymentPath
          ? '/api/payments/mark-counter-payment'
          : isRegisterBookingPath
          ? '/api/payments/register-booking'
          : isStripeResolveBookingPath
          ? '/api/payments/resolve-latest-booking'
          : '/api/payments/create-checkout-session',
        method: req.method,
        message: isMarkCounterPaymentPath
          ? 'Endpoint reachable. POST required for pay-at-counter confirmation.'
          : isRegisterBookingPath
          ? 'Endpoint reachable. POST required for fallback booking registration.'
          : isStripeResolveBookingPath
          ? 'Endpoint reachable. POST required for booking resolution.'
          : 'Endpoint reachable. POST required for checkout session creation.',
      })
    );
    return;
  }

  if (
    !isCalWebhookPath &&
    !isStripeWebhookPath &&
    !isStripeCheckoutPath &&
    !isStripeResolveBookingPath &&
    !isRegisterBookingPath &&
    !isMarkCounterPaymentPath
  ) {
    res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(
      JSON.stringify({
        error: 'Not found',
        method: req.method,
        path: normalizedPath,
      })
    );
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ error: 'Method not allowed', method: req.method }));
    return;
  }

  let rawBody = '';
  req.on('data', chunk => {
    rawBody += chunk;
  });

  req.on('end', async () => {
    try {
      let result;

      if (isCalWebhookPath) {
        const parsedBody = rawBody ? JSON.parse(rawBody) : {};
        result = await storeCalWebhook(parsedBody);
      } else if (isStripeWebhookPath) {
        result = await storeStripeWebhook(rawBody, req.headers || {});
      } else if (isStripeCheckoutPath) {
        const parsedBody = rawBody ? JSON.parse(rawBody) : {};
        result = await createStripeCheckoutSession(parsedBody);
      } else if (isRegisterBookingPath) {
        const parsedBody = rawBody ? JSON.parse(rawBody) : {};
        result = await registerBooking(parsedBody);
      } else if (isMarkCounterPaymentPath) {
        const parsedBody = rawBody ? JSON.parse(rawBody) : {};
        result = await markCounterPayment(parsedBody);
      } else if (isStripeResolveBookingPath) {
        const parsedBody = rawBody ? JSON.parse(rawBody) : {};
        result = await resolveLatestBooking(parsedBody);
      } else {
        result = { status: 404, body: { error: 'Not found' } };
      }

      res.writeHead(result.status, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify(result.body));
    } catch (error) {
      console.error('Local webhook server error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
});

function printReadyMessage() {
  console.log('Local webhook server ready at http://localhost:3001');
  console.log('Cal webhook route: http://localhost:3001/api/webhooks/cal');
  console.log('Stripe webhook route: http://localhost:3001/api/webhooks/stripe');
  console.log('Stripe checkout route: http://localhost:3001/api/payments/create-checkout-session');
  console.log('Stripe register booking route: http://localhost:3001/api/payments/register-booking');
  console.log('Stripe counter payment route: http://localhost:3001/api/payments/mark-counter-payment');
  console.log('Stripe resolve booking route: http://localhost:3001/api/payments/resolve-latest-booking');
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn('[webhook] Port 3001 already in use. Attempting to free it...');
    const { execSync } = require('child_process');
    try {
      execSync(
        'for /f "tokens=5" %a in (\'netstat -aon ^| findstr :3001 ^| findstr LISTENING\') do taskkill /F /PID %a',
        { shell: 'cmd.exe', stdio: 'ignore' }
      );
    } catch {
      // Port may have been released already between retries
    }
    setTimeout(() => {
      server.removeAllListeners('error');
      server.on('error', (retryErr) => {
        console.error('[webhook] Failed to start after freeing port:', retryErr.message);
        process.exit(1);
      });
      server.once('listening', printReadyMessage);
      server.listen(3001);
    }, 1000);
  } else {
    console.error('[webhook] Server error:', err);
    process.exit(1);
  }
});

server.once('listening', printReadyMessage);
server.listen(3001);