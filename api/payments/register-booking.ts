import { createClient } from '@supabase/supabase-js';
import { applyCors } from '../_utils/security';
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RegisterBookingPayload {
  bookingId?: string;
  roomId?: string;
  email?: string;
  clerkUserId?: string;
  userName?: string;
}

function normalizeEmail(candidate: unknown): string {
  return typeof candidate === 'string' ? candidate.trim().toLowerCase() : '';
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

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { bookingId, roomId, email, clerkUserId, userName } = (req.body || {}) as RegisterBookingPayload;

    const normalizedBookingId =
      typeof bookingId === 'string' && bookingId.trim()
        ? bookingId.trim()
        : `pending-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const normalizedRoomId = typeof roomId === 'string' ? roomId.trim() : '';
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedRoomId || !normalizedEmail) {
      res.status(400).json({ error: 'roomId and email are required' });
      return;
    }

    const validUserId = await resolveValidUserId(clerkUserId);

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
            bookingSource: 'cal_embed_fallback',
            calTriggerEvent: 'BOOKING_CREATED',
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'booking_id' }
      );

    if (error) {
      console.error('Error registering booking fallback:', error);
      res.status(500).json({ error: 'Failed to register booking' });
      return;
    }

    res.status(200).json({ success: true, bookingId: normalizedBookingId });
  } catch (error) {
    console.error('Register booking fallback error:', error);
    res.status(500).json({ error: 'Failed to register booking' });
  }
}