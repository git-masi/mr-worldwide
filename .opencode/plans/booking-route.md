# Booking Route Implementation

## 1. `packages/ui/src/index.ts` — Export all components

```ts
export { cn } from "./lib/utils.js"
export { Button, buttonVariants } from "./components/ui/button.js"
export { Calendar, CalendarDayButton } from "./components/ui/calendar.js"
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "./components/ui/card.js"
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from "./components/ui/popover.js"
export { Skeleton } from "./components/ui/skeleton.js"
```

## 2. `apps/web/vite.config.ts` — Add proxy

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/v4': 'http://localhost:1337',
    },
  },
})
```

## 3. `apps/web/tailwind.config.ts` — Add `tailwindcss-animate` plugin

Add `"tailwindcss-animate"` to the `plugins` array in the tailwind config:
```ts
plugins: [require("tailwindcss-animate")],
```

## 4. `apps/web/src/App.tsx` — Set up routing

```tsx
import { Routes, Route } from "react-router";
import Booking from "./pages/Booking";

function App() {
  return (
    <Routes>
      <Route path="/booking" element={<Booking />} />
    </Routes>
  );
}

export default App;
```

## 5. `apps/web/src/api/availability.ts` — API types and fetch function

```ts
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
  checkOut: Date
): Promise<HotelAvailability[]> {
  const params = new URLSearchParams({
    checkIn: formatDate(checkIn),
    checkOut: formatDate(checkOut),
  });
  const res = await fetch(`/v4/availability?${params}`);
  if (!res.ok) throw new Error("Failed to fetch availability");
  return res.json();
}
```

## 6. `apps/web/src/hooks/useAvailability.ts` — React Query hook

```ts
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
```

## 7. `apps/web/src/pages/Booking.tsx` — The Booking component

```tsx
import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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
import type { DayPickerRangeProps } from "react-day-picker";

function isValidDateRange(checkIn: Date | null, checkOut: Date | null): boolean {
  if (!checkIn || !checkOut) return false;
  return checkIn < checkOut;
}

export default function Booking() {
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);

  const range = checkIn && checkOut ? { from: checkIn, to: checkOut } : undefined;

  const valid = isValidDateRange(checkIn, checkOut);
  const { data, isLoading, error } = useAvailability(
    valid ? checkIn : null,
    valid ? checkOut : null
  );

  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
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
              <Button variant="outline" className="w-72 justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkIn && checkOut ? (
                  <>
                    {format(checkIn, "LLL dd, y")} — {format(checkOut, "LLL dd, y")}
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

        {/* Validation error */}
        {checkIn && checkOut && !valid && (
          <p className="mb-4 text-sm text-destructive">
            Check-out must be after check-in and cannot be the same day.
          </p>
        )}

        {/* Loading state */}
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

        {/* Error state */}
        {error && !isLoading && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            Failed to load availability. Please try again.
          </div>
        )}

        {/* Results */}
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
                      <h3 className="mb-1 text-lg font-semibold">{hotel.name}</h3>
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
```

## 8. `apps/web/src/main.tsx` — Add QueryClientProvider

Wrap the app with QueryClientProvider:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
```

## 9. Create directories

```
mkdir -p apps/web/src/pages apps/web/src/api apps/web/src/hooks
```
