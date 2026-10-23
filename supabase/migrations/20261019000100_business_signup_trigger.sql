do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('user', 'business_owner', 'admin');
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_metadata jsonb := new.raw_user_meta_data;
  account_role public.app_role := 'user'::public.app_role;
  business_name text;
  business_category_id uuid;
  business_slug text;
begin
  if user_metadata ->> 'account_type' = 'business_owner' then
    account_role := 'business_owner'::public.app_role;
    business_name := nullif(btrim(user_metadata ->> 'business_name'), '');

    if business_name is null then
      raise exception 'Business name is required for business registration';
    end if;

    begin
      business_category_id := nullif(user_metadata ->> 'category_id', '')::uuid;
    exception
      when invalid_text_representation then
        raise exception 'A valid business category is required';
    end;

    if business_category_id is null or not exists (
      select 1
      from public.categories
      where id = business_category_id
    ) then
      raise exception 'A valid business category is required';
    end if;
  end if;

  insert into public.profiles (id, full_name, phone, avatar_url, role)
  values (
    new.id,
    nullif(btrim(user_metadata ->> 'full_name'), ''),
    nullif(btrim(user_metadata ->> 'phone'), ''),
    nullif(user_metadata ->> 'avatar_url', ''),
    account_role
  );

  if account_role = 'business_owner'::public.app_role then
    business_slug := coalesce(
      nullif(trim(both '-' from regexp_replace(lower(business_name), '[^a-z0-9]+', '-', 'g')), ''),
      'business'
    ) || '-' || left(new.id::text, 8);

    insert into public.businesses (
      name,
      slug,
      category_id,
      owner_id,
      phone,
      public_email,
      source,
      verification_status,
      record_status,
      is_published
    )
    values (
      business_name,
      business_slug,
      business_category_id,
      new.id,
      nullif(btrim(user_metadata ->> 'business_phone'), ''),
      new.email,
      'business_registration'::public.business_source,
      'pending'::public.business_verification_status,
      'pending'::public.business_record_status,
      false
    );
  end if;

  return new;
end;
$$;

do $$
declare
  existing_trigger record;
begin
  for existing_trigger in
    select trigger_row.tgname
    from pg_trigger as trigger_row
    where trigger_row.tgrelid = 'auth.users'::regclass
      and trigger_row.tgfoid = 'public.handle_new_user()'::regprocedure
      and not trigger_row.tgisinternal
  loop
    execute format('drop trigger %I on auth.users', existing_trigger.tgname);
  end loop;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();