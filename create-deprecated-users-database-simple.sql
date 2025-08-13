-- Create Simplified Deprecated_Users Database Schema
-- This approach uses a single table with JSON data storage for simplicity and performance

-- Create the single deprecated_users table
CREATE TABLE IF NOT EXISTS deprecated_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_user_id UUID NOT NULL, -- Reference to the original user ID
    clerk_id TEXT, -- Original Clerk user ID for reference
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    mfd_registration_number TEXT,
    auth_provider TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When the user was deleted
    referral_link TEXT,
    profile_image_url TEXT,
    settings JSONB DEFAULT '{}',
    role TEXT DEFAULT 'mfd',
    deletion_reason TEXT DEFAULT 'user_requested', -- Reason for deletion
    data_migration_status TEXT DEFAULT 'completed', -- Status of data migration
    
    -- Single JSON field containing ALL user data
    user_data JSONB DEFAULT '{}' -- Contains all leads, assessments, meetings, etc.
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deprecated_users_original_id ON deprecated_users(original_user_id);
CREATE INDEX IF NOT EXISTS idx_deprecated_users_clerk_id ON deprecated_users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_deprecated_users_deleted_at ON deprecated_users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_deprecated_users_user_data_gin ON deprecated_users USING GIN (user_data);

-- Create a function to migrate user data to the single deprecated table
-- Updated to work with existing database schema
CREATE OR REPLACE FUNCTION migrate_user_to_deprecated_simple(user_uuid UUID, deletion_reason TEXT DEFAULT 'user_requested')
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
    user_data_json JSONB := '{}';
    deprecated_user_uuid UUID;
BEGIN
    -- Get user information
    SELECT * INTO user_record FROM users WHERE id = user_uuid;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', user_uuid;
    END IF;

    -- Build comprehensive user data JSON based on existing tables
    user_data_json := jsonb_build_object(
        'user_info', jsonb_build_object(
            'id', user_record.id,
            'clerk_id', user_record.clerk_id,
            'full_name', user_record.full_name,
            'email', user_record.email,
            'phone', user_record.phone,
            'mfd_registration_number', user_record.mfd_registration_number,
            'auth_provider', user_record.auth_provider,
            'created_at', user_record.created_at,
            'referral_link', user_record.referral_link,
            'profile_image_url', user_record.profile_image_url,
            'settings', user_record.settings,
            'role', user_record.role
        ),
        'user_settings', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', us.id,
                    
                    'google_calendar_id', us.google_calendar_id,
                    'notification_preferences', us.notification_preferences,
                    'created_at', us.created_at
                )
            )
            FROM user_settings us
            WHERE us.user_id = user_uuid
        ),
        'leads', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', l.id,
                    'full_name', l.full_name,
                    'email', l.email,
                    'phone', l.phone,
                    'age', l.age,
                    'source_link', l.source_link,
                    'status', l.status,
                    'created_at', l.created_at,
                    'notes', l.notes,
                    'risk_profile_id', l.risk_profile_id,
                    'kyc_status', l.kyc_status
                )
            )
            FROM leads l
            WHERE l.user_id = user_uuid
        ),
        'meetings', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', m.id,
                    'lead_id', m.lead_id,
                    'external_event_id', m.external_event_id,
                    'platform', m.platform,
                    'meeting_link', m.meeting_link,
                    'title', m.title,
                    'description', m.description,
                    'start_time', m.start_time,
                    'end_time', m.end_time,
                    'status', m.status,
                    'is_synced', m.is_synced,
                    'created_at', m.created_at
                )
            )
            FROM meetings m
            WHERE m.user_id = user_uuid
        ),
        'user_subscriptions', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', us.id,
                    'subscription_plan_id', us.subscription_plan_id,
                    'start_date', us.start_date,
                    'end_date', us.end_date,
                    'is_active', us.is_active,
                    'payment_status', us.payment_status,
                    'payment_provider', us.payment_provider,
                    'payment_ref_id', us.payment_ref_id,
                    'created_at', us.created_at
                )
            )
            FROM user_subscriptions us
            WHERE us.user_id = user_uuid
        ),
        'product_recommendations', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', pr.id,
                    'risk_category', pr.risk_category,
                    'title', pr.title,
                    'description', pr.description,
                    'amc_name', pr.amc_name,
                    'product_type', pr.product_type,
                    'is_ai_generated', pr.is_ai_generated,
                    'visibility', pr.visibility,
                    'created_at', pr.created_at
                )
            )
            FROM product_recommendations pr
            WHERE pr.user_id = user_uuid
        ),
        'ai_feedback', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', af.id,
                    'assessment_submission_id', af.assessment_submission_id,
                    'product_ids', af.product_ids,
                    'rating', af.rating,
                    'comment', af.comment,
                    'created_at', af.created_at
                )
            )
            FROM ai_feedback af
            WHERE af.user_id = user_uuid
        ),
        'migration_metadata', jsonb_build_object(
            'migrated_at', NOW(),
            'total_leads', (
                SELECT COUNT(*) FROM leads WHERE user_id = user_uuid
            ),
            'total_meetings', (
                SELECT COUNT(*) FROM meetings WHERE user_id = user_uuid
            ),
            'total_subscriptions', (
                SELECT COUNT(*) FROM user_subscriptions WHERE user_id = user_uuid
            ),
            'total_products', (
                SELECT COUNT(*) FROM product_recommendations WHERE user_id = user_uuid
            ),
            'total_feedback', (
                SELECT COUNT(*) FROM ai_feedback WHERE user_id = user_uuid
            )
        )
    );

    -- Insert into deprecated_users with all data
    INSERT INTO deprecated_users (
        original_user_id, clerk_id, full_name, email, phone, mfd_registration_number,
        auth_provider, created_at, referral_link, profile_image_url, settings, role,
        deletion_reason, user_data
    ) VALUES (
        user_record.id, user_record.clerk_id, user_record.full_name, user_record.email,
        user_record.phone, user_record.mfd_registration_number, user_record.auth_provider,
        user_record.created_at, user_record.referral_link, user_record.profile_image_url,
        user_record.settings, user_record.role, deletion_reason, user_data_json
    ) RETURNING id INTO deprecated_user_uuid;

    -- Update migration status
    UPDATE deprecated_users 
    SET data_migration_status = 'completed' 
    WHERE id = deprecated_user_uuid;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback: delete the deprecated user if migration fails
        IF deprecated_user_uuid IS NOT NULL THEN
            DELETE FROM deprecated_users WHERE id = deprecated_user_uuid;
        END IF;
        RAISE EXCEPTION 'Migration failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION migrate_user_to_deprecated_simple(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_user_to_deprecated_simple(UUID, TEXT) TO service_role;

