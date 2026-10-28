-- Our team can take a worker off a booking (one at risk, or a worker on
-- hold) or set aside a no-show that shouldn't count. Neither side is held
-- to it: no reliability penalty for the worker, no charge for the business.
-- A new value can't be used in the transaction that adds it, so the
-- functions that use it are in the next migration.
alter type public.assignment_status add value 'cancelled_by_admin';
