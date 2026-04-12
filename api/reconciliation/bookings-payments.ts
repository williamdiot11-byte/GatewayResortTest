import { createClient } from '@supabase/supabase-js';
import { applyCors, requireAdminApiKey } from '../_utils/security';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function hoursSince(isoDate?: string | null): number | null {
  if (!isoDate) {
    return null;
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return (Date.now() - date.getTime()) / (1000 * 60 * 60);
}

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!requireAdminApiKey(req, res)) {
    return;
  }

  try {
    const staleHoursThreshold = Number(req.query?.staleHours || 24);

    const { data: bookings, error: bookingError } = await supabase
      .from('booking_metadata')
      .select('booking_id, user_email, booking_date, updated_at, metadata')
      .order('updated_at', { ascending: false })
      .limit(500);

    if (bookingError) {
      console.error('Reconciliation booking query error:', bookingError);
      res.status(500).json({ error: 'Failed to load booking metadata' });
      return;
    }

    const staleUnpaidBookings: Array<Record<string, unknown>> = [];
    const conflictingStates: Array<Record<string, unknown>> = [];

    for (const booking of bookings || []) {
      const metadata = typeof booking.metadata === 'object' && booking.metadata ? booking.metadata : {};
      const paymentStatus = String((metadata as any).paymentStatus || 'unpaid').toLowerCase();
      const bookingStatus = String((metadata as any).bookingStatus || 'active').toLowerCase();
      const updatedHours = hoursSince(booking.updated_at);

      const isUnpaidLike = paymentStatus === 'unpaid' || paymentStatus === 'pending' || paymentStatus === 'failed';
      if (isUnpaidLike && updatedHours !== null && updatedHours >= staleHoursThreshold) {
        staleUnpaidBookings.push({
          bookingId: booking.booking_id,
          userEmail: booking.user_email,
          paymentStatus,
          bookingStatus,
          updatedHoursAgo: Number(updatedHours.toFixed(2)),
        });
      }

      const paidButCancelled = bookingStatus === 'cancelled' && paymentStatus === 'paid';
      const paidMissingReference =
        paymentStatus === 'paid' &&
        !(metadata as any).stripeCheckoutSessionId &&
        !(metadata as any).stripeChargeId;

      if (paidButCancelled || paidMissingReference) {
        conflictingStates.push({
          bookingId: booking.booking_id,
          bookingStatus,
          paymentStatus,
          reason: paidButCancelled
            ? 'cancelled booking has paid status; verify refund workflow'
            : 'paid status missing stripe payment references',
        });
      }
    }

    // Optional orphan-payment detection from event log table (if created).
    let orphanPaymentEvents: Array<Record<string, unknown>> = [];
    let orphanDetectionWarning: string | null = null;

    const { data: paymentEvents, error: paymentEventsError } = await supabase
      .from('payment_event_log')
      .select('event_id, event_type, booking_id, matched_booking, created_at')
      .eq('provider', 'stripe')
      .order('created_at', { ascending: false })
      .limit(500);

    if (paymentEventsError) {
      orphanDetectionWarning = 'payment_event_log table not found or inaccessible; orphan payment detection skipped';
    } else {
      orphanPaymentEvents = (paymentEvents || [])
        .filter(event => event.matched_booking === false || !event.booking_id)
        .map(event => ({
          eventId: event.event_id,
          eventType: event.event_type,
          bookingId: event.booking_id,
          matchedBooking: event.matched_booking,
          createdAt: event.created_at,
        }));
    }

    res.status(200).json({
      success: true,
      staleHoursThreshold,
      summary: {
        staleUnpaidCount: staleUnpaidBookings.length,
        orphanPaymentCount: orphanPaymentEvents.length,
        conflictingStateCount: conflictingStates.length,
      },
      staleUnpaidBookings,
      orphanPaymentEvents,
      conflictingStates,
      orphanDetectionWarning,
    });
  } catch (error) {
    console.error('Reconciliation endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}