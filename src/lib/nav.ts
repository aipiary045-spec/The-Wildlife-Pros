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

export type NavItem = { href: string; label: string; icon: LucideIcon; description?: string };

export type NavGroup = { title: string; items: NavItem[] };

export const NAV_ITEMS: NavItem[] = [
  { href: "/schedule", label: "Schedule", icon: CalendarDays, description: "Place jobs on a technician and a time." },
  { href: "/clients", label: "Clients", icon: Users, description: "Names, phones, and service addresses." },
  { href: "/jobs", label: "Work orders", icon: ClipboardList, description: "The file for every job." },
  { href: "/calls", label: "Call log", icon: Phone, description: "Log a call, then start a quote or a first trip." },
  { href: "/quotes", label: "Quotes", icon: FileText, description: "Estimates waiting on the client." },
  { href: "/invoices", label: "Invoices", icon: Receipt, description: "What we billed and what is still unpaid." },
  { href: "/reports", label: "Reports", icon: BarChart3, description: "Payments, open work, and labor hours." },
  { href: "/routes", label: "Routes", icon: MapPinned, description: "Driving order for the day." },
  { href: "/timesheets", label: "Timesheets", icon: Clock, description: "Hours by person." },
  { href: "/time-off", label: "Time off", icon: CalendarOff, description: "Requested and approved days off." },
  { href: "/team", label: "Team", icon: HardHat, description: "Logins and roles." },
  { href: "/inventory", label: "Traps & gear", icon: Warehouse, description: "What is in the shop and what is in the field." },
  { href: "/activity", label: "Species log", icon: Squirrel, description: "Captures and dispositions." },
  { href: "/exports", label: "Google Sheets", icon: FileSpreadsheet, description: "Spreadsheet export of the books." },
  { href: "/field", label: "Field route", icon: Smartphone, description: "Today's stops in driving order." },
];

const OFFICE_SIDEBAR_GROUPS: Array<{ title: string; hrefs: string[] }> = [
  { title: "Day to day", hrefs: ["/schedule", "/clients", "/jobs", "/calls"] },
  { title: "Money", hrefs: ["/quotes", "/invoices", "/reports"] },
  { title: "Team", hrefs: ["/timesheets", "/time-off", "/team"] },
  { title: "Field", hrefs: ["/routes", "/inventory", "/activity", "/exports"] },
];

const OFFICE_MORE_GROUPS: Array<{ title: string; hrefs: string[] }> = [
  { title: "Daily office", hrefs: ["/calls", "/quotes", "/invoices"] },
  { title: "Business", hrefs: ["/reports", "/routes", "/exports"] },
  { title: "Team", hrefs: ["/timesheets", "/time-off", "/team"] },
  { title: "Field records", hrefs: ["/inventory", "/activity"] },
];

const TECH_SIDEBAR_GROUPS: Array<{ title: string; hrefs: string[] }> = [
  { title: "Today", hrefs: ["/field", "/jobs", "/timesheets"] },
  { title: "Also on this phone", hrefs: ["/time-off", "/inventory", "/activity"] },
];

const TECH_MORE_GROUPS: Array<{ title: string; hrefs: string[] }> = [
  { title: "Also on this phone", hrefs: ["/time-off", "/inventory", "/activity"] },
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
    { href: "/jobs", label: "Jobs", icon: ClipboardList },
    { href: "/more", label: "More", icon: Menu },
  ];
}

export function navForRole(role: string): NavItem[] {
  if (isTechnician(role)) {
    return [
      { href: "/field", label: "My route", icon: Smartphone, description: "Today's stops in driving order." },
      { href: "/jobs", label: "My jobs", icon: ClipboardList, description: "Assigned work, including leftovers." },
      { href: "/timesheets", label: "Clock & hours", icon: Clock, description: "Clock in and see hours by day." },
      { href: "/time-off", label: "Time off", icon: CalendarOff, description: "Ask for a day off." },
      { href: "/inventory", label: "Traps & gear", icon: Warehouse, description: "What is in the shop and what is in the field." },
      { href: "/activity", label: "Species log", icon: Squirrel, description: "Captures and dispositions." },
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

function groupedFrom(catalog: NavItem[], groups: Array<{ title: string; hrefs: string[] }>): NavGroup[] {
  const byHref = new Map(catalog.map((item) => [item.href, item]));
  return groups
    .map((group) => ({
      title: group.title,
      items: group.hrefs.map((href) => byHref.get(href)).filter((item): item is NavItem => Boolean(item)),
    }))
    .filter((group) => group.items.length > 0);
}

export function sidebarGroups(role: string): NavGroup[] {
  return groupedFrom(navForRole(role), isTechnician(role) ? TECH_SIDEBAR_GROUPS : OFFICE_SIDEBAR_GROUPS);
}

export function moreGroups(role: string): NavGroup[] {
  return groupedFrom(moreItems(role), isTechnician(role) ? TECH_MORE_GROUPS : OFFICE_MORE_GROUPS);
}

export function pathMatches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isMoreDestination(pathname: string, role: string) {
  if (pathname === "/more") return true;
  return moreItems(role).some((item) => pathMatches(pathname, item.href));
}

export function pageLabel(pathname: string, role: string) {
  if (pathname === "/more") return "More";
  if (pathMatches(pathname, "/quotes/pricing")) return "Price list";
  const catalog = [...navForRole(role), ...primaryTabs(role)];
  const match = catalog
    .filter((item) => pathMatches(pathname, item.href))
    .sort((left, right) => right.href.length - left.href.length)[0];
  return match?.label ?? "The Wildlife Pros";
}
