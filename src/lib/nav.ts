import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ClipboardList,
  Clock,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  MapPinned,
  Menu,
  Receipt,
  ShieldCheck,
  Smartphone,
  Squirrel,
  Users,
  Warehouse,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/jobs", label: "Jobs", icon: ClipboardList },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/routes", label: "Routes", icon: MapPinned },
  { href: "/timesheets", label: "Timesheets", icon: Clock },
  { href: "/inventory", label: "Traps & gear", icon: Warehouse },
  { href: "/activity", label: "Species log", icon: Squirrel },
  { href: "/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/exports", label: "Google Sheets", icon: FileSpreadsheet },
  { href: "/field", label: "Field route", icon: Smartphone },
];

export function primaryTabs(role: string): NavItem[] {
  if (role === "TECHNICIAN") {
    return [
      { href: "/field", label: "Route", icon: Smartphone },
      { href: "/schedule", label: "Board", icon: CalendarDays },
      { href: "/jobs", label: "Jobs", icon: ClipboardList },
      { href: "/timesheets", label: "Time", icon: Clock },
      { href: "/more", label: "More", icon: Menu },
    ];
  }
  return [
    { href: "/dashboard", label: "Today", icon: LayoutDashboard },
    { href: "/schedule", label: "Board", icon: CalendarDays },
    { href: "/jobs", label: "Jobs", icon: ClipboardList },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/more", label: "More", icon: Menu },
  ];
}

export function moreItems(role: string) {
  const tabs = new Set(primaryTabs(role).map((item) => item.href));
  return NAV_ITEMS.filter((item) => !tabs.has(item.href));
}
