import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
  cn,
  Button,
} from "@repo/ui";
import { Sun, Moon, Monitor } from "lucide-react";

import { Link } from "react-router";
import { Outlet } from "react-router";
import { useTheme } from "./ThemeProvider.js";

const themeIcons = { dark: Moon, light: Sun, system: Monitor } as const;
const themeCycle: Array<"light" | "dark" | "system"> = [
  "light",
  "dark",
  "system",
];

export default function Layout() {
  const { theme, setTheme } = useTheme();
  const Icon = themeIcons[theme as keyof typeof themeIcons];

  return (
    <div className={cn("p-8")}>
      <header className="flex items-center justify-between">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink
                asChild
                className={navigationMenuTriggerStyle()}
              >
                <Link to="/booking">New Booking</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            const nextIndex =
              (themeCycle.indexOf(theme as (typeof themeCycle)[number]) + 1) %
              themeCycle.length;
            setTheme(themeCycle[nextIndex]);
          }}
          aria-label="Toggle theme"
        >
          <Icon className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      </header>
      <main>
        <Outlet />
      </main>
      <footer>
        <p>Copyright 2026</p>
      </footer>
    </div>
  );
}
