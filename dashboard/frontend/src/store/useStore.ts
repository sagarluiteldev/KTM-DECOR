import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import Pusher from "pusher-js";

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "" : "http://localhost:5001");

export interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  baseSalary?: number;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  assignee: User;
  dueDate: string;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "done";
  pinned: boolean;
  createdBy: {
    _id: string;
    name: string;
    role: string;
  };
  totalCost?: number;
  prepaidCost?: number;
  remainingCost?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Notification {
  _id: string;
  type:
    | "task_assigned"
    | "marketing_deadline"
    | "system_announcement"
    | "order_assigned"
    | "new_order"
    | "new_quick_note"
    | "new_field_note";
  message: string;
  recipient: string | null;
  read: boolean;
  readBy: string[];
  createdAt: string;
}

export interface MarketingCampaign {
  _id: string;
  title: string;
  description: string;
  district: string;
  location: string;
  fittingSpotImageUrl?: string;
  email?: string;
  createdBy: {
    _id: string;
    name: string;
    role: string;
  };
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
  deletedAt?: string;
}

export type FieldNote = MarketingCampaign;

export interface Order {
  date: any;
  _id: string;
  productName: string;
  size: string;
  price: number;
  deliveryPrice: number;
  installationPrice: number;
  totalPrice: number;
  advancePayment: number;
  duePayment: number;
  color: string;
  productImageUrl?: string;
  productImages?: string[];
  locationImageUrl?: string;
  locationImages?: string[];
  customerName: string;
  customerContact: string;
  customerEmail?: string;
  customerAddress: string;
  orderFrom: "tiktok" | "instagram" | "whatsapp" | "direct";
  paymentMethod: "cash" | "online_banking" | "esewa" | "cheque";
  manufacturingNotes?: string;
  stage: "design" | "manufacturing" | "completed" | "delivered" | "paid";
  approved: boolean;
  approvedAt?: string;
  orderDate?: string;
  deliveryDate: string;
  assignee?: User;
  createdBy: {
    _id: string;
    name: string;
    role: string;
  };
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
  deletedAt?: string;
}

export interface Activity {
  _id: string;
  user: User;
  action: string;
  details: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  subCategory: string;
  price: number;
  image: string;
  badge?: string;
  description: string;
  specs: string[];
  stockStatus: "In Stock" | "Low Stock" | "Custom Order Only";
  rating?: number;
  reviewsCount?: number;
  image_urls?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Sale {
  _id: string;
  clientName: string;
  productName: string;
  amount: number;
  date: string;
  paymentMethod: "cash" | "online_banking" | "esewa" | "cheque" | "other";
  notes?: string;
  createdBy: User;
  orderId?: string | Order;
  createdAt: string;
}

export interface Expense {
  _id: string;
  title: string;
  category: "salary" | "rent" | "travel" | "food" | "miscellaneous";
  amount: number;
  date: string;
  description?: string;
  createdBy: User;
  createdAt: string;
}

export interface QuickNote {
  _id: string;
  text: string;
  createdBy: User;
  createdAt: string;
}

export interface PurchaseItem {
  name: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface Purchase {
  _id: string;
  supplier: string;
  itemDetails: string;
  amount: number;
  date: string;
  status: "paid" | "pending" | "partial";
  items?: PurchaseItem[];
  createdBy: User;
  createdAt: string;
}

export interface InventoryItem {
  _id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  alertLevel: number;
  createdBy: User;
  createdAt: string;
  updatedAt?: string;
}

export interface QuotationItem {
  _id?: string;
  description: string;
  size?: string;
  hsCode?: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface Quotation {
  _id: string;
  clientName: string;
  clientEmail?: string;
  clientContact?: string;
  projectName: string;
  items: QuotationItem[];
  discount: number;
  tax: number;
  grandTotal: number;
  status: "draft" | "sent" | "accepted" | "rejected";
  date: string;
  voucherNo?: string;
  voucherDate?: string;
  amountInWords?: string;
  remarks?: string;
  createdBy: User;
  createdAt: string;
}

export interface Attendance {
  _id: string;
  user: User;
  date: string;
  status: "present" | "absent" | "half_day" | "leave";
  checkIn?: string;
  checkOut?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Salary {
  _id: string;
  user: User;
  month: number;
  year: number;
  baseSalary: number;
  presentDays: number;
  absentDays: number;
  bonus: number;
  deductions: number;
  calculatedSalary: number;
  finalSalary: number;
  status: "pending" | "paid";
  paymentDate?: string;
  paymentMethod?: "cash" | "online_banking" | "esewa" | "cheque" | "other";
  notes?: string;
  linkedExpense?: string;
  createdBy: User;
  createdAt: string;
  updatedAt?: string;
}


interface DashboardState {
  user: User | null;
  token: string | null;
  users: User[];
  tasks: Task[];
  notifications: Notification[];
  campaigns: MarketingCampaign[];
  binTasks: Task[];
  binCampaigns: MarketingCampaign[];
  binOrders: Order[];
  products: Product[];
  activities: Activity[];
  orders: Order[];
  sales: Sale[];
  expenses: Expense[];
  purchases: Purchase[];
  inventoryItems: InventoryItem[];
  quotations: Quotation[];
  attendanceLogs: Attendance[];
  salaries: Salary[];
  pusher: Pusher | null;
  theme: "light" | "dark";
  focusMode: boolean;
  quickNotes: QuickNote[];
  activeStaffProfile: User | null;
  
