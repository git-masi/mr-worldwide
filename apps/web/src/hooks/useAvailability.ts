import { useQuery } from "@tanstack/react-query";
import { fetchAvailability } from "../api/availability";

export function useAvailability(checkIn: Date | null, checkOut: Date | null) {
  const enabled = checkIn !== null && checkOut !== null && checkIn < checkOut;
  return useQuery({
    queryKey: ["availability", checkIn, checkOut],
    queryFn: () => fetchAvailability(checkIn!, checkOut!),
    enabled,
  });
}
