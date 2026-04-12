import { createClient } from '@supabase/supabase-js';
import { applyCors } from '../_utils/security';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MarkCounterPaymentPayload {
  bookingId?: string;
  customerEmail?: string;
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
    const { bookingId, customerEmail } = (req.body || {}) as MarkCounterPaymentPayload;
    const normalizedBookingId = typeof bookingId === 'string' ? bookingId.trim() : '';
    const normalizedEmail = typeof customerEmail === 'string' ? customerEmail.trim().toLowerCase() : null;

    if (!normalizedBookingId) {
      res.status(400).json({ error: 'bookingId is required' });
      return;
    }

    const { data: booking, error: selectError } = await supabase
      .from('booking_metadata')
      .select('booking_id, metadata')
      .eq('booking_id', normalizedBookingId)
      .maybeSingle();

    if (selectError) {
      console.error('Error loading booking metadata for counter payment:', selectError);
      res.status(500).json({ error: 'Failed to load booking' });
      return;
    }

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const existingMetadata =
      typeof booking.metadata === 'object' && booking.metadata ? booking.metadata : {};

    const { error: updateError } = await supabase
      .from('booking_metadata')
      .update({
        user_email: normalizedEmail || undefined,
        metadata: {
          ...existingMetadata,
          paymentOption: 'counter',
          paymentStatus: 'pending_counter',
          awaitingEmailConfirmation: true,
          counterSelectedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('booking_id', normalizedBookingId);

    if (updateError) {
      console.error('Error updating counter payment status:', updateError);
      res.status(500).json({ error: 'Failed to save payment option' });
      return;
    }

    res.status(200).json({
      success: true,
      bookingId: normalizedBookingId,
      paymentStatus: 'pending_counter',
    });
  } catch (error) {
    console.error('Mark counter payment error:', error);
    res.status(500).json({ error: 'Failed to save payment option' });
  }
}
