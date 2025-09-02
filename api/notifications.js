import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to authenticate user
async function authenticateUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid authorization header');
  }

  const token = authHeader.substring(7);
  
  // Verify JWT token with Clerk
  const clerkResponse = await fetch(`https://api.clerk.com/v1/sessions/${token}/verify`, {
    headers: {
      'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
    },
  });

  if (!clerkResponse.ok) {
    throw new Error('Invalid token');
  }

  const session = await clerkResponse.json();
  return session;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = await authenticateUser(req);
    const userId = user.user_id;

    // Get user from database
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { method } = req;
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    // GET /api/notifications - Get user notifications
    if (method === 'GET' && pathname === '/api/notifications') {
      const { page = 1, limit = 20, unread_only = false } = req.query;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', dbUser.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (unread_only === 'true') {
        query = query.eq('is_read', false);
      }

      const { data: notifications, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({ error: 'Failed to fetch notifications' });
      }

      // Get unread count
      const { count: unreadCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', dbUser.id)
        .eq('is_read', false);

      return res.json({
        notifications,
        unread_count: unreadCount || 0,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          has_more: notifications.length === parseInt(limit)
        }
      });
    }

    // GET /api/notifications/count - Get unread notification count
    if (method === 'GET' && pathname === '/api/notifications/count') {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', dbUser.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching notification count:', error);
        return res.status(500).json({ error: 'Failed to fetch notification count' });
      }

      return res.json({ unread_count: count || 0 });
    }

    // PUT /api/notifications/:id/read - Mark notification as read
    if (method === 'PUT' && pathname.match(/^\/api\/notifications\/[^\/]+\/read$/)) {
      const notificationId = pathname.split('/')[3];

      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId)
        .eq('user_id', dbUser.id);

      if (error) {
        console.error('Error marking notification as read:', error);
        return res.status(500).json({ error: 'Failed to mark notification as read' });
      }

      return res.json({ success: true });
    }

    // PUT /api/notifications/read-all - Mark all notifications as read
    if (method === 'PUT' && pathname === '/api/notifications/read-all') {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', dbUser.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return res.status(500).json({ error: 'Failed to mark all notifications as read' });
      }

      return res.json({ success: true });
    }

    // POST /api/notifications - Create notification (admin only)
    if (method === 'POST' && pathname === '/api/notifications') {
      const { user_id, type, title, message, data, priority = 'medium', expires_at } = req.body;

      if (!user_id || !type || !title || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          user_id,
          type,
          title,
          message,
          data,
          priority,
          expires_at
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        return res.status(500).json({ error: 'Failed to create notification' });
      }

      return res.status(201).json(notification);
    }

    return res.status(404).json({ error: 'Endpoint not found' });

  } catch (error) {
    console.error('Notification API error:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
