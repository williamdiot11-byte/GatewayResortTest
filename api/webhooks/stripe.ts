import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Request body must remain raw for Stripe signature verification.
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
    // Best-effort fallback for environments that pre-parse JSON bodies.
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

async function updateBookingPaymentStatus(
  bookingId: string,
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded',
  paymentFields: Record<string, unknown>
): Promise<boolean> {
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

  const existingMetadata = typeof booking.metadata === 'object' && booking.metadata ? booking.metadata : {};
  const currentPaymentStatus =
    typeof (existingMetadata as Record<string, unknown>).paymentStatus === 'string'
      ? ((existingMetadata as Record<string, unknown>).paymentStatus as string)
      : null;

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

async function logStripeEvent(event: Stripe.Event, bookingId: string | null, matchedBooking: boolean) {
  // Best-effort insert. If the table does not exist yet, continue without failing webhook handling.
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

function resolveBookingId(event: Stripe.Event): string | null {
  const objectData = event.data.object as any;

  return (
    objectData?.metadata?.bookingId ||
    objectData?.client_reference_id ||
    objectData?.metadata?.booking_id ||
    null
  );
}

async function resolveBookingIdFromPaymentIntent(paymentIntentId: string): Promise<string | null> {
  if (!stripe) {
    return null;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const metadata = paymentIntent?.metadata || {};

    return metadata.bookingId || metadata.booking_id || null;
  } catch (error) {
    console.warn(`Unable to resolve bookingId from payment_intent=${paymentIntentId}:`, error);
    return null;
  }
}

async function resolveBookingIdFromCharge(chargeId: string): Promise<string | null> {
  if (!stripe) {
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

    const fromPaymentIntent = await resolveBookingIdFromPaymentIntent(paymentIntentId);
    if (fromPaymentIntent) {
      return fromPaymentIntent;
    }

    return await resolveBookingIdFromStoredPaymentIntent(paymentIntentId);
  } catch (error) {
    console.warn(`Unable to resolve bookingId from charge=${chargeId}:`, error);
    return null;
  }
}

async function resolveBookingIdFromStoredPaymentIntent(paymentIntentId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('booking_metadata')
      .select('booking_id')
      .contains('metadata', { stripePaymentIntentId: paymentIntentId })
      .maybeSingle();

    if (error) {
      console.warn('Failed to lookup booking by stored payment intent:', error);
      return null;
    }

    return data?.booking_id || null;
  } catch (error) {
    console.warn('Unexpected lookup error for stored payment intent:', error);
    return null;
  }
}

async function resolveBookingReference(event: Stripe.Event): Promise<string | null> {
  const directBookingId = resolveBookingId(event);
  if (directBookingId) {
    return directBookingId;
  }

  const objectData = event.data.object as any;
  const paymentIntentId =
    typeof objectData?.payment_intent === 'string'
      ? objectData.payment_intent
      : event.type.startsWith('payment_intent.') && typeof objectData?.id === 'string'
        ? objectData.id
        : null;

  const chargeId =
    event.type === 'charge.refund.updated' && typeof objectData?.charge === 'string'
      ? objectData.charge
      : event.type.startsWith('charge.') && typeof objectData?.id === 'string'
        ? objectData.id
        : event.type.startsWith('refund.') && typeof objectData?.charge === 'string'
          ? objectData.charge
          : null;

  if (chargeId) {
    const fromCharge = await resolveBookingIdFromCharge(chargeId);
    if (fromCharge) {
      return fromCharge;
    }
  }

  if (!paymentIntentId) {
    return null;
  }

  const fromPaymentIntentMetadata = await resolveBookingIdFromPaymentIntent(paymentIntentId);
  if (fromPaymentIntentMetadata) {
    return fromPaymentIntentMetadata;
  }

  return await resolveBookingIdFromStoredPaymentIntent(paymentIntentId);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!stripe || !stripeWebhookSecret) {
    res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET' });
    return;
  }

  try {
    const signature = req.headers['stripe-signature'];
    const rawBody = await getRawBody(req);

    let event: Stripe.Event;

    if (typeof signature === 'string') {
      event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
    } else if (process.env.NODE_ENV !== 'production') {
      console.warn('Stripe signature missing in non-production mode; accepting unsigned payload for local tests.');
      event = (req.body || (rawBody ? JSON.parse(rawBody) : {})) as Stripe.Event;
    } else {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    const bookingId = await resolveBookingReference(event);

    if (!bookingId) {
      console.warn(`Stripe event ${event.type} missing booking reference`);
      res.status(200).json({ success: true, message: 'No booking reference found' });
      return;
    }

    let matchedBooking = false;

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      matchedBooking = await updateBookingPaymentStatus(bookingId, 'paid', {
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : null,
        paidAt: new Date().toISOString(),
        paymentAmountTotal: session.amount_total,
        paymentCurrency: session.currency,
      });
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
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
      const charge = event.data.object as Stripe.Charge;
      matchedBooking = await updateBookingPaymentStatus(bookingId, 'refunded', {
        stripeChargeId: (charge as any).charge || (charge as any).id || null,
        stripePaymentIntentId:
          typeof (charge as any).payment_intent === 'string' ? (charge as any).payment_intent : null,
        refundedAt: new Date().toISOString(),
        paymentCurrency: (charge as any).currency || null,
      });
    }

    await logStripeEvent(event, bookingId, matchedBooking);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}