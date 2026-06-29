type Booking =
  | { checkIn: Date; checkOut: Date }
  | { checkIn: string; checkOut: string };

// Subtract rooms needed from total rooms to get available rooms
export function roomsNeeded(bookings: Booking[]): number {
  if (bookings.length < 2) {
    return bookings.length;
  }

  // consider using `sort` instead of `toSorted` if performance matters
  // additionally, if you are willing to trust sorting to the DB this becomes unnecessary
  const sortedBookings = bookings.toSorted((a, b) => {
    return compare(a.checkIn, b.checkIn);
  });
  const buckets: Booking[][] = [];

  for (const booking of sortedBookings) {
    const idx = buckets.findIndex((bucket) => {
      const lastBooking = bucket.at(-1);

      if (!lastBooking) {
        return false;
      }

      const isOnOrBefore = compare(booking.checkIn, lastBooking.checkOut) >= 0;

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

function compare(a: string | Date, b: string | Date): number {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b);
  }

  throw new Error("cannot compare mismatched values");
}
