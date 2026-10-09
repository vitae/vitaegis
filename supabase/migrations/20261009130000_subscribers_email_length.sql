-- Match the server's EMAIL_MAX_LENGTH (RFC 5321) so a crafted request cannot store an
-- arbitrarily long "email".
alter table public.subscribers
  add constraint subscribers_email_length check (char_length(email) <= 254);
