import React, { useState, useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import {
  LayoutDashboard,
  CheckSquare,
  Megaphone,
  Bell,
  Sun,
  Moon,
  LogOut,
  X,
  PlusCircle,
  CheckCircle2,
  Calendar,
  Trash2,
  ShoppingBag,
  Package,
  Truck,
  TrendingUp,
  Briefcase,
  FileText,
  DollarSign,
  Menu,
  MessageSquare,
  User,
} from "./ui/solar-icons";
import {
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface LayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  setCurrentTab,
  children,
}) => {
  const {
    user,
    logout,
    theme,
    toggleTheme,
    notifications,
    markNotificationsRead,
    createAnnouncement,
    users,
    activeStaffProfile,
    setActiveStaffProfile,
  } = useStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [announcementMsg, setAnnouncementMsg] = useState("");
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => {
    if (n.recipient === null) {
      // Global system announcement - check if user ID is in readBy list
      return !n.readBy.includes(user?._id || "");
    }
    return !n.read;
  }).length;

  const handleMarkAllRead = () => {
    markNotificationsRead();
  };

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementMsg.trim()) return;
    createAnnouncement(announcementMsg);
    setAnnouncementMsg("");
    setShowAnnouncementModal(false);
  };

  const navigationCategories = [
    {
      title: "Core",
      items: [
        { id: "overview", label: "Dashboard", icon: LayoutDashboard },
        { id: "calendar", label: "Calendar", icon: Calendar },
        { id: "tasks", label: "Tasks Board", icon: CheckSquare },
        { id: "field-notes", label: "Field Notes", icon: FileText },
        {
          id: "staff-management",
          label: user?.role === "admin" ? "Staff Management" : "Attendance",
          icon: User,
        },
      ],
    },
    {
      title: "Operations",
      items: [
        { id: "orders", label: "Orders", icon: Package },
        { id: "order-progress", label: "Order Progress", icon: Truck },
        { id: "inventory", label: "Inventory", icon: Package },
      ],
    },
    ...(user?.role === "admin"
      ? [
          {
            title: "Finance & Sales",
            items: [
              { id: "sales", label: "Sales Ledger", icon: TrendingUp },
              { id: "expenses", label: "Expenses Log", icon: DollarSign },
              { id: "purchase", label: "Purchases", icon: Briefcase },
              { id: "quotation", label: "Quotations", icon: FileText },
            ],
          },
          {
            title: "Management",
            items: [
              { id: "products", label: "Shop Catalog", icon: ShoppingBag },
              { id: "bin", label: "Trash Bin", icon: Trash2 },
            ],
          },
        ]
      : []),
  ];


  return (
    <div className="h-screen flex bg-background text-foreground transition-colors duration-300 overflow-hidden font-sans">
      {/* DESKTOP ASIDE (SIDEBAR) */}
      <aside
        className={`hidden md:flex flex-col bg-card border-r border-border/70 transition-[width] duration-300 ease-in-out h-screen select-none relative z-30 overflow-hidden ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        {/* Top Header of Aside: Brand Logo + Sidebar Toggle (No horizontal line) */}
        <div
          className={`flex items-center py-5 transition-all duration-300 ease-in-out ${
            sidebarOpen ? "justify-between px-5" : "justify-center px-0 w-full"
          }`}
        >
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2 overflow-hidden shrink-0">
                <img
                  src="/admin/logo/ktm%20decor.svg"
                  alt="KTM DECOR"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px] shrink-0 rounded-2xl border border-border/70 shadow-xs object-cover dark:invert dark:hue-rotate-180 transition-all duration-300 ease-in-out"
                />
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-muted hover:text-foreground transition-all duration-300 ease-in-out cursor-pointer shrink-0"
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
              >
                <ChevronLeft size={20} strokeWidth={2.8} />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 w-full">
              <img
                src="/admin/logo/ktm%20decor.svg"
                alt="KTM DECOR"
                className="w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px] shrink-0 rounded-2xl border border-border/70 shadow-xs object-cover dark:invert dark:hue-rotate-180 transition-all duration-300 ease-in-out"
              />
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-muted hover:text-foreground transition-all duration-300 ease-in-out cursor-pointer"
                title="Expand Sidebar"
                aria-label="Expand Sidebar"
              >
                <ChevronRight size={20} strokeWidth={2.8} />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Items List */}
        <div className="flex-1 py-3 px-3 space-y-3 overflow-y-auto overflow-x-hidden">
          {navigationCategories.map((cat, catIdx) => (
            <div key={cat.title} className="space-y-1">
              {sidebarOpen ? (
                <div className="text-[10px] font-bold text-muted/50 uppercase tracking-widest px-3 mb-1 mt-3 first:mt-0 select-none transition-opacity duration-300 ease-in-out">
                  {cat.title}
                </div>
              ) : (
                catIdx > 0 && <div className="w-8 mx-auto border-t border-border/40 my-2" />
              )}
              {cat.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    style={
                      isActive
                        ? {
                            background:
                              "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)",
                          }
                        : undefined
                    }
                    className={`flex items-center rounded-2xl text-sm font-medium transition-all duration-300 ease-in-out group relative cursor-pointer ${
                      sidebarOpen
                        ? "w-full gap-3 px-3 py-2.5"
                        : "w-11 h-11 mx-auto justify-center p-0"
                    } ${
                      isActive
                        ? "text-black font-bold shadow-md shadow-orange-500/15"
                        : "text-muted hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                    }`}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <Icon
                      size={20}
                      className={`shrink-0 transition-colors duration-200 ${
                        isActive
                          ? "text-black"
                          : "text-muted group-hover:text-foreground"
                      }`}
                    />
                    {sidebarOpen && (
                      <span className="truncate transition-all duration-300 ease-in-out opacity-100 max-w-[160px]">
                        {item.label}
                      </span>
                    )}

                    {/* Tooltip when collapsed */}
                    {!sidebarOpen && (
                      <div className="absolute left-full ml-3 px-2.5 py-1 bg-neutral-900 text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md">
                        {item.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom Section: User & Logout */}
        <div className={`p-3 ${!sidebarOpen ? "flex items-center justify-center" : ""}`}>
          {sidebarOpen ? (
            <div className="mt-1.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 border border-border/70 p-2.5 flex items-center justify-between gap-2.5 transition-all duration-300 ease-in-out hover:bg-neutral-200/60 dark:hover:bg-neutral-800 select-none">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-white dark:bg-neutral-800 p-1 border border-border/60 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                  {(user as any)?.avatar ? (
                    <img
                      src={(user as any).avatar}
                      alt={user?.name || "User"}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <img
                      src="/admin/logo/ktm%20decor.svg"
                      alt="KTM DECOR"
                      className="h-5 w-auto object-contain dark:invert dark:hue-rotate-180"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-muted font-medium block leading-none capitalize truncate">
                    {user?.role ? `${user.role}` : "Workspace"}
                  </span>
                  <span className="text-xs font-bold text-foreground block truncate leading-tight mt-1">
                    {user?.name || "KTM DECOR"}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                title="Logout"
                style={{
                  background: "linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)",
                }}
                className="h-9 w-9 rounded-xl flex items-center justify-center text-white shadow-sm shadow-red-500/25 hover:shadow-md hover:shadow-red-500/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shrink-0"
                aria-label="Logout"
              >
                <LogOut size={17} strokeWidth={2.4} className="text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={logout}
              title={`Logout (${user?.name || "User"})`}
              style={{
                background: "linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)",
              }}
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer mx-auto"
              aria-label="Logout"
            >
              <LogOut size={20} strokeWidth={2.4} className="text-white" />
            </button>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-background">
        {/* Top Utility Bar (Integrated into Content Header) */}
        <div className="px-5 sm:px-8 pt-5 pb-3 flex items-center justify-between gap-4 flex-shrink-0">
          {/* Left: Mobile hamburger menu trigger */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl border border-border bg-card text-muted hover:text-foreground transition-colors cursor-pointer shrink-0"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
          </div>

          {/* Right: Search + Notifications + Theme Toggle + User Avatar */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            {/* Staff Switcher Dropdown (for staff@ktmdecor.com) */}
            {user?.email === "staff@ktmdecor.com" && (
              <div className="hidden lg:flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-full text-xs font-semibold shadow-2xs">
                <span className="text-[10px] text-muted uppercase tracking-wider">
                  Working As:
                </span>
                <select
                  value={activeStaffProfile?._id || ""}
                  onChange={(e) => {
                    const selected = users.find((u) => u._id === e.target.value);
                    if (selected) setActiveStaffProfile(selected);
                  }}
                  className="bg-transparent focus:outline-none text-xs font-semibold cursor-pointer text-foreground"
                >
                  {users
                    .filter(
                      (u) => u.role !== "admin" && u.email !== "staff@ktmdecor.com"
                    )
                    .map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Pill Search Input */}
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card border border-border/80 text-muted shadow-2xs focus-within:border-accent/60 transition-colors w-48 md:w-60">
              <Search size={14} className="text-muted shrink-0" />
              <input
                type="text"
                placeholder="Search anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-foreground placeholder:text-muted/65 focus:outline-none w-full"
              />
            </div>

            {/* Notifications Bell Button */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-border/80 bg-card transition-colors text-muted hover:text-foreground relative shadow-2xs cursor-pointer"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 h-4 w-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-badge-blink shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Panel */}
              {notifDropdownOpen && (
                <div className="fixed sm:absolute top-16 sm:top-auto right-4 sm:right-0 mt-2 w-[calc(100vw-32px)] sm:w-96 max-w-[360px] glass-panel rounded-2xl shadow-2xl border border-border overflow-hidden z-50 animate-slide-up">
                  <div className="p-3.5 border-b border-border flex items-center justify-between bg-card">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs text-accent hover:text-accent-dark font-medium cursor-pointer"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-border">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-muted text-sm">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((notif, idx) => {
                        const isRead =
                          notif.recipient === null
                            ? notif.readBy.includes(user?._id || "")
                            : notif.read;

                        return (
                          <div
                            key={notif._id || `notif-${idx}`}
                            onClick={() => {
                              if (notif.type === "task_assigned") {
                                setCurrentTab("tasks");
                              } else if (
                                notif.type === "marketing_deadline" ||
                                notif.type === "new_field_note"
                              ) {
                                setCurrentTab("field-notes");
                              } else if (
                                notif.type === "order_assigned" ||
                                notif.type === "new_order"
                              ) {
                                setCurrentTab("order-progress");
                              } else if (notif.type === "new_quick_note") {
                                setCurrentTab("overview");
                              }
                              setNotifDropdownOpen(false);
                            }}
                            className={`p-3 text-sm flex gap-3 cursor-pointer hover:bg-border/40 transition-colors ${
                              isRead ? "opacity-60" : "bg-accent/5"
                            }`}
                          >
                            <div className="mt-0.5 text-accent">
                              {notif.type === "task_assigned" && (
                                <CheckCircle2
                                  size={16}
                                  className="text-green-500"
                                />
                              )}
                              {notif.type === "marketing_deadline" && (
                                <Calendar size={16} className="text-blue-500" />
                              )}
                              {notif.type === "system_announcement" && (
                                <Megaphone size={16} className="text-accent" />
                              )}
                              {notif.type === "order_assigned" && (
                                <Package
                                  size={16}
                                  className="text-amber-500 animate-pulse"
                                />
                              )}
                              {notif.type === "new_order" && (
                                <Package
                                  size={16}
                                  className="text-amber-500"
                                />
                              )}
                              {notif.type === "new_field_note" && (
                                <FileText size={16} className="text-blue-500" />
                              )}
                              {notif.type === "new_quick_note" && (
                                <MessageSquare
                                  size={16}
                                  className="text-purple-500"
                                />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="leading-snug text-xs sm:text-sm">
                                {notif.message}
                              </p>
                              <span className="text-[10px] text-muted mt-1 block">
                                {new Date(notif.createdAt).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {user?.role === "admin" && (
                    <div className="p-2.5 bg-card border-t border-border">
                      <button
                        onClick={() => {
                          setShowAnnouncementModal(true);
                          setNotifDropdownOpen(false);
                        }}
                        style={{
                          background:
                            "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)",
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-black font-bold rounded-xl shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
                      >
                        <PlusCircle size={14} />
                        Publish System Announcement
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dark / Light Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-border/80 bg-card transition-colors text-muted hover:text-foreground shadow-2xs cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* User Profile Avatar Circle */}
            <div
              onClick={() => {
                if (user?.role === "admin") {
                  setShowAnnouncementModal(true);
                }
              }}
              className="h-9 w-9 rounded-full bg-neutral-200 dark:bg-neutral-700 text-foreground font-bold text-xs flex items-center justify-center overflow-hidden border border-border shadow-2xs shrink-0 cursor-pointer hover:ring-2 hover:ring-accent/40 transition-all"
              title={`${user?.name || "User"} (${user?.role || "Staff"})`}
            >
              {(user as any)?.avatar ? (
                <img
                  src={(user as any).avatar}
                  alt={user?.name || "User"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{user?.name?.charAt(0).toUpperCase() || "A"}</span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Page Content Area */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 pb-10">
          <div className="max-w-7xl mx-auto animate-fade-in">{children}</div>
        </main>
      </div>

      {/* MOBILE SIDEBAR DRAWER OVERLAY */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Slide-in Sidebar Panel */}
          <aside className="absolute top-0 left-0 bottom-0 w-72 bg-card border-r border-border shadow-2xl flex flex-col animate-slide-in-left">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <img
                  src="/admin/logo/ktm%20decor.svg"
                  alt="KTM DECOR"
                  className="h-10.5 w-10.5 rounded-2xl border border-border/70 shadow-xs object-cover dark:invert dark:hue-rotate-180"
                />
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-muted hover:text-foreground cursor-pointer"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {navigationCategories.map((cat) => (
                <div key={cat.title} className="space-y-1">
                  <div className="text-[10px] font-bold text-muted/60 uppercase tracking-widest px-3 mb-1 mt-2 first:mt-0 select-none">
                    {cat.title}
                  </div>
                  {cat.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        style={
                          isActive
                            ? {
                                background:
                                  "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)",
                              }
                            : undefined
                        }
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all cursor-pointer ${
                          isActive
                            ? "text-black font-bold shadow-md shadow-orange-500/20"
                            : "text-muted hover:bg-border/60 hover:text-foreground"
                        }`}
                      >
                        <Icon
                          size={19}
                          className={isActive ? "text-black" : "text-muted"}
                        />
                        <span className={isActive ? "text-black font-bold" : ""}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Mobile Bottom Section */}
            <div className="p-3 border-t border-border space-y-2">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted hover:bg-border/60 hover:text-foreground transition-all cursor-pointer"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                style={{
                  background: "linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)",
                }}
                className="w-full flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm shadow-red-500/25 hover:shadow-md hover:shadow-red-500/35 transition-all cursor-pointer"
              >
                <LogOut size={18} strokeWidth={2.4} className="text-white" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* SYSTEM ANNOUNCEMENT MODAL */}
      {showAnnouncementModal && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pt-20 sm:p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-md rounded-[28px] border border-border/80 p-6 sm:p-7 shadow-2xl animate-scale-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3">
              <h2 className="text-base sm:text-lg font-bold font-display flex items-center gap-2">
                <Megaphone className="text-accent" size={20} />
                New System Announcement
              </h2>
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="text-muted hover:text-foreground p-1.5 rounded-xl hover:bg-muted/20 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePostAnnouncement}>
              <div className="mb-4">
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
                  Announcement Message
                </label>
                <textarea
                  value={announcementMsg}
                  onChange={(e) => setAnnouncementMsg(e.target.value)}
                  className="w-full h-24 p-3.5 border border-border/80 rounded-2xl bg-background/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none text-xs text-foreground font-medium transition-all"
                  placeholder="Enter the critical announcement details here... All connected staff members will receive a live alert."
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-5 py-2.5 border border-border/80 rounded-2xl text-xs font-bold text-foreground hover:bg-muted/20 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)",
                  }}
                  className="px-6 py-2.5 text-black font-bold rounded-2xl text-xs transition-all shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
