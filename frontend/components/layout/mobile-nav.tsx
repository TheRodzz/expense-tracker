"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Menu, LayoutDashboard, Receipt, Tags, CreditCard, BarChart3, LogOut, User, PlusCircle } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Expenses",
    href: "/expenses",
    icon: Receipt,
  },
  {
    title: "Categories",
    href: "/categories",
    icon: Tags,
  },
  {
    title: "Payment Methods",
    href: "/payment-methods",
    icon: CreditCard,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { logout, user } = useAuth()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col">
        <SheetHeader className="text-left border-b pb-4">
          <SheetTitle className="flex items-center">
            <Receipt className="h-5 w-5 mr-2 text-primary" />
            ExpenseTracker
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-auto py-4">
          <nav className="grid gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                )}
              >
                <item.icon className="mr-2 h-5 w-5" />
                {item.title}
              </Link>
            ))}
          </nav>

          <div className="mt-4">
            <Button variant="outline" className="w-full justify-start" asChild onClick={() => setOpen(false)}>
              <Link href="/expenses?action=add">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Transaction
              </Link>
            </Button>
          </div>
        </div>

        <SheetFooter className="flex-col items-stretch gap-2 sm:flex-col sm:items-stretch border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium truncate max-w-[180px]">{user?.email || "Not logged in"}</span>
            </div>
            <ThemeToggle />
          </div>

          {user && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                logout()
                setOpen(false)
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
