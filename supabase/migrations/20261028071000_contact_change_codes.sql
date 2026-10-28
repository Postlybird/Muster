-- Workers who sign up with a mobile add an email address (payroll setup
-- invites go by email), and workers who sign up with email add a mobile
-- (urgent work goes by text). Both are confirmed with a code sent to the new
-- address. The demo hooks now send each code to the address being confirmed
-- and say what the code is for.

create or replace function public.hook_send_sms(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- sms.phone is the number the code is for: the new one when changing.
  v_to text := public.normalise_auth_phone(coalesce(nullif(event -> 'sms' ->> 'phone', ''), event -> 'user' ->> 'phone'));
  v_current text := public.normalise_auth_phone(event -> 'user' ->> 'phone');
  v_otp text := event -> 'sms' ->> 'otp';
  v_change boolean := v_current is distinct from v_to;
begin
  insert into public.dev_outbox (channel, recipient, body, meta)
  values (
    'sms',
    coalesce(v_to, 'unknown'),
    case
      when v_change then 'Your code to confirm this mobile number is ' || v_otp || '. It expires in 15 minutes.'
      else 'Your sign-in code is ' || v_otp || '. It expires in 15 minutes.'
    end,
    jsonb_build_object('kind', case when v_change then 'auth_phone_change' else 'auth_otp' end, 'otp', v_otp)
  );
  return '{}'::jsonb;
end;
$$;

-- One sign-in or confirmation email into the demo outbox. Called by the hook only.
create function public.dev_auth_email(
  p_recipient text,
  p_action text,
  p_token text,
  p_token_hash text,
  p_base_url text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_type text;
  v_link text;
  v_change boolean := p_action = 'email_change';
begin
  if p_token is null then
    return;
  end if;
  -- verifyOtp() type for each email action.
  v_type := case p_action
    when 'signup' then 'email'
    when 'magiclink' then 'email'
    else p_action
  end;
  v_link := p_base_url
    || case when position('?' in p_base_url) > 0 then '&' else '?' end
    || 'token_hash=' || p_token_hash || '&type=' || v_type;

  insert into public.dev_outbox (channel, recipient, subject, body, meta)
  values (
    'email',
    coalesce(p_recipient, 'unknown'),
    case when v_change then 'Confirm your email address' else 'Your sign-in code' end,
    case
      when v_change then 'Your code to confirm this email address is ' || p_token || '. It expires in 15 minutes.'
        || chr(10) || chr(10) || 'Or confirm it with this link: ' || v_link
      else 'Your sign-in code is ' || p_token || '. It expires in 15 minutes.'
        || chr(10) || chr(10) || 'Or sign in with this link: ' || v_link
    end,
    jsonb_build_object('kind', 'auth_' || p_action, 'otp', p_token, 'link', v_link)
  );
end;
$$;

create or replace function public.hook_send_email(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := nullif(event -> 'user' ->> 'email', '');
  v_new_email text := nullif(event -> 'user' ->> 'new_email', '');
  v_data jsonb := event -> 'email_data';
  v_action text := v_data ->> 'email_action_type';
  v_token text := nullif(v_data ->> 'token', '');
  v_hash text := nullif(v_data ->> 'token_hash', '');
  v_token_new text := nullif(v_data ->> 'token_new', '');
  v_hash_new text := nullif(v_data ->> 'token_hash_new', '');
  v_base text := coalesce(nullif(v_data ->> 'redirect_to', ''), (v_data ->> 'site_url') || '/auth/confirm');
begin
  if v_action = 'email_change' and v_token_new is not null then
    -- Changing an existing address: a code for the current address and one for the new.
    perform public.dev_auth_email(v_email, v_action, v_token, v_hash, v_base);
    perform public.dev_auth_email(v_new_email, v_action, v_token_new, v_hash_new, v_base);
  elsif v_action = 'email_change' then
    -- Adding an address (or only the new one needs confirming).
    perform public.dev_auth_email(coalesce(v_new_email, v_email), v_action, v_token, v_hash, v_base);
  else
    perform public.dev_auth_email(v_email, v_action, v_token, v_hash, v_base);
  end if;
  return '{}'::jsonb;
end;
$$;
