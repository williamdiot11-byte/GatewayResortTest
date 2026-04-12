import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { applyCors } from '../_utils/security';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CreateCheckoutPayload {
  bookingId?: string;
  amount?: number;
  currency?: string;
  customerEmail?: string;
  roomLabel?: string;
}

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!stripe) {
    res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY' });
    return;
  }

  try {
    const {
      bookingId,
      amount,
      currency = 'usd',
      customerEmail,
      roomLabel,
    } = (req.body || {}) as CreateCheckoutPayload;

    if (!bookingId || !amount || amount <= 0) {
      res.status(400).json({ error: 'bookingId and amount are required' });
      return;
    }

    const { data: booking, error: selectError } = await supabase
      .from('booking_metadata')
      .select('booking_id, user_email, metadata')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (selectError) {
      console.error('Error loading booking metadata:', selectError);
      res.status(500).json({ error: 'Failed to load booking' });
      return;
    }

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
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
            unit_amount: Math.round(amount),
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId,
      },
    });

    const existingMetadata = typeof booking.metadata === 'object' && booking.metadata ? booking.metadata : {};

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

    res.status(200).json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      bookingId,
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}