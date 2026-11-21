import type { Role } from "@/server/auth/session";

export type NavItem = { href: string; label: string; icon: string };

/** label — ключ в nav.* */
export const NAV: Record<Role, NavItem[]> = {
  STUDENT: [
    { href: "/student", label: "dashboard", icon: "home" },
    { href: "/student/learn", label: "learn", icon: "book" },
    { href: "/student/exam", label: "exam", icon: "timer" },
    { href: "/student/mistakes", label: "mistakes", icon: "x" },
    { href: "/student/stats", label: "stats", icon: "chart" },
    { href: "/student/mentor", label: "mentor", icon: "bot" },
    { href: "/student/certificate", label: "certificate", icon: "award" },
  ],
  TEACHER: [
    { href: "/teacher", label: "classes", icon: "home" },
    { href: "/teacher/accounts", label: "createAccounts", icon: "userplus" },
    { href: "/teacher/review", label: "review", icon: "check" },
  ],
  PARENT: [{ href: "/parent", label: "children", icon: "home" }],
  ADMIN: [
    { href: "/admin", label: "dashboard", icon: "home" },
    { href: "/admin/users", label: "users", icon: "users" },
    { href: "/admin/import", label: "import", icon: "upload" },
    { href: "/admin/classes", label: "classes", icon: "school" },
    { href: "/admin/content", label: "content", icon: "book" },
    { href: "/admin/questions", label: "questions", icon: "list" },
    { href: "/teacher/review", label: "review", icon: "check" },
    { href: "/admin/exam", label: "examSetup", icon: "timer" },
    { href: "/admin/news", label: "news", icon: "news" },
    { href: "/admin/feedback", label: "feedback", icon: "message" },
    { href: "/admin/settings", label: "settings", icon: "settings" },
  ],
};
