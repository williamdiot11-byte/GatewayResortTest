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

interface EmailSendResult {
  status: 'sent' | 'failed' | 'skipped';
  providerId?: string;
  error?: string;
}

function getReservationLabel(roomId: string | null | undefined): string {
  const normalizedRoom = typeof roomId === 'string' && roomId.trim() ? roomId.trim() : 'your selected room';
  return `Gateway Resort room ${normalizedRoom}`;
}

async function sendCounterConfirmationEmail(params: {
  toEmail: string;
  bookingId: string;
  roomId?: string | null;
}): Promise<EmailSendResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !resendFromEmail) {
    return {
      status: 'skipped',
      error: 'Missing RESEND_API_KEY or RESEND_FROM_EMAIL',
    };
  }

  const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const reservationLabel = getReservationLabel(params.roomId);
  const subject = 'Gateway Resort reservation received - awaiting email confirmation';

  const html = [
    '<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">',
    '<h2 style="margin: 0 0 12px;">Reservation received</h2>',
    `<p>Thank you. We received your reservation for <strong>${reservationLabel}</strong>.</p>`,
    '<p>Your reservation is currently awaiting email confirmation.</p>',
    '<p>We will hold your room until <strong>6:00 PM</strong> on arrival day if it is not confirmed. After 6:00 PM, unconfirmed reservations may be released.</p>',
    '<p>No cancellation fee is charged.</p>',
    `<p><strong>Booking ID:</strong> ${params.bookingId}</p>`,
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
    `Booking ID: ${params.bookingId}`,
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
        to: [params.toEmail],
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
      .select('booking_id, room_id, user_email, metadata')
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

    const emailTarget = normalizedEmail || (typeof booking.user_email === 'string' ? booking.user_email.trim().toLowerCase() : '');
    const emailResult = emailTarget
      ? await sendCounterConfirmationEmail({
          toEmail: emailTarget,
          bookingId: normalizedBookingId,
          roomId: booking.room_id,
        })
      : ({ status: 'skipped', error: 'No recipient email available' } as EmailSendResult);

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
          ...(emailResult.status === 'sent'
            ? { confirmationEmailSentAt: new Date().toISOString() }
            : {}),
          ...(emailResult.error ? { confirmationEmailError: emailResult.error } : {}),
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
      confirmationEmailStatus: emailResult.status,
      confirmationEmailError: emailResult.error || null,
    });
  } catch (error) {
    console.error('Mark counter payment error:', error);
    res.status(500).json({ error: 'Failed to save payment option' });
  }
}
