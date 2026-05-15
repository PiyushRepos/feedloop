import { Link } from "react-router";
import { LayoutDashboard, LogOut, Menu, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Menu as DropdownMenu,
  MenuTrigger,
  MenuPopup,
  MenuItem,
  MenuSeparator,
  MenuGroupLabel,
} from "@/components/ui/menu";
import { useAuth } from "@/context/auth";
import { useLogout } from "@/api/auth";
import React from "react";
import { cn } from "@/lib/utils";

const menuItems = [
  { name: "Explore", href: "/explore" },
  { name: "Pricing", href: "#pricing" },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const Navbar = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const { user, isAuthenticated } = useAuth();
  const { mutate: logout } = useLogout();

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header>
      <nav
        data-state={menuState && "active"}
        className={cn(
          "fixed z-20 w-full transition-all duration-300",
          isScrolled
            ? "bg-background/80 border-b border-border backdrop-blur-lg"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-5 lg:gap-0">
            <div className="flex w-full justify-between gap-6 lg:w-auto">
              <Link
                to="/"
                aria-label="home"
                className={cn(
                  "flex items-center font-semibold text-sm transition-colors duration-300",
                  isScrolled ? "text-foreground" : "text-white",
                )}
              >
                feedloop
              </Link>
              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? "Close Menu" : "Open Menu"}
                className={cn(
                  "relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 transition-colors duration-300 lg:hidden",
                  isScrolled ? "text-foreground" : "text-white",
                )}
              >
                <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
              </button>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-1">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link to={item.href} />}
                      className={cn(
                        "transition-colors duration-300",
                        !isScrolled && "text-white/80 hover:text-white hover:bg-white/10",
                      )}
                    >
                      {item.name}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-background in-data-[state=active]:block lg:in-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-3 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Link
                        to={item.href}
                        className="text-muted-foreground hover:text-accent-foreground block duration-150"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {isAuthenticated && user ? (
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    render={<Link to="/poll/create" />}
                    className={cn(
                      "transition-colors duration-300",
                      !isScrolled && "bg-white text-black hover:bg-white/90 border-transparent",
                    )}
                  >
                    <Plus className="size-3.5" />
                    New poll
                  </Button>
                  <DropdownMenu>
                    <MenuTrigger className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <Avatar>
                        <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
                      </Avatar>
                    </MenuTrigger>
                    <MenuPopup align="end" sideOffset={8}>
                      <MenuGroupLabel>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-foreground text-sm font-medium leading-none">
                            {user.displayName}
                          </span>
                          <span className="text-muted-foreground text-xs font-normal">
                            {user.email}
                          </span>
                        </div>
                      </MenuGroupLabel>
                      <MenuSeparator />
                      <MenuItem render={<Link to="/dashboard" />}>
                        <LayoutDashboard />
                        Dashboard
                      </MenuItem>
                      <MenuItem render={<Link to="/poll/create" />}>
                        <Plus />
                        New poll
                      </MenuItem>
                      <MenuSeparator />
                      <MenuItem variant="destructive" onClick={() => logout()}>
                        <LogOut />
                        Log out
                      </MenuItem>
                    </MenuPopup>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                  <Button
                    variant="ghost"
                    size="sm"
                    render={<Link to="/login" />}
                    className={cn(
                      "transition-colors duration-300",
                      !isScrolled && "text-white/80 hover:text-white hover:bg-white/10",
                    )}
                  >
                    Login
                  </Button>
                  <Button
                    size="sm"
                    render={<Link to="/register" />}
                    className={cn(
                      "transition-colors duration-300",
                      !isScrolled && "bg-white text-black hover:bg-white/90 border-transparent",
                    )}
                  >
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