  // Actions
  init: () => void;
  fetchAttendanceLogs: (userId?: string, month?: number, year?: number) => Promise<void>;
  logAttendance: (data: { user?: string; date: string; status: string; checkIn?: string | null; checkOut?: string | null; notes?: string }) => Promise<void>;
  updateAttendance: (id: string, data: { status: string; checkIn?: string | null; checkOut?: string | null; notes?: string }) => Promise<void>;
  deleteAttendance: (id: string) => Promise<void>;
  fetchSalaries: () => Promise<void>;
  createSalary: (data: any) => Promise<void>;
  updateSalary: (id: string, data: any) => Promise<void>;
  deleteSalary: (id: string) => Promise<void>;
  bootstrap: () => Promise<void>;
  setActiveStaffProfile: (profile: User | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  toggleTheme: () => void;
  toggleFocusMode: () => void;
  
  // Tasks
  fetchTasks: () => Promise<void>;
  createTask: (data: any) => Promise<void>;
  updateTaskStatus: (taskId: string, status: Task["status"]) => Promise<void>;
  togglePinTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  
  // Products
  fetchProducts: () => Promise<void>;
  createProduct: (data: any) => Promise<void>;
  updateProduct: (id: string, data: any) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  
  // Users
  fetchUsers: () => Promise<void>;
  createUser: (userData: { name: string; email: string; password?: string; role?: "admin" | "staff"; baseSalary?: number }) => Promise<User>;
  updateUser: (id: string, userData: { name?: string; email?: string; password?: string; role?: "admin" | "staff"; baseSalary?: number }) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  
  // Notifications
  fetchNotifications: () => Promise<void>;
  markNotificationsRead: () => Promise<void>;
  createAnnouncement: (message: string) => Promise<void>;
  
  // Campaigns
  fetchCampaigns: () => Promise<void>;
  createCampaign: (data: any) => Promise<void>;
  updateCampaign: (campaignId: string, data: any) => Promise<void>;
  deleteCampaign: (campaignId: string) => Promise<void>;
  
  // Bin
  fetchBin: () => Promise<void>;
  restoreBinItem: (type: "task" | "campaign" | "order", id: string) => Promise<void>;
  deleteBinItemPermanently: (type: "task" | "campaign" | "order", id: string) => Promise<void>;
  
  // Activities
  fetchActivities: () => Promise<void>;
  
  // Orders
  fetchOrders: () => Promise<void>;
  createOrder: (data: any) => Promise<void>;
  updateOrder: (orderId: string, data: any) => Promise<void>;
  updateOrderProgress: (orderId: string, stage?: Order["stage"], assigneeId?: string | null) => Promise<void>;
  approveOrder: (orderId: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;

  // Sales
  fetchSales: () => Promise<void>;
  createSale: (data: any) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  resyncSales: () => Promise<any>;

  // Expenses
  fetchExpenses: () => Promise<void>;
  createExpense: (data: any) => Promise<void>;
  updateExpense: (id: string, data: any) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // Purchases
  fetchPurchases: () => Promise<void>;
  createPurchase: (data: any) => Promise<void>;
  updatePurchaseStatus: (id: string, status: Purchase["status"]) => Promise<void>;
  updatePurchase: (id: string, data: any) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;

  // Inventory
  fetchInventoryItems: () => Promise<void>;
  createInventoryItem: (data: any) => Promise<void>;
  updateInventoryItem: (id: string, data: any) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;

  // Quotations
  fetchQuotations: () => Promise<void>;
  createQuotation: (data: Partial<Quotation>) => Promise<void>;
  updateQuotation: (id: string, data: Partial<Quotation>) => Promise<void>;
  updateQuotationStatus: (id: string, status: Quotation["status"]) => Promise<void>;
  deleteQuotation: (id: string) => Promise<void>;
  
  // Quick Notes
  fetchQuickNotes: () => Promise<void>;
  addQuickNote: (note: string) => Promise<void>;
  deleteQuickNote: (id: string) => Promise<void>;

  // Exports
  exportStatement: (type: string, month: string, year: string) => Promise<void>;
  exportInventory: () => Promise<void>;
  statementArchives: any[];
  fetchStatementArchives: () => Promise<void>;
  downloadArchive: (id: string, filename: string) => Promise<void>;
  fetchStatementData: (type: string, month: string, year: string) => Promise<any>;
  fetchArchiveData: (id: string) => Promise<any>;
}

// Helpers
const getHeaders = (token: string | null) => ({
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const sortTasks = (tasksList: Task[]): Task[] => {
  return [...tasksList].sort((a, b) => {
    // Pinned tasks first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    
    // Then sort by due date ascending
    const dateA = new Date(a.dueDate).getTime();
    const dateB = new Date(b.dueDate).getTime();
    if (dateA !== dateB) return dateA - dateB;

    // Finally sort by creation date descending
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

const getSafeLocalStorage = (key: string, fallback: string = "null") => {
  try {
    const val = localStorage.getItem(key);
    if (!val || val === "undefined") return JSON.parse(fallback);
    return JSON.parse(val);
  } catch (e) {
    console.error(`Failed to parse ${key} from localStorage:`, e);
    try {
      localStorage.removeItem(key);
    } catch (_) {}
    return JSON.parse(fallback);
  }
};

const getSafeToken = () => {
  try {
    const token = localStorage.getItem("token");
    if (token === "undefined") {
      localStorage.removeItem("token");
      return null;
    }
    return token;
  } catch (e) {
    return null;
  }
};

export const useStore = create<DashboardState>()(
  persist(
    (set, get) => ({
  user: getSafeLocalStorage("user"),
  token: getSafeToken(),
  users: [],
  tasks: [],
  notifications: [],
  campaigns: [],
  binTasks: [],
  binCampaigns: [],
  binOrders: [],
  products: [],
  activities: [],
  orders: [],
  sales: [],
  expenses: [],
  purchases: [],
  inventoryItems: [],
  quotations: [],
  attendanceLogs: [],
  salaries: [],
  pusher: null,
  theme: (localStorage.getItem("theme") as "light" | "dark") || "light",
  focusMode: false,
  quickNotes: [],
  statementArchives: [],
  activeStaffProfile: getSafeLocalStorage("activeStaffProfile"),

  init: () => {
    const { token, user } = get();
    
    // Apply theme
    const theme = get().theme;
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    if (token && user) {
      get().bootstrap();
      
      // Connect Pusher (cleanup previous connection if any)
      const existingPusher = get().pusher;
      if (existingPusher) {
        existingPusher.disconnect();
      }

      const pusherKey = import.meta.env.VITE_PUSHER_KEY || "YOUR_PUSHER_KEY";
      const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER || "mt1";

      const pusher = new Pusher(pusherKey, {
        cluster: pusherCluster,
        forceTLS: true,
      });

      const channel = pusher.subscribe("ktm-dashboard");

      channel.bind("pusher:subscription_succeeded", () => {
        console.log("Pusher subscription succeeded on channel 'ktm-dashboard'");
      });

      // Bind events
      channel.bind("task_created", (newTask: Task) => {
        set((state) => {
          // If staff, verify if this task is assigned to them (or a staff member if using the shared staff login)
          if (state.user?.role !== "admin") {
            const isSharedStaff = state.user?.email === "staff@ktmdecor.com";
            const isAssignedToMe = newTask.assignee?._id === state.user?._id;
            const isAssignedToStaff = newTask.assignee?.role === "staff";
            
            if (isSharedStaff) {
              if (!isAssignedToMe && !isAssignedToStaff) return {};
            } else {
              if (!isAssignedToMe) return {};
            }
          }
          const filtered = state.tasks.filter((t) => t._id !== newTask._id);
          return { tasks: sortTasks([newTask, ...filtered]) };
        });
      });

      channel.bind("task_updated", (updatedTask: Task) => {
        set((state) => {
          const filtered = state.tasks.filter((t) => t._id !== updatedTask._id);
          // If staff, only keep tasks assigned to staff members
          if (state.user?.role !== "admin") {
            const isSharedStaff = state.user?.email === "staff@ktmdecor.com";
            const isAssignedToMe = updatedTask.assignee?._id === state.user?._id;
            const isAssignedToStaff = updatedTask.assignee?.role === "staff";
            
            if (isSharedStaff) {
              if (!isAssignedToMe && !isAssignedToStaff) return { tasks: sortTasks(filtered) };
            } else {
              if (!isAssignedToMe) return { tasks: sortTasks(filtered) };
            }
          }
          return { tasks: sortTasks([updatedTask, ...filtered]) };
        });
      });

      channel.bind("task_pinned", (pinnedTask: Task) => {
        set((state) => {
          const filtered = state.tasks.filter((t) => t._id !== pinnedTask._id);
          if (state.user?.role !== "admin") {
            const isSharedStaff = state.user?.email === "staff@ktmdecor.com";
            const isAssignedToMe = pinnedTask.assignee?._id === state.user?._id;
            const isAssignedToStaff = pinnedTask.assignee?.role === "staff";
            
            if (isSharedStaff) {
              if (!isAssignedToMe && !isAssignedToStaff) return { tasks: sortTasks(filtered) };
            } else {
              if (!isAssignedToMe) return { tasks: sortTasks(filtered) };
            }
          }
          return { tasks: sortTasks([pinnedTask, ...filtered]) };
        });
      });

      channel.bind("task_deleted", (deletedTaskId: string) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t._id !== deletedTaskId),
        }));
      });

      channel.bind("receive_notification", (notif: Notification) => {
        set((state) => {
          // Verify recipient
          if (notif.recipient) {
            // Direct notification
            if (state.user?.email === "staff@ktmdecor.com") {
              const isMe = notif.recipient === state.user?._id;
              const isPersona = notif.recipient === state.activeStaffProfile?._id;
              if (!isMe && !isPersona) return {};
            } else {
              if (notif.recipient !== state.user?._id && state.user?.role !== "admin") return {};
            }
          }
          const filtered = state.notifications.filter((n) => n._id !== notif._id);
          return { notifications: [notif, ...filtered] };
        });
      });

      channel.bind("campaign_updated", (updatedCampaign: MarketingCampaign) => {
        set((state) => {
          const filtered = state.campaigns.filter((c) => c._id !== updatedCampaign._id);
          return { campaigns: [...filtered, updatedCampaign].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) };
        });
      });

      channel.bind("campaign_deleted", (deletedCampaignId: string) => {
        set((state) => ({
          campaigns: state.campaigns.filter((c) => c._id !== deletedCampaignId),
        }));
      });

      channel.bind("bin_updated", () => {
        if (get().user?.role === "admin") {
          get().fetchBin();
        }
      });

      channel.bind("new_activity", (activity: Activity) => {
        set((state) => {
          const filtered = state.activities.filter((a) => a._id !== activity._id);
          return { activities: [activity, ...filtered.slice(0, 29)] };
        });
      });

      channel.bind("product_created", (newProduct: Product) => {
        set((state) => {
          const filtered = state.products.filter((p) => p.id !== newProduct.id);
          return { products: [newProduct, ...filtered] };
        });
      });

      channel.bind("product_updated", (updatedProduct: Product) => {
        set((state) => ({
          products: state.products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)),
        }));
      });

      channel.bind("product_deleted", (deletedProductId: string) => {
        set((state) => ({
          products: state.products.filter((p) => p.id !== deletedProductId),
        }));
      });

      channel.bind("order_created", (newOrder: Order) => {
        set((state) => {
          const filtered = state.orders.filter((o) => o._id !== newOrder._id);
          return { orders: [newOrder, ...filtered] };
        });
      });

      channel.bind("order_updated", (updatedOrder: Order) => {
        set((state) => ({
          orders: state.orders.map((o) => (o._id === updatedOrder._id ? updatedOrder : o)),
        }));
      });

      channel.bind("order_deleted", (deletedOrderId: string) => {
        set((state) => ({
          orders: state.orders.filter((o) => o._id !== deletedOrderId),
          sales: state.sales.filter((s) => {
            const ordId = s.orderId ? (typeof s.orderId === "object" ? (s.orderId as any)._id : s.orderId) : null;
            return ordId !== deletedOrderId;
          }),
        }));
      });

      channel.bind("sale_created", (newSale: Sale) => {
        set((state) => {
          const filtered = state.sales.filter((s) => s._id !== newSale._id);
          return { sales: [newSale, ...filtered] };
        });
      });

      channel.bind("sale_deleted", (deletedSaleId: string) => {
        set((state) => ({
          sales: state.sales.filter((s) => s._id !== deletedSaleId),
        }));
      });

      channel.bind("expense_created", (newExpense: Expense) => {
        set((state) => {
          const filtered = state.expenses.filter((e) => e._id !== newExpense._id);
          const list = [newExpense, ...filtered];
          return { expenses: list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
        });
      });

      channel.bind("expense_updated", (updatedExpense: Expense) => {
        set((state) => {
          const next = state.expenses.map((e) => (e._id === updatedExpense._id ? updatedExpense : e));
          return { expenses: next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
        });
      });

      channel.bind("expense_deleted", (deletedExpenseId: string) => {
        set((state) => ({
          expenses: state.expenses.filter((e) => e._id !== deletedExpenseId),
        }));
      });

      channel.bind("purchase_created", (newPurchase: Purchase) => {
        set((state) => {
          const filtered = state.purchases.filter((p) => p._id !== newPurchase._id);
          const list = [newPurchase, ...filtered];
          return { purchases: list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
        });
      });

      channel.bind("purchase_updated", (updatedPurchase: Purchase) => {
        set((state) => {
          const next = state.purchases.map((p) => (p._id === updatedPurchase._id ? updatedPurchase : p));
          return { purchases: next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
        });
      });

      channel.bind("purchase_deleted", (deletedPurchaseId: string) => {
        set((state) => ({
          purchases: state.purchases.filter((p) => p._id !== deletedPurchaseId),
        }));
      });

      channel.bind("inventory_created", (newItem: InventoryItem) => {
        set((state) => {
          const filtered = state.inventoryItems.filter((i) => i._id !== newItem._id);
          return { inventoryItems: [newItem, ...filtered].sort((a, b) => a.name.localeCompare(b.name)) };
        });
      });

      channel.bind("inventory_updated", (updatedItem: InventoryItem) => {
        set((state) => {
          const filtered = state.inventoryItems.filter((i) => i._id !== updatedItem._id);
          return { inventoryItems: [updatedItem, ...filtered].sort((a, b) => a.name.localeCompare(b.name)) };
        });
      });

      channel.bind("inventory_deleted", (deletedItemId: string) => {
        set((state) => ({
          inventoryItems: state.inventoryItems.filter((i) => i._id !== deletedItemId),
        }));
      });

      channel.bind("quotation_created", (newQuotation: Quotation) => {
        set((state) => {
          const filtered = state.quotations.filter((q) => q._id !== newQuotation._id);
          return { quotations: [newQuotation, ...filtered] };
        });
      });

      channel.bind("quotation_updated", (updatedQuotation: Quotation) => {
        set((state) => {
          const filtered = state.quotations.filter((q) => q._id !== updatedQuotation._id);
          return { quotations: [updatedQuotation, ...filtered] };
        });
      });

      channel.bind("quotation_deleted", (deletedQuotationId: string) => {
        set((state) => ({
          quotations: state.quotations.filter((q) => q._id !== deletedQuotationId),
        }));
      });

      channel.bind("note_created", (newNote: QuickNote) => {
        set((state) => {
          const currentNotes = Array.isArray(state.quickNotes) ? state.quickNotes : [];
          const filtered = currentNotes.filter((n) => n._id !== newNote._id);
          return { quickNotes: [newNote, ...filtered] };
        });
      });

      channel.bind("note_deleted", (deletedNoteId: string) => {
        set((state) => ({
          quickNotes: (Array.isArray(state.quickNotes) ? state.quickNotes : []).filter((n) => n._id !== deletedNoteId),
        }));
      });

      channel.bind("attendance_updated", (updatedAttendance: Attendance) => {
        set((state) => {
          const filtered = state.attendanceLogs.filter((a) => a._id !== updatedAttendance._id);
          return { attendanceLogs: [...filtered, updatedAttendance].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) };
        });
      });

      channel.bind("attendance_deleted", (deletedAttendanceId: string) => {
        set((state) => ({
          attendanceLogs: state.attendanceLogs.filter((a) => a._id !== deletedAttendanceId),
        }));
      });

      channel.bind("salary_created", (newSalary: Salary) => {
        set((state) => {
          const filtered = state.salaries.filter((s) => s._id !== newSalary._id);
          return { salaries: [newSalary, ...filtered].sort((a, b) => b.year - a.year || b.month - a.month) };
        });
      });

      channel.bind("salary_updated", (updatedSalary: Salary) => {
        set((state) => {
          const filtered = state.salaries.filter((s) => s._id !== updatedSalary._id);
          return { salaries: [updatedSalary, ...filtered].sort((a, b) => b.year - a.year || b.month - a.month) };
        });
      });

      channel.bind("salary_deleted", (deletedSalaryId: string) => {
        set((state) => ({
          salaries: state.salaries.filter((s) => s._id !== deletedSalaryId),
        }));
      });

      channel.bind("user_created", (newUser: User) => {
        set((state) => {
          const exists = state.users.some((u) => u._id === newUser._id);
          if (exists) return state;
          return { users: [...state.users, newUser] };
        });
      });

      channel.bind("user_updated", (updatedUser: User) => {
        set((state) => ({
          users: state.users.map((u) => (u._id === updatedUser._id ? updatedUser : u)),
          activeStaffProfile:
            state.activeStaffProfile?._id === updatedUser._id ? updatedUser : state.activeStaffProfile,
        }));
      });

      channel.bind("user_deleted", (deletedUserId: string) => {
        set((state) => ({
          users: state.users.filter((u) => u._id !== deletedUserId),
          activeStaffProfile:
            state.activeStaffProfile?._id === deletedUserId ? null : state.activeStaffProfile,
        }));
      });

      set({ pusher });
    }
  },

  bootstrap: async () => {
    const { token, user } = get();
    if (!token || !user) return;
    try {
      const res = await fetch(`${API_URL}/api/bootstrap`, {
        headers: getHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        set({
          tasks: sortTasks(data.tasks || []),
          users: data.users || [],
          notifications: data.notifications || [],
          campaigns: data.campaigns || [],
          activities: data.activities || [],
          products: data.products || [],
          orders: data.orders || [],
          inventoryItems: data.inventoryItems || [],
          quickNotes: Array.isArray(data.quickNotes) ? data.quickNotes : [],
          salaries: data.salaries || [],
          ...(user.role === "admin" ? {
            sales: data.sales || [],
            expenses: data.expenses || [],
            purchases: data.purchases || [],
            quotations: data.quotations || [],
            binTasks: data.binTasks || [],
            binCampaigns: data.binCampaigns || [],
            binOrders: data.binOrders || [],
          } : {})
        });
      }
    } catch (err) {
      console.error("Dashboard bootstrap failed:", err);
    }
  },

  login: async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Unknown error" }));
        console.error("Login failed:", res.status, errData.message);
        throw new Error(errData.message || "Invalid credentials");
      }
      const data = await res.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));
      set({ user: data, token: data.token });
      get().init();
      return true;
    } catch (error) {
      console.error("Login failure:", error);
      throw error;
    }
  },

  setActiveStaffProfile: (profile) => {
    if (profile) {
      localStorage.setItem("activeStaffProfile", JSON.stringify(profile));
    } else {
      localStorage.removeItem("activeStaffProfile");
    }
    set({ activeStaffProfile: profile });
  },

  logout: () => {
    const { pusher } = get();
    if (pusher) {
      pusher.disconnect();
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeStaffProfile");
    set({
      user: null,
      token: null,
      activeStaffProfile: null,
      tasks: [],
      users: [],
      notifications: [],
      campaigns: [],
      binTasks: [],
      binCampaigns: [],
      binOrders: [],
      products: [],
      activities: [],
      orders: [],
      pusher: null,
    });
  },

  toggleTheme: () => {
    set((state) => {
      const nextTheme = state.theme === "light" ? "dark" : "light";
      localStorage.setItem("theme", nextTheme);
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return { theme: nextTheme };
    });
  },

  toggleFocusMode: () => {
    set((state) => ({ focusMode: !state.focusMode }));
  },

  fetchTasks: async () => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        headers: getHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        set({ tasks: sortTasks(data) });
      }
    } catch (err) {
      console.error("Fetch tasks failed:", err);
    }
  },

