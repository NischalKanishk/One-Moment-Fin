-- Fix the migration function to work with existing database schema
-- This removes references to non-existent tables and columns

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS migrate_user_to_deprecated_simple(UUID, TEXT);

-- Create the corrected migration function
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
                    'calendly_url', us.calendly_url,
                    'calendly_api_key', us.calendly_api_key,
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