-- Create a view to easily query deprecated user data
CREATE OR REPLACE VIEW deprecated_user_summary_simple AS
SELECT 
    id,
    original_user_id,
    clerk_id,
    full_name,
    email,
    phone,
    role,
    deleted_at,
    deletion_reason,
    data_migration_status,
    user_data->'migration_metadata'->>'total_leads' as total_leads,
    user_data->'migration_metadata'->>'total_meetings' as total_meetings,
    user_data->'migration_metadata'->>'total_subscriptions' as total_subscriptions,
    user_data->'migration_metadata'->>'total_products' as total_products,
    user_data->'migration_metadata'->>'total_feedback' as total_feedback
FROM deprecated_users;

-- Grant read access to the view
GRANT SELECT ON deprecated_user_summary_simple TO authenticated;
GRANT SELECT ON deprecated_user_summary_simple TO service_role;

-- Create helper functions for easy data access
CREATE OR REPLACE FUNCTION get_deprecated_user_leads(deprecated_user_uuid UUID)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT user_data->'leads' 
        FROM deprecated_users 
        WHERE id = deprecated_user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_deprecated_user_leads(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_deprecated_user_leads(UUID) TO service_role;

-- Create a function to get all deprecated users (for admin purposes)
CREATE OR REPLACE FUNCTION get_all_deprecated_users()
RETURNS TABLE (
    id UUID,
    original_user_id UUID,
    clerk_id TEXT,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    role TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deletion_reason TEXT,
    data_migration_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        du.id,
        du.original_user_id,
        du.clerk_id,
        du.full_name,
        du.email,
        du.phone,
        du.role,
        du.deleted_at,
        du.deletion_reason,
        du.data_migration_status
    FROM deprecated_users du
    ORDER BY du.deleted_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_deprecated_users() TO service_role;

-- Add comments for documentation
COMMENT ON TABLE deprecated_users IS 'Single table storing all deleted user data with comprehensive JSON storage';
COMMENT ON COLUMN deprecated_users.user_data IS 'JSONB field containing all user data including leads, assessments, meetings, etc.';
COMMENT ON FUNCTION migrate_user_to_deprecated_simple(UUID, TEXT) IS 'Migrates all user data to single deprecated table with JSON storage';
