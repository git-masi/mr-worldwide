import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
  cn,
} from "@repo/ui";

import { Link } from "react-router";
import { Outlet } from "react-router";

export default function Layout() {
  return (
    <div className={cn("p-8")}>
      <header>
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
