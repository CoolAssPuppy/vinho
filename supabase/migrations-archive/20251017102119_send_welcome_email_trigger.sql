-- Function to send welcome email via edge function
CREATE OR REPLACE FUNCTION send_welcome_email_on_signup()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Get user name from profile
  user_name := COALESCE(TRIM(CONCAT(NEW.first_name, ' ', NEW.last_name)), NULL);

  -- Call edge function to send welcome email
  PERFORM
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'email', user_email,
        'name', user_name
      )
    );

  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_created_send_welcome_email ON profiles;

CREATE TRIGGER on_profile_created_send_welcome_email
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_email_on_signup();

COMMENT ON FUNCTION send_welcome_email_on_signup IS 'Sends a welcome email to new users via edge function';
