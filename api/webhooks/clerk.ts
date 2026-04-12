import { Webhook } from 'svix';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Admin key for bypassing RLS
);

// Keep body raw for signature verification reliability.
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

/**
 * Clerk Webhook Handler
 * Syncs user creation/updates/deletions from Clerk to Supabase profiles table
 * 
 * Setup:
 * 1. Go to Clerk Dashboard → Webhooks → Add Endpoint
 * 2. URL: https://yoursite.com/api/webhooks/clerk
 * 3. Subscribe to: user.created, user.updated, user.deleted
 * 4. Copy webhook secret to CLERK_WEBHOOK_SECRET env var
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('Missing CLERK_WEBHOOK_SECRET');
      res.status(500).json({ error: 'Webhook secret not configured' });
      return;
    }

    // Verify webhook signature with Svix
    const wh = new Webhook(webhookSecret);
    const body = await getRawBody(req);
    const headers = {
      'svix-id': req.headers['svix-id'] as string,
      'svix-timestamp': req.headers['svix-timestamp'] as string,
      'svix-signature': req.headers['svix-signature'] as string,
    };

    if (!headers['svix-id'] || !headers['svix-timestamp'] || !headers['svix-signature']) {
      res.status(400).json({ error: 'Missing Svix headers' });
      return;
    }

    const payload = wh.verify(body, headers);
    const { type, data } = payload as any;

    console.log(`Received Clerk webhook: ${type}`);

    // Handle user creation
    if (type === 'user.created') {
      const { error } = await supabase.from('profiles').insert({
        id: data.id,
        email: data.email_addresses[0]?.email_address || '',
        full_name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || null,
        role: 'guest', // Default role
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error creating profile:', error);
        throw error;
      }

      console.log(`Created profile for user: ${data.id}`);
    }

    // Handle user updates
    if (type === 'user.updated') {
      const { error } = await supabase
        .from('profiles')
        .update({
          email: data.email_addresses[0]?.email_address || '',
          full_name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || null,
        })
        .eq('id', data.id);

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      console.log(`Updated profile for user: ${data.id}`);
    }

    // Handle user deletion
    if (type === 'user.deleted') {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', data.id);

      if (error) {
        console.error('Error deleting profile:', error);
        throw error;
      }

      console.log(`Deleted profile for user: ${data.id}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook verification failed' });
  }
}
