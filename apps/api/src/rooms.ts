// Subtract rooms needs from total rooms to get available rooms
export function roomsNeeded<T extends { checkIn: Date; checkOut: Date }>(
  bookings: T[],
): number {
  if (bookings.length < 2) {
    return bookings.length;
  }

  // consider using `sort` instead of `toSorted` if performance matters
  // additionally, if you are willing to trust sorting to the DB this becomes unnecessary
  const sortedBookings = bookings.toSorted(
    (a, b) => a.checkIn.getTime() - b.checkIn.getTime(),
  );
  const buckets: T[][] = [];

  for (const booking of sortedBookings) {
    const idx = buckets.findIndex((bucket) => {
      const lastBooking = bucket.at(-1);

      if (!lastBooking) {
        return false;
      }

      const isOnOrBefore =
        booking.checkIn.getTime() - lastBooking.checkOut.getTime() >= 0;

      return isOnOrBefore;
    });

    if (idx === -1) {
      buckets.push([booking]);
    } else {
      buckets[idx]!.push(booking);
    }
  }

  return buckets.length;
}
