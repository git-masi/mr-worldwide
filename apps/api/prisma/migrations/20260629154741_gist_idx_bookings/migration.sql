-- Create the btree_gist extension to support GiST indexing
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Create the GiST index using a half open daterange
CREATE INDEX IF NOT EXISTS gist_idx_bookings_check_in_check_out
ON bookings USING GIST(daterange(check_in, check_out, '[)'));
