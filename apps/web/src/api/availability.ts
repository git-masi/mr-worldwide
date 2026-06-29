export interface HotelAvailability {
  id: string;
  name: string;
  availableRooms: number;
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export async function fetchAvailability(
  checkIn: Date,
  checkOut: Date,
): Promise<HotelAvailability[]> {
  const params = new URLSearchParams({
    checkIn: formatDate(checkIn),
    checkOut: formatDate(checkOut),
  });
  const res = await fetch(`/v4/availability?${params}`);
  if (!res.ok) throw new Error("Failed to fetch availability");
  return res.json();
}
