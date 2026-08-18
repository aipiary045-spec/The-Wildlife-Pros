import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  CalendarOff,
  ClipboardList,
  Clock,
  FileSpreadsheet,
  FileText,
  HardHat,
  MapPinned,
  Menu,
  Phone,
  Receipt,
  Smartphone,
  Squirrel,
  Users,
  Warehouse,
} from "lucide-react";
import { isTechnician } from "@/lib/paths";
import { canManageTeam } from "@/lib/team";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/jobs", label: "Work orders", icon: ClipboardList },
  { href: "/requests", label: "Intake", icon: Phone },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/routes", label: "Routes", icon: MapPinned },
  { href: "/timesheets", label: "Timesheets", icon: Clock },
  { href: "/time-off", label: "Time off", icon: CalendarOff },
  { href: "/team", label: "Team", icon: HardHat },
  { href: "/inventory", label: "Traps & gear", icon: Warehouse },
  { href: "/activity", label: "Species log", icon: Squirrel },
  { href: "/exports", label: "Google Sheets", icon: FileSpreadsheet },
  { href: "/field", label: "Field route", icon: Smartphone },
];

export function primaryTabs(role: string): NavItem[] {
  if (isTechnician(role)) {
    return [
      { href: "/field", label: "Route", icon: Smartphone },
      { href: "/jobs", label: "Jobs", icon: ClipboardList },
      { href: "/timesheets", label: "Time", icon: Clock },
      { href: "/more", label: "More", icon: Menu },
    ];
  }
  return [
    { href: "/schedule", label: "Schedule", icon: CalendarDays },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/reports", label: "Reports", icon: BarChart3 },
    { href: "/more", label: "More", icon: Menu },
  ];
}

export function navForRole(role: string): NavItem[] {
  if (isTechnician(role)) {
    return [
      { href: "/field", label: "My route", icon: Smartphone },
      { href: "/jobs", label: "My jobs", icon: ClipboardList },
      { href: "/timesheets", label: "Clock & hours", icon: Clock },
      { href: "/time-off", label: "Time off", icon: CalendarOff },
      { href: "/inventory", label: "Traps & gear", icon: Warehouse },
      { href: "/activity", label: "Species log", icon: Squirrel },
    ];
  }
  return NAV_ITEMS.filter((item) => {
    if (item.href === "/team" && !canManageTeam(role)) return false;
    if (item.href === "/field") return false;
    return true;
  });
}

export function moreItems(role: string) {
  const tabs = new Set(primaryTabs(role).map((item) => item.href));
  return navForRole(role).filter((item) => !tabs.has(item.href));
}
