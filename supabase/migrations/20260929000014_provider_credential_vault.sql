-- R1. A BYOK credential is a secret, not a string in a table.
--
-- provider_connection.credential_ref now holds a Vault secret ID rather than the
-- key itself. Reading the plaintext goes through fn_provider_credential, which is
-- SECURITY DEFINER and checks ownership, so a reader can only ever decrypt their
-- own credential — and the vault schema itself is not reachable by the API roles.

create or replace function public.fn_put_provider_credential(
  p_provider text,
  p_secret text,
  p_model text default null
) returns uuid
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_conn_id uuid;
  v_ref text;
  v_secret_id uuid;
  v_name text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if coalesce(btrim(p_secret), '') = '' then
    raise exception 'empty credential' using errcode = '22023';
  end if;

  v_name := 'jeralis:provider:' || p_provider || ':' || v_uid::text;

  select id, credential_ref into v_conn_id, v_ref
  from public.provider_connection
  where user_id = v_uid and provider = p_provider;

  -- A ref only counts as a Vault pointer if it parses as one. Anything else is a
  -- legacy plaintext value and gets replaced rather than trusted.
  begin
    v_secret_id := v_ref::uuid;
  exception when others then
    v_secret_id := null;
  end;

  if v_conn_id is null then
    v_secret_id := vault.create_secret(p_secret, v_name, 'Jeralis BYOK credential');
    insert into public.provider_connection (user_id, provider, credential_ref, model, is_default)
    values (v_uid, p_provider, v_secret_id::text, p_model, true)
    returning id into v_conn_id;
  elsif v_secret_id is null then
    v_secret_id := vault.create_secret(p_secret, v_name, 'Jeralis BYOK credential');
    update public.provider_connection
      set credential_ref = v_secret_id::text, model = coalesce(p_model, model)
      where id = v_conn_id;
  else
    perform vault.update_secret(v_secret_id, p_secret);
    update public.provider_connection
      set model = coalesce(p_model, model)
      where id = v_conn_id;
  end if;

  -- Exactly one default connection per reader.
  update public.provider_connection
    set is_default = (id = v_conn_id)
    where user_id = v_uid;

  return v_conn_id;
end;
$$;

create or replace function public.fn_provider_credential(p_connection_id uuid)
returns text
language sql
security definer
set search_path = public, vault, pg_temp
as $$
  select ds.decrypted_secret
  from public.provider_connection pc
  join vault.decrypted_secrets ds on ds.id = pc.credential_ref::uuid
  where pc.id = p_connection_id
    and pc.user_id = auth.uid()
    and pc.credential_ref ~ '^[0-9a-fA-F-]{36}$';
$$;

revoke all on function public.fn_put_provider_credential(text, text, text) from public;
revoke all on function public.fn_provider_credential(uuid) from public;
grant execute on function public.fn_put_provider_credential(text, text, text) to authenticated;
grant execute on function public.fn_provider_credential(uuid) to authenticated;

comment on column public.provider_connection.credential_ref is
  'Vault secret id. Never the credential itself.';
-- Deleting a connection must delete the secret, not orphan it in the vault.
create or replace function public.fn_delete_provider_credential(p_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_ref text;
  v_secret uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select credential_ref into v_ref
  from public.provider_connection
  where id = p_connection_id and user_id = v_uid;

  if v_ref is null then
    return;
  end if;

  begin
    v_secret := v_ref::uuid;
  exception when others then
    v_secret := null;
  end;

  delete from public.provider_connection where id = p_connection_id and user_id = v_uid;

  if v_secret is not null then
    delete from vault.secrets where id = v_secret;
  end if;
end;
$$;

revoke all on function public.fn_delete_provider_credential(uuid) from public;
grant execute on function public.fn_delete_provider_credential(uuid) to authenticated;
