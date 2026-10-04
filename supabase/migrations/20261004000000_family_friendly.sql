-- STKD family-friendly filter. Blocks profanity/slurs in public text at the database level,
-- so it can't be bypassed by calling the API directly. Keep in sync with src/profanity.js.

create or replace function public.has_profanity(t text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  s text;
  roots constant text := 'f+u+c+k|f+u+k+|sh+it|b+i+t+c+h|c+u+n+t|tw+a+t|w+a+n+k|wh+o+r+e|sl+u+t|p+o+r+n|n+i+g+g|f+a+g+o+t|f+a+g+g|r+e+t+a+r+d|m+o+t+h+e+r+f|a+s+s+h+o+l|d+i+c+k+h+e+a+d|orospu|siktir|yarrak|amina|klootzak|godverdom|hoer';
  words constant text := 'ass|asses|arse|bastard|bastards|cock|cocks|pussy|pussies|fag|fags|kys|rape|rapist|nude|nudes|amk|aq|sik|kut|lul|tering';
begin
  if t is null or t = '' then
    return false;
  end if;
  -- lowercase, Turkish letters -> ascii, leetspeak -> letters
  s := translate(lower(t), 'çğıöşü013457@$!', 'cgiosuoieastasi');
  -- join spaced-out letters: "f u c k" / "f.u.c.k" -> "fuck"
  s := regexp_replace(s, '\m([a-z])[^a-z]+(?=[a-z]\M)', '\1', 'g');
  return exists (
    select 1
    from regexp_split_to_table(s, '[^a-z]+') as w
    where w <> ''
      and w ~ ('^(?:(?:' || roots || ').*|(?:' || words || '))$')
  );
end;
$$;

create or replace function public.enforce_family_friendly()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  col text;
begin
  foreach col in array tg_argv loop
    if public.has_profanity(to_jsonb(new) ->> col) then
      raise exception 'STKD_FAMILY_FRIENDLY'
        using errcode = 'check_violation', detail = format('Blocked word in %s', col);
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists takes_family_friendly on public.takes;
create trigger takes_family_friendly
  before insert or update on public.takes
  for each row execute function public.enforce_family_friendly('text', 'media_title');

drop trigger if exists ratings_family_friendly on public.ratings;
create trigger ratings_family_friendly
  before insert or update of comment on public.ratings
  for each row execute function public.enforce_family_friendly('comment');

drop trigger if exists profiles_family_friendly on public.profiles;
create trigger profiles_family_friendly
  before insert or update of handle, display_name, bio on public.profiles
  for each row execute function public.enforce_family_friendly('handle', 'display_name', 'bio');
