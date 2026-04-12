import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';

// Initialize Supabase with service role key
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const calWebhookSecret = process.env.CAL_WEBHOOK_SECRET;

// Keep body raw so signature validation can use exact payload bytes.
export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: any): Promise<string> {
  if (typeof req.body === 'string') {
    return req.body;
  }

  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }

  if (req.body && typeof req.body === 'object') {
    return JSON.stringify(req.body);
  }

  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer | string) => {
      data += chunk.toString();
    });
    req.on('end', () => resolve(data));
    req.on('error', (error: Error) => reject(error));
  });
}

function extractSignatureCandidates(headerValue: string): string[] {
  const pieces = headerValue
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const values: string[] = [];
  for (const piece of pieces) {
    // Accept both raw and key=value formats (sha256=..., v1=...).
    const separator = piece.indexOf('=');
    if (separator === -1) {
      values.push(piece);
    } else {
      values.push(piece.slice(separator + 1).trim());
    }
  }

  return values;
}

function safeCompare(actual: string, expected: string): boolean {
  try {
    const a = Buffer.from(actual);
    const b = Buffer.from(expected);
    if (a.length !== b.length) {
      return false;
    }

    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function verifyCalSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  const digestHex = createHmac('sha256', secret).update(rawBody).digest('hex');
  const digestBase64 = createHmac('sha256', secret).update(rawBody).digest('base64');
  const providedSignatures = extractSignatureCandidates(signatureHeader);

  return providedSignatures.some((provided) => {
    const normalized = provided.startsWith('sha256=') ? provided.slice('sha256='.length) : provided;

    return safeCompare(normalized, digestHex) || safeCompare(normalized, digestBase64);
  });
}

async function resolveValidUserId(candidateUserId: unknown): Promise<string | null> {
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

function normalizeEmail(candidate: unknown): string {
  return typeof candidate === 'string' ? candidate.trim().toLowerCase() : '';
}

function extractRoomIdFromPayload(payload: any, metadata: any): string | null {
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

/**
 * Cal.com Webhook Handler
 * Stores Cal booking lifecycle events in Supabase booking_metadata.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const rawBody = await getRawBody(req);
    const signatureHeader =
      req.headers?.['x-cal-signature-256'] ||
      req.headers?.['x-cal-signature'] ||
      req.headers?.['cal-signature-256'] ||
      req.headers?.['cal-signature'];

    if (calWebhookSecret) {
      if (typeof signatureHeader !== 'string' || !verifyCalSignature(rawBody, signatureHeader, calWebhookSecret)) {
        res.status(401).json({ error: 'Invalid Cal webhook signature' });
        return;
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.error('CAL_WEBHOOK_SECRET is missing in production');
      res.status(500).json({ error: 'Server misconfiguration' });
      return;
    }

    const parsedBody = rawBody ? JSON.parse(rawBody) : {};
    const { triggerEvent, payload } = parsedBody || {};

    if (!triggerEvent || !payload) {
      res.status(400).json({ error: 'Invalid webhook payload' });
      return;
    }

    const normalizedEvent = String(triggerEvent).toUpperCase();
    console.log(`Received Cal.com webhook: ${normalizedEvent}`);

    // Cal sends a PING event when testing the webhook connection
    if (normalizedEvent === 'PING') {
      res.status(200).json({ success: true, message: 'Ping received' });
      return;
    }

    const attendee = payload?.attendees?.[0] || null;
    const metadata = payload?.metadata || {};
    const bookingId = String(payload?.uid || payload?.bookingUid || payload?.id || '');

    if (!bookingId) {
      res.status(400).json({ error: 'Missing booking id in payload' });
      return;
    }

    const validUserId = await resolveValidUserId(metadata?.clerkUserId || metadata?.clerk_user_id);
    const normalizedEmail =
      normalizeEmail(attendee?.email) || normalizeEmail(payload?.email) || 'unknown@unknown.local';
    const resolvedRoomId = extractRoomIdFromPayload(payload, metadata);

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
        calTriggerEvent: normalizedEvent,
        rawPayload: payload,
      },
      updated_at: new Date().toISOString(),
    };

    // Handle booking creation (or confirmed booking)
    if (
      normalizedEvent === 'BOOKING_CREATED' ||
      normalizedEvent === 'BOOKING_CONFIRMED' ||
      normalizedEvent === 'BOOKING_REQUESTED'
    ) {
      const { error: dbError } = await supabase
        .from('booking_metadata')
        .upsert(baseRecord, { onConflict: 'booking_id' });

      if (dbError) {
        console.error('Error storing booking metadata:', dbError);
        res.status(500).json({ error: 'Failed to store booking metadata' });
        return;
      }

      console.log(`Upserted booking metadata for: ${bookingId}`);
      res.status(200).json({ 
        success: true, 
        message: 'Booking metadata stored'
      });
      return;
    }

    // Handle booking cancellation
    if (normalizedEvent === 'BOOKING_CANCELLED') {
      const { error: dbError } = await supabase
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

      if (dbError) {
        console.error('Error storing cancellation metadata:', dbError);
        res.status(500).json({ error: 'Failed to store cancellation metadata' });
        return;
      }

      console.log(`Stored cancellation for booking: ${bookingId}`);
      res.status(200).json({ success: true });
      return;
    }

    // Handle booking rescheduled
    if (normalizedEvent === 'BOOKING_RESCHEDULED') {
      const { error: dbError } = await supabase
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

      if (dbError) {
        console.error('Error storing reschedule metadata:', dbError);
        res.status(500).json({ error: 'Failed to store reschedule metadata' });
        return;
      }

      console.log(`Stored reschedule for booking: ${bookingId}`);
      res.status(200).json({ success: true });
      return;
    }

    console.log(`Unhandled event type: ${normalizedEvent}`);
    res.status(200).json({ success: true, message: 'Event ignored' });

  } catch (error) {
    console.error('Cal.com webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