  createTask: async (taskData) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(taskData),
      });
      if (!res.ok) throw new Error("Task creation failed");
      // Server will emit task_created socket event, handled in init()
    } catch (err) {
      console.error(err);
    }
  },

  updateTaskStatus: async (taskId, status) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: getHeaders(token),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Task update failed");
      // Server will emit task_updated socket event, handled in init()
    } catch (err) {
      console.error(err);
    }
  },

  togglePinTask: async (taskId) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}/pin`, {
        method: "PUT",
        headers: getHeaders(token),
      });
      if (!res.ok) throw new Error("Task pinning toggle failed");
      // Server will emit task_pinned socket event, handled in init()
    } catch (err) {
      console.error(err);
    }
  },

  deleteTask: async (taskId) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: getHeaders(token),
      });
      if (!res.ok) throw new Error("Task deletion failed");
      // Server will emit task_deleted socket event, handled in init()
    } catch (err) {
      console.error(err);
    }
  },

  fetchUsers: async () => {
    const { token, user, activeStaffProfile } = get();
    try {
      const res = await fetch(`${API_URL}/api/auth/users`, {
        headers: getHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        set({ users: data });

        // If shared staff login, set default active persona if none exists
        if (user && user.email === "staff@ktmdecor.com" && !activeStaffProfile) {
          const staffMembers = data.filter((u: User) => u.role !== "admin" && u.email !== "staff@ktmdecor.com");
          if (staffMembers.length > 0) {
            get().setActiveStaffProfile(staffMembers[0]);
          }
        }
      }
    } catch (err) {
      console.error("Fetch users failed:", err);
    }
  },

  createUser: async (userData) => {
    const { token } = get();
    const res = await fetch(`${API_URL}/api/users`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to create staff member");
    }
    const newUser = await res.json();
    set((state) => {
      const exists = state.users.some((u) => u._id === newUser._id);
      return { users: exists ? state.users : [...state.users, newUser] };
    });
    return newUser;
  },

  updateUser: async (id, userData) => {
    const { token } = get();
    const res = await fetch(`${API_URL}/api/users/${id}`, {
      method: "PUT",
      headers: getHeaders(token),
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to update staff member");
    }
    const updatedUser = await res.json();
    set((state) => ({
      users: state.users.map((u) => (u._id === id ? updatedUser : u)),
      activeStaffProfile:
        state.activeStaffProfile?._id === id ? updatedUser : state.activeStaffProfile,
    }));
    return updatedUser;
  },

  deleteUser: async (id) => {
    const { token } = get();
    const res = await fetch(`${API_URL}/api/users/${id}`, {
      method: "DELETE",
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to delete staff member");
    }
    set((state) => ({
      users: state.users.filter((u) => u._id !== id),
      activeStaffProfile:
        state.activeStaffProfile?._id === id ? null : state.activeStaffProfile,
    }));
  },

  fetchNotifications: async () => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: getHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        set({ notifications: data });
      }
    } catch (err) {
      console.error("Fetch notifications failed:", err);
    }
  },

  markNotificationsRead: async () => {
    const { token, user, activeStaffProfile } = get();
    if (!user) return;
    try {
      const body: any = {};
      if (user.email === "staff@ktmdecor.com" && activeStaffProfile) {
        body.assigneeId = activeStaffProfile._id;
      }
      const res = await fetch(`${API_URL}/api/notifications/read`, {
        method: "PUT",
        headers: {
          ...getHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        set((state) => ({
          notifications: state.notifications.map((notif) => {
            const readerId = (user.email === "staff@ktmdecor.com" && activeStaffProfile) ? activeStaffProfile._id : user._id;
            if (notif.recipient === null) {
              // Global announcement read list
              return { ...notif, readBy: [...new Set([...(notif.readBy || []), readerId])] };
            }
            // Direct notification
            if (notif.recipient === readerId) {
              return { ...notif, read: true };
            }
            return notif;
          }),
        }));
      }
    } catch (err) {
      console.error("Marking notifications read failed:", err);
    }
  },

  createAnnouncement: async (message) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/notifications/announcement`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("Announcement publication failed");
    } catch (err) {
      console.error(err);
    }
  },

  fetchCampaigns: async () => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/campaigns`, {
        headers: getHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        set({ campaigns: data });
      }
    } catch (err) {
      console.error("Fetch campaigns failed:", err);
    }
  },

  createCampaign: async (campaignData) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/campaigns`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(campaignData),
      });
      if (!res.ok) throw new Error("Campaign creation failed");
    } catch (err) {
      console.error(err);
    }
  },

  updateCampaign: async (campaignId, campaignData) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/campaigns/${campaignId}`, {
        method: "PUT",
        headers: getHeaders(token),
        body: JSON.stringify(campaignData),
      });
      if (!res.ok) throw new Error("Campaign update failed");
    } catch (err) {
      console.error(err);
    }
  },

  deleteCampaign: async (campaignId) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/campaigns/${campaignId}`, {
        method: "DELETE",
        headers: getHeaders(token),
      });
      if (!res.ok) throw new Error("Campaign deletion failed");
    } catch (err) {
      console.error(err);
    }
  },

  fetchProducts: async () => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/products`, {
        headers: getHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        set({ products: data });
      }
    } catch (err) {
      console.error("Fetch products failed:", err);
    }
  },

  createProduct: async (productData) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/products`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(productData),
      });
      if (!res.ok) throw new Error("Product creation failed");
    } catch (err) {
      console.error("Create product failed:", err);
      throw err;
    }
  },

  updateProduct: async (productId, productData) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/products/${productId}`, {
        method: "PUT",
        headers: getHeaders(token),
        body: JSON.stringify(productData),
      });
      if (!res.ok) throw new Error("Product update failed");
    } catch (err) {
      console.error("Update product failed:", err);
      throw err;
    }
  },

  deleteProduct: async (productId) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/products/${productId}`, {
        method: "DELETE",
        headers: getHeaders(token),
      });
      if (!res.ok) throw new Error("Product deletion failed");
    } catch (err) {
      console.error("Delete product failed:", err);
      throw err;
    }
  },

  fetchBin: async () => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/bin`, {
        headers: getHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        set({
          binTasks: data.tasks || [],
          binCampaigns: data.campaigns || [],
          binOrders: data.orders || []
        });
      }
    } catch (err) {
      console.error("Fetch bin failed:", err);
    }
  },

  restoreBinItem: async (type, id) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/bin/${type}/${id}/restore`, {
        method: "PUT",
        headers: getHeaders(token),
      });
      if (!res.ok) throw new Error("Restoring bin item failed");
    } catch (err) {
      console.error(err);
    }
  },

  deleteBinItemPermanently: async (type, id) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/bin/${type}/${id}/force`, {
        method: "DELETE",
        headers: getHeaders(token),
      });
      if (!res.ok) throw new Error("Force deleting bin item failed");
    } catch (err) {
      console.error(err);
    }
  },

  fetchActivities: async () => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/activities`, {
        headers: getHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        set({ activities: data });
      }
    } catch (err) {
      console.error("Fetch activities failed:", err);
    }
  },

  fetchOrders: async () => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        headers: getHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        set({ orders: data });
      }
    } catch (err) {
      console.error("Fetch orders failed:", err);
    }
  },

  createOrder: async (orderData) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(orderData),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Unknown error" }));
        console.error("Order creation failed:", res.status, errData.message);
        throw new Error(errData.message || "Order creation failed");
      }
      const newOrder = await res.json();
      set((state) => {
        const filtered = state.orders.filter((o) => o._id !== newOrder._id);
        return { orders: [newOrder, ...filtered] };
      });
      await get().fetchSales();
    } catch (err) {
      console.error("Create order failed:", err);
      throw err;
    }
  },

  updateOrder: async (orderId, orderData) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}`, {
        method: "PUT",
        headers: getHeaders(token),
        body: JSON.stringify(orderData),
      });
      if (!res.ok) throw new Error("Order update failed");
      const updatedOrder = await res.json();
      set((state) => ({
        orders: state.orders.map((o) => (o._id === orderId ? updatedOrder : o)),
      }));
      await get().fetchSales();
    } catch (err) {
      console.error("Update order failed:", err);
      throw err;
    }
  },

  updateOrderProgress: async (orderId, stage, assigneeId) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}/progress`, {
        method: "PUT",
        headers: getHeaders(token),
        body: JSON.stringify({ stage, assignee: assigneeId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Order progress update failed");
      }
      const updatedOrder = await res.json();
      set((state) => ({
        orders: state.orders.map((o) => (o._id === orderId ? updatedOrder : o)),
      }));
      await get().fetchSales();
    } catch (err) {
      console.error("Update order progress failed:", err);
      throw err;
    }
  },

  approveOrder: async (orderId) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}/approve`, {
        method: "PUT",
        headers: getHeaders(token),
      });
      if (!res.ok) throw new Error("Order approval failed");
      const updatedOrder = await res.json();
      set((state) => ({
        orders: state.orders.map((o) => (o._id === orderId ? updatedOrder : o)),
      }));
      await get().fetchSales();
    } catch (err) {
      console.error("Approve order failed:", err);
      throw err;
    }
  },

  deleteOrder: async (orderId) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}`, {
        method: "DELETE",
        headers: getHeaders(token),
      });
      if (!res.ok) throw new Error("Order deletion failed");
      set((state) => ({
        orders: state.orders.filter((o) => o._id !== orderId),
      }));
      await get().fetchSales();
    } catch (err) {
      console.error("Delete order failed:", err);
      throw err;
    }
  },

  // Sales Actions
  fetchSales: async () => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/sales`, {
        headers: getHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        set({ sales: data });
      }
    } catch (err) {
      console.error("Fetch sales failed:", err);
    }
  },

  createSale: async (saleData) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/sales`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(saleData),
      });
      if (!res.ok) throw new Error("Sale logging failed");
      const newSale = await res.json();
      set((state) => {
        const filtered = state.sales.filter((s) => s._id !== newSale._id);
        return { sales: [newSale, ...filtered] };
      });
    } catch (err) {
      console.error("Create sale failed:", err);
      throw err;
    }
  },

  deleteSale: async (saleId) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/sales/${saleId}`, {
        method: "DELETE",
        headers: getHeaders(token),
      });
      if (!res.ok) throw new Error("Sale deletion failed");
      set((state) => ({
        sales: state.sales.filter((s) => s._id !== saleId),
      }));
    } catch (err) {
      console.error("Delete sale failed:", err);
      throw err;
    }
  },

  resyncSales: async () => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/admin/resync-sales`, {
        method: "POST",
        headers: getHeaders(token),
      });
      if (!res.ok) throw new Error("Resync sales failed");
      const data = await res.json();
      if (Array.isArray(data.sales)) {
        set({ sales: data.sales });
      }
      return data;
    } catch (err) {
      console.error("Resync sales failed:", err);
      throw err;
    }
  },

  // Expenses Actions
  fetchExpenses: async () => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/expenses`, {
        headers: getHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        set({ expenses: data });
      }
    } catch (err) {
      console.error("Fetch expenses failed:", err);
    }
  },

  createExpense: async (expenseData) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/expenses`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(expenseData),
      });
      if (!res.ok) throw new Error("Expense creation failed");
      const newExpense = await res.json();
      set((state) => {
        const filtered = state.expenses.filter((e) => e._id !== newExpense._id);
        const list = [newExpense, ...filtered];
        return { expenses: list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
      });
    } catch (err) {
      console.error("Create expense failed:", err);
      throw err;
    }
  },

  updateExpense: async (expenseId, expenseData) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/expenses/${expenseId}`, {
        method: "PUT",
        headers: {
          ...getHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(expenseData),
      });
      if (!res.ok) throw new Error("Expense update failed");
      const updatedExpense = await res.json();
      set((state) => {
        const next = state.expenses.map((e) => (e._id === expenseId ? updatedExpense : e));
        return { expenses: next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
      });
    } catch (err) {
      console.error("Update expense failed:", err);
      throw err;
    }
  },

  deleteExpense: async (expenseId) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/expenses/${expenseId}`, {
        method: "DELETE",
        headers: getHeaders(token),
      });
      if (!res.ok) throw new Error("Expense deletion failed");
      set((state) => ({
        expenses: state.expenses.filter((e) => e._id !== expenseId),
      }));
    } catch (err) {
      console.error("Delete expense failed:", err);
      throw err;
    }
  },

  // Purchases Actions
  fetchPurchases: async () => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/purchases`, {
        headers: getHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        set({ purchases: data });
      }
    } catch (err) {
      console.error("Fetch purchases failed:", err);
    }
  },

  createPurchase: async (purchaseData) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/purchases`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(purchaseData),
      });
      if (!res.ok) throw new Error("Purchase creation failed");
      const newPurchase = await res.json();
      set((state) => {
        const filtered = state.purchases.filter((p) => p._id !== newPurchase._id);
        const list = [newPurchase, ...filtered];
        return { purchases: list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
      });
    } catch (err) {
      console.error("Create purchase failed:", err);
      throw err;
    }
  },

  updatePurchaseStatus: async (purchaseId, status) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/purchases/${purchaseId}`, {
        method: "PUT",
        headers: getHeaders(token),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Purchase update failed");
      const updatedPurchase = await res.json();
      set((state) => {
        const next = state.purchases.map((p) => (p._id === purchaseId ? updatedPurchase : p));
        return { purchases: next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
      });
    } catch (err) {
      console.error("Update purchase failed:", err);
      throw err;
    }
  },

  updatePurchase: async (purchaseId, purchaseData) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/purchases/${purchaseId}`, {
        method: "PUT",
        headers: {
          ...getHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(purchaseData),
      });
      if (!res.ok) throw new Error("Purchase update failed");
      const updatedPurchase = await res.json();
      set((state) => {
        const next = state.purchases.map((p) => (p._id === purchaseId ? updatedPurchase : p));
        return { purchases: next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
      });
    } catch (err) {
      console.error("Update purchase failed:", err);
      throw err;
    }
  },

  deletePurchase: async (purchaseId) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/purchases/${purchaseId}`, {
        method: "DELETE",
        headers: getHeaders(token),
      });
      if (!res.ok) throw new Error("Purchase deletion failed");
      set((state) => ({
        purchases: state.purchases.filter((p) => p._id !== purchaseId),
      }));
    } catch (err) {
      console.error("Delete purchase failed:", err);
      throw err;
    }
  },

  // Inventory Actions
  fetchInventoryItems: async () => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/inventory`, {
        headers: getHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        set({ inventoryItems: data });
      }
    } catch (err) {
      console.error("Fetch inventory failed:", err);
    }
  },

  createInventoryItem: async (itemData) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/inventory`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(itemData),
      });
      if (!res.ok) throw new Error("Inventory item creation failed");
      const newItem = await res.json();
      set((state) => {
        const filtered = state.inventoryItems.filter((i) => i._id !== newItem._id);
        return { inventoryItems: [newItem, ...filtered].sort((a, b) => a.name.localeCompare(b.name)) };
      });
    } catch (err) {
      console.error("Create inventory item failed:", err);
      throw err;
    }
  },

  updateInventoryItem: async (itemId, itemData) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/inventory/${itemId}`, {
        method: "PUT",
        headers: getHeaders(token),
        body: JSON.stringify(itemData),
      });
      if (!res.ok) throw new Error("Inventory item update failed");
      const updatedItem = await res.json();
      set((state) => {
        const filtered = state.inventoryItems.filter((i) => i._id !== itemId);
        return { inventoryItems: [updatedItem, ...filtered].sort((a, b) => a.name.localeCompare(b.name)) };
      });
    } catch (err) {
      console.error("Update inventory item failed:", err);
      throw err;
    }
  },

  deleteInventoryItem: async (itemId) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/inventory/${itemId}`, {
        method: "DELETE",
        headers: getHeaders(token),
      });
      if (!res.ok) throw new Error("Inventory item deletion failed");
      set((state) => ({
        inventoryItems: state.inventoryItems.filter((i) => i._id !== itemId),
      }));
    } catch (err) {
      console.error("Delete inventory item failed:", err);
      throw err;
    }
  },

  // Quotations Actions
  fetchQuotations: async () => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/quotations`, {
        headers: getHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        set({ quotations: data });
      }
    } catch (err) {
      console.error("Fetch quotations failed:", err);
    }
  },

  createQuotation: async (quotationData) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/quotations`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(quotationData),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Unknown error" }));
        console.error("Quotation creation failed:", res.status, errData.message);
        throw new Error(errData.message || "Quotation creation failed");
      }
      const newQuotation = await res.json();
      set((state) => {
        const filtered = state.quotations.filter((q) => q._id !== newQuotation._id);
        return { quotations: [newQuotation, ...filtered] };
      });
    } catch (err) {
      console.error("Create quotation failed:", err);
      throw err;
    }
  },

  updateQuotation: async (quotationId, quotationData) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/quotations/${quotationId}`, {
        method: "PUT",
        headers: {
          ...getHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(quotationData),
      });
      if (!res.ok) throw new Error("Quotation update failed");
      const updatedQuotation = await res.json();
      set((state) => {
        const filtered = state.quotations.filter((q) => q._id !== quotationId);
        return { quotations: [updatedQuotation, ...filtered] };
      });
    } catch (err) {
      console.error("Update quotation failed:", err);
      throw err;
    }
  },

  updateQuotationStatus: async (quotationId, status) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/quotations/${quotationId}`, {
        method: "PUT",
        headers: getHeaders(token),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Quotation update failed");
      const updatedQuotation = await res.json();
      set((state) => {
        const filtered = state.quotations.filter((q) => q._id !== quotationId);
        return { quotations: [updatedQuotation, ...filtered] };
      });
    } catch (err) {
      console.error("Update quotation failed:", err);
      throw err;
    }
  },

  deleteQuotation: async (quotationId) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/quotations/${quotationId}`, {
        method: "DELETE",
        headers: getHeaders(token),
      });
      if (!res.ok) throw new Error("Quotation deletion failed");
      set((state) => ({
        quotations: state.quotations.filter((q) => q._id !== quotationId),
      }));
    } catch (err) {
      console.error("Delete quotation failed:", err);
      throw err;
    }
  },

  fetchQuickNotes: async () => {
    const { token } = get();
    console.log("[QuickNotes] Fetching... token exists:", !!token);
    try {
      const res = await fetch(`${API_URL}/api/notes`, {
        headers: getHeaders(token),
      });
      console.log("[QuickNotes] Response status:", res.status);
      if (!res.ok) {
        console.error("[QuickNotes] Failed with status:", res.status);
        return;
      }
      const data = await res.json();
      console.log("[QuickNotes] Data received:", data, "isArray:", Array.isArray(data), "length:", Array.isArray(data) ? data.length : "N/A");
      // Handle both raw array and wrapped { notes: [...] } responses
      const notes = Array.isArray(data) ? data : (Array.isArray(data?.notes) ? data.notes : []);
      set({ quickNotes: notes });
    } catch (err) {
      console.error("[QuickNotes] Fetch failed:", err);
      // Don't reset quickNotes to [] on error — preserve any existing data
    }
  },

  addQuickNote: async (noteText) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/notes`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify({ text: noteText }),
      });
      if (!res.ok) throw new Error("Failed to add quick note");
      const data = await res.json();
      set((state) => {
        const currentNotes = Array.isArray(state.quickNotes) ? state.quickNotes : [];
        const filtered = currentNotes.filter((n) => n._id !== data._id);
        return { quickNotes: [data, ...filtered] };
      });
    } catch (err) {
      console.error("Add quick note failed:", err);
      throw err;
    }
  },

  deleteQuickNote: async (id) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/notes/${id}`, {
        method: "DELETE",
        headers: getHeaders(token),
      });
      if (!res.ok) throw new Error("Failed to delete quick note");
      set((state) => ({
        quickNotes: (Array.isArray(state.quickNotes) ? state.quickNotes : []).filter((n) => n._id !== id),
      }));
    } catch (err) {
      console.error("Delete quick note failed:", err);
      throw err;
    }
  },

  exportStatement: async (type, month, year) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/export/statement?type=${type}&month=${month}&year=${year}`, {
        headers: getHeaders(token),
      });
      if (!res.ok) throw new Error("Exporting statement failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const nepaliMonthNames = [
        "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
        "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
      ];
      const mNum = parseInt(month, 10);
      const periodLabel = month === "all" ? `All_Time_${year}_BS` : `${nepaliMonthNames[mNum - 1]}_${year}_BS`;
      const prefix = type === "all" ? "combined" : type;
      a.download = `${prefix}_statement_${periodLabel}.csv`;
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  exportInventory: async () => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/export/inventory`, {
        headers: getHeaders(token),
      });
      if (!res.ok) throw new Error("Exporting inventory failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Inventory_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  fetchStatementArchives: async () => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/export/archives`, {
        headers: getHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        set({ statementArchives: data });
      }
    } catch (err) {
      console.error("Fetch statement archives failed:", err);
    }
  },

  downloadArchive: async (id, filename) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/export/archive/${id}`, {
        headers: getHeaders(token),
      });
      if (!res.ok) throw new Error("Downloading statement archive failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download archive failed:", err);
      throw err;
    }
  },

  fetchStatementData: async (type, month, year) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/export/statement-data?type=${type}&month=${month}&year=${year}`, {
        headers: getHeaders(token),
      });
      if (!res.ok) throw new Error("Failed to fetch statement data");
      return await res.json();
    } catch (err) {
      console.error("fetchStatementData failed:", err);
      throw err;
    }
  },

  fetchArchiveData: async (id) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/export/archive-data/${id}`, {
        headers: getHeaders(token),
      });
      if (!res.ok) throw new Error("Failed to fetch archive statement data");
      return await res.json();
    } catch (err) {
      console.error("fetchArchiveData failed:", err);
      throw err;
    }
  },

  fetchAttendanceLogs: async (userId, month, year) => {
    const { token } = get();
    try {
      let queryParams = new URLSearchParams();
      if (userId) queryParams.append("userId", userId);
      if (month) queryParams.append("month", month.toString());
      if (year) queryParams.append("year", year.toString());
      
      const res = await fetch(`${API_URL}/api/attendance?${queryParams.toString()}`, {
        headers: getHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        set({ attendanceLogs: data });
      }
    } catch (err) {
      console.error("Fetch attendance logs failed:", err);
    }
  },

  logAttendance: async (attendanceData) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/attendance`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(attendanceData),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errData.message || "Failed to log attendance");
      }
      const data = await res.json();
      set((state) => {
        const filtered = state.attendanceLogs.filter((a) => a._id !== data._id);
        return { attendanceLogs: [...filtered, data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) };
      });
    } catch (err) {
      console.error("Log attendance failed:", err);
      throw err;
    }
  },

  updateAttendance: async (id, attendanceData) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/attendance/${id}`, {
        method: "PUT",
        headers: getHeaders(token),
        body: JSON.stringify(attendanceData),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errData.message || "Failed to update attendance");
      }
      const data = await res.json();
      set((state) => {
        const filtered = state.attendanceLogs.filter((a) => a._id !== data._id);
        return { attendanceLogs: [...filtered, data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) };
      });
    } catch (err) {
      console.error("Update attendance failed:", err);
      throw err;
    }
  },

  deleteAttendance: async (id) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/attendance/${id}`, {
        method: "DELETE",
        headers: getHeaders(token),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errData.message || "Failed to delete attendance");
      }
      set((state) => ({
        attendanceLogs: state.attendanceLogs.filter((a) => a._id !== id),
      }));
    } catch (err) {
      console.error("Delete attendance failed:", err);
      throw err;
    }
  },

  fetchSalaries: async () => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/salaries`, {
        headers: getHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        set({ salaries: data });
      }
    } catch (err) {
      console.error("Fetch salaries failed:", err);
    }
  },

  createSalary: async (salaryData) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/salaries`, {
        method: "POST",
        headers: {
          ...getHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(salaryData),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Salary processing failed" }));
        throw new Error(errData.message || "Salary processing failed");
      }
      const newSalary = await res.json();
      set((state) => {
        const filtered = state.salaries.filter((s) => s._id !== newSalary._id);
        return { salaries: [newSalary, ...filtered].sort((a, b) => b.year - a.year || b.month - a.month) };
      });
    } catch (err) {
      console.error("Create salary failed:", err);
      throw err;
    }
  },

  updateSalary: async (id, salaryData) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/salaries/${id}`, {
        method: "PUT",
        headers: {
          ...getHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(salaryData),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Salary update failed" }));
        throw new Error(errData.message || "Salary update failed");
      }
      const updatedSalary = await res.json();
      set((state) => {
        const filtered = state.salaries.filter((s) => s._id !== id);
        return { salaries: [updatedSalary, ...filtered].sort((a, b) => b.year - a.year || b.month - a.month) };
      });
    } catch (err) {
      console.error("Update salary failed:", err);
      throw err;
    }
  },

  deleteSalary: async (id) => {
    const { token } = get();
    try {
      const res = await fetch(`${API_URL}/api/salaries/${id}`, {
        method: "DELETE",
        headers: getHeaders(token),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Salary deletion failed" }));
        throw new Error(errData.message || "Salary deletion failed");
      }
      set((state) => ({
        salaries: state.salaries.filter((s) => s._id !== id),
      }));
    } catch (err) {
      console.error("Delete salary failed:", err);
      throw err;
    }
  },
}),
{
  name: "ktm-decor-dashboard-storage",
  storage: createJSONStorage(() => localStorage),
    // Persist only raw data collections and visual settings, skipping connection objects and helper functions
    partialize: (state) => ({
      user: state.user,
      token: state.token,
      theme: state.theme,
      focusMode: state.focusMode,
      activeStaffProfile: state.activeStaffProfile,
    }),
  }
)
);
