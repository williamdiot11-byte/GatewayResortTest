import { createClient } from '@supabase/supabase-js';
import { applyCors } from '../_utils/security';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ResolveBookingPayload {
  roomId?: string;
  email?: string;
  clientBookingRef?: string;
  clerkUserId?: string;
}

function extractRoomIdFromMetadata(metadata: any): string | null {
  const notesCandidates = [
    metadata?.rawPayload?.additionalNotes,
    metadata?.rawPayload?.responses?.notes?.value,
    metadata?.rawPayload?.notes,
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

function extractClientBookingRefFromMetadata(metadata: any): string | null {
  const candidates = [
    metadata?.clientBookingRef,
    metadata?.client_booking_ref,
    metadata?.rawPayload?.metadata?.clientBookingRef,
    metadata?.rawPayload?.metadata?.client_booking_ref,
  ];

  const value = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim());
  return typeof value === 'string' ? value.trim() : null;
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
    const { roomId, email, clientBookingRef, clerkUserId } = (req.body || {}) as ResolveBookingPayload;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedClientBookingRef = typeof clientBookingRef === 'string' ? clientBookingRef.trim() : '';

    if (!normalizedClientBookingRef && (!roomId || !normalizedEmail)) {
      res.status(400).json({ error: 'clientBookingRef or roomId and email are required' });
      return;
    }

    let data: any = null;
    let error: any = null;

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
      const query = await supabase
        .from('booking_metadata')
        .select('booking_id, created_at')
        .eq('room_id', roomId)
        .eq('user_email', normalizedEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      data = query.data;
      error = query.error;
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
        const matched = (fallbackRows.data || []).find((row: any) => {
          if (normalizedClientBookingRef && extractClientBookingRefFromMetadata(row?.metadata || {}) === normalizedClientBookingRef) {
            return true;
          }

          if (row?.room_id === roomId) {
            return true;
          }

          const extractedRoomId = extractRoomIdFromMetadata(row?.metadata || {});
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
      res.status(500).json({ error: 'Failed to resolve booking' });
      return;
    }

    if (!data?.booking_id) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    res.status(200).json({
      success: true,
      bookingId: data.booking_id,
      createdAt: data.created_at,
    });
  } catch (error) {
    console.error('Resolve latest booking error:', error);
    res.status(500).json({ error: 'Failed to resolve booking' });
  }
}
