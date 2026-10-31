-- A worker's words for businesses (bio, application notes): the same
-- rules as src/domain/worker-words.ts, so keep the examples in step.
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

select ok(
  public.worker_words_ok('Worked for a restoration company from 2018-2022 and 2023 to now.')
    and public.worker_words_ok('Did 2,000 hours of strip-out work, e.g. kitchens and bathrooms.')
    and public.worker_words_ok('Level 2 first aid. ABN 12 345 678 901 is not a phone number.')
    and public.worker_words_ok(null),
  'ordinary words about experience are fine, years and all'
);

select ok(
  public.worker_words_ok(repeat('a', 300)) and public.worker_words_ok(repeat('👍', 300))
    and not public.worker_words_ok(repeat('a', 301)),
  'up to 300 characters, counting emoji once'
);

select ok(
  not public.worker_words_ok('Call me on 0412 345 678')
    and not public.worker_words_ok('ring 0412345678')
    and not public.worker_words_ok('+61 412 345 678 any time')
    and not public.worker_words_ok('(02) 9876 5432')
    and not public.worker_words_ok('0412-345-678')
    and not public.worker_words_ok('0412.345.678')
    and not public.worker_words_ok('1300 123 456')
    and not public.worker_words_ok('13 14 50'),
  'no phone numbers, however they''re written'
);

select ok(
  public.worker_words_ok(repeat('a', 500), 500) and not public.worker_words_ok(repeat('a', 501), 500),
  'a bio runs to 500'
);

select ok(
  not public.worker_words_ok('sam.lee@example.com'),
  'no email addresses'
);

select ok(
  not public.worker_words_ok('See https://example.org/me')
    and not public.worker_words_ok('my site www.samlee.dev')
    and not public.worker_words_ok('samlee.com.au has photos'),
  'no links'
);

select * from finish();
rollback;
