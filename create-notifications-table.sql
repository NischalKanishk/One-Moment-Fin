-- Create notifications table for OneMFin
-- This table will store all notifications for users

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'new_lead',
        'meeting_today',
        'meeting_reminder',
        'assessment_completed',
        'follow_up_reminder',
        'system_update'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional data like lead_id, meeting_id, etc.
    is_read BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE -- Optional expiration for time-sensitive notifications
);

-- Indexes for better performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- RLS Policies
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id IN (
        SELECT id FROM users WHERE clerk_id = get_clerk_user_id()
    ));

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id IN (
        SELECT id FROM users WHERE clerk_id = get_clerk_user_id()
    ));

CREATE POLICY "Service role can manage all notifications" ON notifications
    FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT NULL,
    p_priority TEXT DEFAULT 'medium',
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id, type, title, message, data, priority, expires_at
    ) VALUES (
        p_user_id, p_type, p_title, p_message, p_data, p_priority, p_expires_at
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications 
    SET is_read = TRUE, read_at = NOW()
    WHERE id = p_notification_id 
    AND user_id IN (
        SELECT id FROM users WHERE clerk_id = get_clerk_user_id()
    );
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER 
        FROM notifications 
        WHERE user_id = p_user_id 
        AND is_read = FALSE
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
