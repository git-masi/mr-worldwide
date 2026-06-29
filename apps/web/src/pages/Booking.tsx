import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import {
  Button,
  Calendar,
  Card,
  CardContent,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
} from "@repo/ui";
import { useAvailability } from "../hooks/useAvailability";

function isValidDateRange(checkIn: Date | null, checkOut: Date | null): boolean {
  if (!checkIn || !checkOut) return false;
  return checkIn < checkOut;
}

export default function Booking() {
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);

  const range: DateRange | undefined =
    checkIn && checkOut ? { from: checkIn, to: checkOut } : checkIn ? { from: checkIn } : undefined;

  const valid = isValidDateRange(checkIn, checkOut);
  const { data, isLoading, error } = useAvailability(
    valid ? checkIn : null,
    valid ? checkOut : null,
  );

  const handleSelect = (range: DateRange | undefined) => {
    if (!range) {
      setCheckIn(null);
      setCheckOut(null);
      return;
    }
    if (range.from && range.to) {
      setCheckIn(range.from);
      setCheckOut(range.to);
    } else if (range.from) {
      setCheckIn(range.from);
      setCheckOut(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-bold">Book a Room</h1>

        <div className="mb-8 flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-72 justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkIn && checkOut ? (
                  <>
                    {format(checkIn, "LLL dd, y")} —{" "}
                    {format(checkOut, "LLL dd, y")}
                  </>
                ) : (
                  <span>Select dates</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={range}
                onSelect={handleSelect}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {checkIn && checkOut && !valid && (
          <p className="mb-4 text-sm text-destructive">
            Check-out must be after check-in and cannot be the same day.
          </p>
        )}

        {isLoading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full rounded-t-xl" />
                <CardContent className="p-4">
                  <Skeleton className="mb-2 h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && !isLoading && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            Failed to load availability. Please try again.
          </div>
        )}

        {data && !isLoading && !error && (
          <>
            {data.length === 0 ? (
              <p className="text-muted-foreground">
                No hotels available for the selected dates.
              </p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {data.map((hotel) => (
                  <Card key={hotel.id} className="overflow-hidden">
                    <div className="relative aspect-video bg-muted">
                      <img
                        src={`https://picsum.photos/seed/${encodeURIComponent(hotel.name)}/400/200`}
                        alt={hotel.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://picsum.photos/400/200";
                        }}
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="mb-1 text-lg font-semibold">
                        {hotel.name}
                      </h3>
                      <p
                        className={
                          hotel.availableRooms === 0
                            ? "text-sm text-muted-foreground"
                            : "text-sm text-green-600"
                        }
                      >
                        {hotel.availableRooms === 0
                          ? "Sold out"
                          : `${hotel.availableRooms} room${hotel.availableRooms === 1 ? "" : "s"} available`}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
