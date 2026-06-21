"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  Database,
  ArrowLeftRight,
  BarChart3,
  Bell,
  HelpCircle,
  List,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import {
  canAccessAnalytics,
  canAccessArchive,
  canAccessModels,
  canAccessTeams,
  canUpload,
  isAdministrator,
  roleLabel,
} from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandLogo } from "@/components/BrandLogo";

type NavItem = { href: string; label: string; icon: LucideIcon };

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const admin = isAdministrator(user.role);
  const analyticsOnly = user.role === "analytics" && !admin;

  const databaseNav: NavItem = { href: "/database", label: "Database", icon: Database };

  const clinicalWork: NavItem[] = analyticsOnly
    ? []
    : [
        { href: "/", label: "Worklist", icon: List },
        databaseNav,
        ...(canUpload(user.role) ? [{ href: "/upload", label: "Upload Scan", icon: Upload }] : []),
        { href: "/compare", label: "Compare", icon: ArrowLeftRight },
        ...(canAccessArchive(user.role) ? [{ href: "/archive", label: "Archive", icon: Archive }] : []),
      ];

  const systemNav: NavItem[] = analyticsOnly
    ? [databaseNav, { href: "/analytics", label: "Analytics", icon: BarChart3 }]
    : [
        ...(canAccessTeams(user.role)
          ? [{ href: "/departments", label: "Teams", icon: Users }]
          : []),
        { href: "/notifications", label: "Alerts", icon: Bell },
        ...(canAccessAnalytics(user.role)
          ? [{ href: "/analytics", label: "Analytics", icon: BarChart3 }]
          : []),
        ...(canAccessModels(user.role)
          ? [{ href: "/ai-models", label: "Models", icon: HelpCircle }]
          : []),
      ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="min-w-0 flex-1">
          <BrandLogo className="h-11" priority />
          <p className="sidebar-brand-sub mt-1">{roleLabel(user.role)}</p>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main menu">
        {clinicalWork.length > 0 && <NavGroup label="Work" items={clinicalWork} pathname={pathname} />}
        <NavGroup
          label={analyticsOnly ? "Operations" : admin ? "Administration" : "System"}
          items={systemNav}
          pathname={pathname}
        />
      </nav>

      <div className="sidebar-footer">
        <ThemeToggle />
        <div className="sidebar-user">
          <p className="truncate text-sm font-medium">{user.full_name}</p>
          {user.department && (
            <p className="truncate text-xs capitalize text-muted">{user.department}</p>
          )}
        </div>
      </div>
    </aside>
  );
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div className="sidebar-group">
      <p className="nav-section-label">{label}</p>
      <ul className="sidebar-group-list">
        {items.map(({ href, label: itemLabel, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          const isUpload = href === "/upload";
          return (
            <li key={href}>
              <Link
                href={href}
                className={clsx(
                  "nav-link",
                  active && "nav-link-active",
                  isUpload && !active && "nav-link-accent"
                )}
              >
                <Icon className="nav-link-icon" strokeWidth={1.75} />
                <span className="truncate">{itemLabel}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
