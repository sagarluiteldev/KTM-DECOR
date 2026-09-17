import React, { useState, useEffect, useMemo } from "react";
import { useStore } from "../store/useStore";
import {
  Activity as ActivityIcon,
  CheckCircle,
  Clock,
  TrendingUp,
  FileText,
  Pin,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  Package,
  Briefcase,
  User,
  Eye,
  Phone,
  MapPin,
  X,
  Truck,
  Wrench,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard
} from "./ui/solar-icons";
import { Printer, Download, History, ArrowUpRight, ArrowDownRight, Layers } from "lucide-react";
import { OrderDetailModal } from "./OrderDetailModal";
import { StatementPreviewModal } from "./StatementPreviewModal";
import { RevenueGrowthChart } from "./RevenueGrowthChart";
import { SalesExpensesTrendChart } from "./SalesExpensesTrendChart";
import {
  formatNepali,
  formatNepaliShort,
  getCurrentNepaliDate,
  NEPALI_MONTHS,
  NEPALI_YEARS,
  formatArchiveStatementLabel,
  adToBs,
} from "../utils/nepaliDate";

interface OverviewProps {
  setCurrentTab: (tab: string) => void;
  openTaskModal: () => void;
  openCampaignModal: () => void;
}

export const DashboardOverview: React.FC<OverviewProps> = ({
  setCurrentTab,
  openTaskModal,
  openCampaignModal
}) => {
  const {
    theme,
    user,
    tasks,
    campaigns,
    activities,
    quickNotes,
    addQuickNote,
    deleteQuickNote,
    users,
    activeStaffProfile,
    orders,
    expenses,
    purchases,
    sales,
    exportStatement,
    exportInventory,
    statementArchives,
    fetchStatementArchives,
    downloadArchive,
    fetchStatementData,
    fetchArchiveData,
    fetchPurchases,
    fetchExpenses,
    fetchSales
  } = useStore();

  const [noteText, setNoteText] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  // Statement PDF Preview Modal States
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Outstanding Due Modal States
  const [showOutstandingModal, setShowOutstandingModal] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<any>(null);

  const currentBs = getCurrentNepaliDate();

  // Statement Export States
  const [exportMonth, setExportMonth] = useState<string>(currentBs.month.toString());
  const [exportYear, setExportYear] = useState<string>(currentBs.year.toString());
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [overviewChartType, setOverviewChartType] = useState<"revenue" | "dual">("dual");

  // Overview BS Month & Year Active Period Filtering (defaults strictly to current active BS month)
  const [overviewSubTab, setOverviewSubTab] = useState<"general" | "monthly">("general");
  const [overviewMonth, setOverviewMonth] = useState<number>(currentBs.month);
  const [overviewYear, setOverviewYear] = useState<number>(currentBs.year);
  const [viewMode, setViewMode] = useState<"monthly" | "all_time">("monthly");

  const lastBsMonth = currentBs.month === 1 ? 12 : currentBs.month - 1;
  const lastBsYear = currentBs.month === 1 ? currentBs.year - 1 : currentBs.year;

  const isCurrentMonth = overviewMonth === currentBs.month && overviewYear === currentBs.year && viewMode === "monthly";
  const isLastMonth = overviewMonth === lastBsMonth && overviewYear === lastBsYear && viewMode === "monthly";

  // Check if a given date falls in the selected BS month/year
  const isDateInSelectedPeriod = (dateVal?: Date | string | null) => {
    if (!dateVal) return false;
    if (viewMode === "all_time") return true;
    const bs = adToBs(dateVal);
    return bs.month === overviewMonth && bs.year === overviewYear;
  };

  const handlePrevMonth = () => {
    setViewMode("monthly");
    if (overviewMonth === 1) {
      setOverviewMonth(12);
      setOverviewYear((prev) => prev - 1);
    } else {
      setOverviewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    setViewMode("monthly");
    if (overviewMonth === 12) {
      setOverviewMonth(1);
      setOverviewYear((prev) => prev + 1);
    } else {
      setOverviewMonth((prev) => prev + 1);
    }
  };

  const handleGoToCurrentMonth = () => {
    setViewMode("monthly");
    setOverviewMonth(currentBs.month);
    setOverviewYear(currentBs.year);
  };

  const handleGoToLastMonth = () => {
    setViewMode("monthly");
    setOverviewMonth(lastBsMonth);
    setOverviewYear(lastBsYear);
  };

  useEffect(() => {
    if (user?.role === "admin") {
      fetchStatementArchives();
      if (!purchases || purchases.length === 0) {
        fetchPurchases();
      }
      if (!expenses || expenses.length === 0) {
        fetchExpenses();
      }
      if (!sales || sales.length === 0) {
        fetchSales();
      }
    }
  }, [user, fetchStatementArchives, fetchPurchases, fetchExpenses, fetchSales, purchases?.length, expenses?.length, sales?.length]);

  const handlePreviewStatement = async (type: string) => {
    try {
      setPreviewLoading(true);
      setPreviewModalOpen(true);
      const data = await fetchStatementData(type, exportMonth, exportYear);
      setPreviewData(data);
    } catch (err) {
      alert("Failed to load statement: " + (err instanceof Error ? err.message : String(err)));
      setPreviewModalOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePreviewArchive = async (archiveId: string) => {
    try {
      setPreviewLoading(true);
      setPreviewModalOpen(true);
      const data = await fetchArchiveData(archiveId);
      setPreviewData(data);
    } catch (err) {
      alert("Failed to load archive statement: " + (err instanceof Error ? err.message : String(err)));
      setPreviewModalOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExport = async (type: string) => {
    setExportingType(type);
    try {
      if (type === "inventory") {
        await exportInventory();
      } else {
        await exportStatement(type, exportMonth, exportYear);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to export statement: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setExportingType(null);
    }
  };

  // Safe orders array
  const safeOrders = Array.isArray(orders) ? orders : [];

  // Scoped orders strictly for the selected BS month/year
  const scopedOrders = safeOrders.filter(
    (o) => !o.deleted && isDateInSelectedPeriod(o.orderDate || o.createdAt)
  );

  // Get list of active/completed orders with outstanding due payment > 0 for the selected period
  const outstandingOrdersList = scopedOrders.filter((o) => o.duePayment > 0);

  // Defensive guard: ensure quickNotes is always an array for rendering
  const safeQuickNotes = Array.isArray(quickNotes) ? quickNotes : [];

  // Completed tasks sorted chronologically by completion date (updatedAt)
  const completedTasks = tasks
    .filter((t) => t.status === "done")
    .sort((a, b) => new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime());

  // Approved manual orders for selected period
  const scopedApprovedOrders = scopedOrders
    .filter((o) => o.approved && (o.stage === "delivered" || o.stage === "paid"))
    .sort((a, b) => new Date(a.approvedAt || a.updatedAt || a.createdAt).getTime() - new Date(b.approvedAt || b.updatedAt || b.createdAt).getTime());

  // All-time approved orders for timeline reference if needed
  const approvedOrders = scopedApprovedOrders;

  // Active orders are those in design, manufacturing, or completed (not yet delivered or paid) in selected period
  const activeOrdersCount = scopedOrders.filter((o) => o.stage !== "delivered" && o.stage !== "paid").length;

  // Dynamic Sales: Sum of total cost of completed tasks + sales ledger entries in active period
  const taskSales = completedTasks
    .filter((t) => isDateInSelectedPeriod(t.updatedAt || t.createdAt))
    .reduce((acc, t) => acc + (t.totalCost || 0), 0);

  // Safe array check for sales
  const safeSales = Array.isArray(sales) ? sales : [];

  // Map orders by ID for guaranteed accurate base price resolution
  const ordersMap = new Map(safeOrders.map((o) => [o._id.toString(), o]));

  // Order sales strictly reflect product base price without delivery or fitting charges
  const orderSales = safeSales
    .filter((s) => {
      if (!s.orderId) return false;
      const orderIdStr = (typeof s.orderId === "object" && s.orderId !== null)
        ? (s.orderId as any)._id?.toString()
        : s.orderId?.toString();
      const matchedOrder = orderIdStr ? ordersMap.get(orderIdStr) : undefined;
      const effectiveDate = (matchedOrder && matchedOrder.orderDate) ? matchedOrder.orderDate : s.date;
      return isDateInSelectedPeriod(effectiveDate);
    })
    .reduce((acc, s) => {
      const orderIdStr = (typeof s.orderId === "object" && s.orderId !== null)
        ? (s.orderId as any)._id?.toString()
        : s.orderId?.toString();
      const matchedOrder = orderIdStr ? ordersMap.get(orderIdStr) : undefined;

      const pPrice = matchedOrder
        ? (Number(matchedOrder.price) || 0)
        : (s.orderId && typeof s.orderId === "object" && "price" in s.orderId)
          ? (Number((s.orderId as any).price) || 0)
          : (Number(s.amount) || 0);
      return acc + pPrice;
    }, 0);

  const directSales = safeSales
    .filter((s) => !s.orderId && isDateInSelectedPeriod(s.date))
    .reduce((acc, s) => acc + (s.amount || 0), 0);

  const totalSales = taskSales + orderSales + directSales;

  // Delivery and Fitting charges calculated from orders in active period
  const totalDeliveryCharges = scopedOrders.reduce((acc, o) => acc + (o.deliveryPrice || 0), 0);
  const totalFittingCharges = scopedOrders.reduce((acc, o) => acc + (o.installationPrice || 0), 0);
  const totalDuePayment = scopedOrders.reduce((acc, o) => acc + (o.duePayment || 0), 0);

  const pendingTasks = tasks.filter((t) => t.status !== "done");
  const scopedPendingTasks = tasks.filter((t) => t.status !== "done" && isDateInSelectedPeriod(t.dueDate || t.createdAt));
  const completedTasksCount = completedTasks.filter((t) => isDateInSelectedPeriod(t.updatedAt || t.createdAt)).length;
  const completedWorkCount = completedTasksCount + scopedApprovedOrders.length;
  const pinnedTasks = tasks.filter((t) => t.pinned && t.status !== "done");

  // Scoped calculations for Overview Cards
  const scopedExpenses = expenses.filter((e) => isDateInSelectedPeriod(e.date));
  const scopedPurchases = purchases.filter((p) => isDateInSelectedPeriod(p.date));

  const totalExpensesVal = scopedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPurchasesVal = scopedPurchases.reduce((sum, p) => sum + p.amount, 0);
  const netProfitVal = totalSales - (totalExpensesVal + totalPurchasesVal);
  const outstandingPurchasesVal = scopedPurchases.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);
  const profitMarginVal = totalSales > 0 ? Math.round((netProfitVal / totalSales) * 100) : 0;

  const expenseCategorySums = {
    salary: scopedExpenses.filter((e) => e.category === "salary").reduce((sum, e) => sum + e.amount, 0),
    rent: scopedExpenses.filter((e) => e.category === "rent").reduce((sum, e) => sum + e.amount, 0),
    travel: scopedExpenses.filter((e) => e.category === "travel").reduce((sum, e) => sum + e.amount, 0),
    food: scopedExpenses.filter((e) => e.category === "food").reduce((sum, e) => sum + e.amount, 0),
    miscellaneous: scopedExpenses.filter((e) => e.category === "miscellaneous").reduce((sum, e) => sum + e.amount, 0),
  };

  // Unified Chronological Monthly Transactions
  const monthlyTransactions = useMemo(() => {
    const list: {
      id: string;
      type: "sale" | "expense" | "purchase";
      date: string | Date;
      bsDate: string;
      title: string;
      party: string;
      categoryOrMethod: string;
      amount: number;
      isInflow: boolean;
      status?: string;
    }[] = [];

    // Add Sales
    safeSales.forEach((s) => {
      const orderIdStr = (typeof s.orderId === "object" && s.orderId !== null)
        ? (s.orderId as any)._id?.toString()
        : s.orderId?.toString();
      const matchedOrder = orderIdStr ? ordersMap.get(orderIdStr) : undefined;
      const effectiveDate = (matchedOrder && matchedOrder.orderDate) ? matchedOrder.orderDate : s.date;

      if (isDateInSelectedPeriod(effectiveDate)) {
        const pPrice = matchedOrder
          ? (Number(matchedOrder.price) || 0)
          : (Number(s.amount) || 0);

        list.push({
          id: `sale-${s._id}`,
          type: "sale",
          date: effectiveDate,
          bsDate: formatNepali(effectiveDate),
          title: s.productName,
          party: s.clientName,
          categoryOrMethod: s.paymentMethod ? s.paymentMethod.replace("_", " ") : "cash",
          amount: pPrice,
          isInflow: true,
          status: "received"
        });
      }
    });

    // Add Expenses
    scopedExpenses.forEach((e) => {
      list.push({
        id: `exp-${e._id}`,
        type: "expense",
        date: e.date,
        bsDate: formatNepali(e.date),
        title: e.title,
        party: e.description ? e.description.slice(0, 40) : "Expense",
        categoryOrMethod: e.category,
        amount: e.amount,
        isInflow: false,
        status: "paid"
      });
    });

    // Add Purchases
    scopedPurchases.forEach((p) => {
      list.push({
        id: `pur-${p._id}`,
        type: "purchase",
        date: p.date,
        bsDate: formatNepali(p.date),
        title: p.itemDetails || "Purchase Order",
        party: p.supplier,
        categoryOrMethod: p.status === "paid" ? "Paid" : "Pending",
        amount: p.amount,
        isInflow: false,
        status: p.status
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [safeSales, scopedExpenses, scopedPurchases, overviewMonth, overviewYear, viewMode]);

  const activeId = user?.email === "staff@ktmdecor.com" ? activeStaffProfile?._id : user?._id;

  const getOrderPriority = (deliveryDateStr: string | Date) => {
    if (!deliveryDateStr) return "low";
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const delivery = new Date(deliveryDateStr);
    delivery.setHours(0, 0, 0, 0);
    const diffTime = delivery.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 2) return "high";
    if (diffDays <= 5) return "medium";
    return "low";
  };

  const staffPendingOrders = orders
    .filter((o) => o.assignee?._id === activeId && o.deleted !== true && o.stage !== "delivered" && o.stage !== "paid")
    .map((o) => ({
      _id: o._id,
      title: `Order: ${o.productName}`,
      description: `Client: ${o.customerName} | Size: ${o.size} | Color: ${o.color}`,
      priority: getOrderPriority(o.deliveryDate),
      dueDate: o.deliveryDate,
      status: o.stage,
      isOrder: true,
    }));

  const staffCompletedOrders = orders
    .filter((o) => o.assignee?._id === activeId && o.deleted !== true && (o.stage === "delivered" || o.stage === "paid" || o.approved))
    .map((o) => ({
      _id: o._id,
      title: `Order: ${o.productName}`,
      description: `Client: ${o.customerName} | Size: ${o.size} | Color: ${o.color}`,
      priority: "low",
      dueDate: o.deliveryDate,
      status: "done",
      isOrder: true,
    }));

  // Staff specific pending tasks
  const staffPendingTasks: any[] = [
    ...pendingTasks.filter((t) => t.assignee?._id === activeId),
    ...staffPendingOrders,
  ];

  // Staff specific completed tasks
  const staffCompletedTasks: any[] = [
    ...completedTasks.filter((t) => t.assignee?._id === activeId),
    ...staffCompletedOrders,
  ];

  // Generate sales chart data points (merging tasks and approved orders chronologically)
  const getSalesChartData = () => {
    const points: { label: string; value: number }[] = [{ label: "Start", value: 0 }];
    
    const revenueItems: { date: Date; value: number }[] = [];
    
    completedTasks.forEach((t) => {
      revenueItems.push({
        date: new Date(t.updatedAt || t.createdAt),
        value: t.totalCost || 0
      });
    });
    
    safeSales.forEach((s) => {
      const orderIdStr = (typeof s.orderId === "object" && s.orderId !== null)
        ? (s.orderId as any)._id?.toString()
        : s.orderId?.toString();
      const matchedOrder = orderIdStr ? ordersMap.get(orderIdStr) : undefined;
      const pPrice = matchedOrder
        ? (Number(matchedOrder.price) || 0)
        : (s.orderId && typeof s.orderId === "object" && "price" in s.orderId)
          ? (Number((s.orderId as any).price) || 0)
          : (Number(s.amount) || 0);

      revenueItems.push({
        date: new Date(s.date),
        value: pPrice
      });
    });

    // Sort chronologically
    revenueItems.sort((a, b) => a.date.getTime() - b.date.getTime());

    let cumulative = 0;
    revenueItems.forEach((item) => {
      cumulative += item.value;
      const dateStr = formatNepaliShort(item.date);
      points.push({ label: dateStr, value: cumulative });
    });

    if (points.length === 1) {
      points.push({ label: "Today", value: 0 });
    }

    return points;
  };

  // Sparkline data helpers matching mockup design
  const getSparklineData = (type: "sales" | "orders" | "tasks" | "completed") => {
    if (type === "sales") {
      // Last 6 cumulative sales data points
      const data = getSalesChartData().slice(-6).map((d) => d.value);
      while (data.length < 6) data.unshift(0);
      return data;
    }
    if (type === "orders") {
      const events: { date: Date; change: number }[] = [];
      orders.forEach((o) => {
        if (o.deleted) return;
        events.push({ date: new Date(o.createdAt), change: 1 });
        if (o.stage === "delivered" || o.stage === "paid" || o.approved) {
          const compDate = new Date(o.approvedAt || o.updatedAt || o.createdAt);
          events.push({ date: compDate, change: -1 });
        }
      });
      events.sort((a, b) => a.date.getTime() - b.date.getTime());
      let currentCount = 0;
      const timeline: number[] = [];
      events.forEach((ev) => {
        currentCount += ev.change;
        timeline.push(Math.max(currentCount, 0));
      });
      const data = timeline.slice(-6);
      while (data.length < 6) data.unshift(0);
      return data;
    }
    if (type === "tasks") {
      const events: { date: Date; change: number }[] = [];
      tasks.forEach((t) => {
        events.push({ date: new Date(t.createdAt), change: 1 });
        if (t.status === "done") {
          const compDate = new Date(t.updatedAt || t.createdAt);
          events.push({ date: compDate, change: -1 });
        }
      });
      events.sort((a, b) => a.date.getTime() - b.date.getTime());
      let currentCount = 0;
      const timeline: number[] = [];
      events.forEach((ev) => {
        currentCount += ev.change;
        timeline.push(Math.max(currentCount, 0));
      });
      const data = timeline.slice(-6);
      while (data.length < 6) data.unshift(0);
      return data;
    }
    if (type === "completed") {
      const events: { date: Date }[] = [];
      tasks.forEach((t) => {
        if (t.status === "done") {
          events.push({ date: new Date(t.updatedAt || t.createdAt) });
        }
      });
      orders.forEach((o) => {
        if (o.deleted) return;
        if (o.stage === "delivered" || o.stage === "paid" || o.approved) {
          const compDate = new Date(o.approvedAt || o.updatedAt || o.createdAt);
          events.push({ date: compDate });
        }
      });
      events.sort((a, b) => a.date.getTime() - b.date.getTime());
      let cumulativeCount = 0;
      const timeline: number[] = [];
      events.forEach(() => {
        cumulativeCount += 1;
        timeline.push(cumulativeCount);
      });
      const data = timeline.slice(-6);
      while (data.length < 6) data.unshift(0);
      return data;
    }
    return [0, 0, 0, 0, 0, 0];
  };

  const renderMiniBarChart = (data: number[], colorClass: string) => {
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min;
    return (
      <svg className="w-16 h-10 overflow-visible" viewBox="0 0 64 40">
        {data.map((val, idx) => {
          const barHeight = range > 0 ? ((val - min) / range) * 28 : 10;
          const x = idx * 10.5;
          const y = 36 - barHeight;
          return (
            <rect
              key={idx}
              x={x}
              y={y}
              width="6.5"
              height={Math.max(barHeight, 2)}
              rx="1.5"
              className={colorClass}
            />
          );
        })}
      </svg>
    );
  };

  const renderMiniLineChart = (
    data: number[],
    strokeColor: string,
    fillGradientId: string,
    darkStrokeColor?: string
  ) => {
    const isDark = theme === "dark";
    const effectiveStroke = isDark && darkStrokeColor ? darkStrokeColor : strokeColor;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min;
    const points = data.map((val, idx) => {
      const x = idx * 11.5;
      const y = range > 0 ? 34 - ((val - min) / range) * 28 : 20;
      return { x, y };
    });
    let lineD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p = points[i];
      const cpX1 = p0.x + (p.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p.x - p0.x) / 2;
      const cpY2 = p.y;
      lineD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
    }
    const areaD = `${lineD} L ${points[points.length - 1].x} 38 L ${points[0].x} 38 Z`;
    const gradId = `${fillGradientId}-${isDark ? "dark" : "light"}`;
    return (
      <svg className="w-16 h-10 overflow-visible" viewBox="0 0 64 40">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={effectiveStroke} stopOpacity="0.3" />
            <stop offset="100%" stopColor={effectiveStroke} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} />
        <path d={lineD} fill="none" stroke={effectiveStroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill={effectiveStroke} />
      </svg>
    );
  };

  // Sticky notes colors
  const stickyColors = [
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800/50",
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/50",
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800/50",
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 border-purple-200 dark:border-purple-800/50"
  ];

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    addQuickNote(noteText.trim());
    setNoteText("");
    setShowNoteInput(false);
  };

  // Staff Performance list (completed tasks and orders per user)
  const getStaffPerformance = (): { name: string; completed: number; pending: number }[] => {
    const perfMap: { [key: string]: { name: string; completed: number; pending: number } } = {};
    
    // Initialize with all users
    users.forEach((u) => {
      perfMap[u._id] = { name: u.name, completed: 0, pending: 0 };
    });

    tasks.forEach((t) => {
      const assigneeId = t.assignee?._id;
      if (assigneeId && perfMap[assigneeId]) {
        if (t.status === "done") {
          perfMap[assigneeId].completed += 1;
        } else {
          perfMap[assigneeId].pending += 1;
        }
      }
    });

    orders.forEach((o) => {
      const assigneeId = o.assignee?._id;
      if (assigneeId && perfMap[assigneeId] && o.deleted !== true) {
        if (o.stage === "delivered" || o.approved) {
          perfMap[assigneeId].completed += 1;
        } else {
          perfMap[assigneeId].pending += 1;
        }
      }
    });

    return Object.values(perfMap).sort((a, b) => b.completed - a.completed);
  };

  const staffPerformance = getStaffPerformance();

  return (
    <div className="space-y-6 relative">
      {/* Personalized Greeting & Sub-Section Switcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">
            Welcome back, <span className="text-accent">
              {(user?.email === "staff@ktmdecor.com" && activeStaffProfile)
                ? activeStaffProfile.name.split(" ")[0]
                : user?.name.split(" ")[0]}
            </span>!
          </h1>
          <p className="text-muted text-sm mt-1">
            {user?.role === "admin"
              ? overviewSubTab === "general"
                ? "Here's what is happening across KTM DECOR today."
                : "Inspecting monthly financial performance and records."
              : "Review your pending items and get started on today's tasks."}
          </p>
        </div>

        {/* Admin Sub-Section Switcher: General Overview vs Monthly Data */}
        {user?.role === "admin" && (
          <div className="flex items-center gap-1.5 p-1.5 bg-card border border-border/80 rounded-2xl shadow-xs self-start md:self-auto">
            <button
              onClick={() => setOverviewSubTab("general")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                overviewSubTab === "general"
                  ? "bg-foreground text-background shadow-xs"
                  : "text-muted hover:text-foreground hover:bg-muted/20"
              }`}
            >
              <LayoutDashboard size={15} />
              <span>General Overview</span>
            </button>
            <button
              onClick={() => setOverviewSubTab("monthly")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                overviewSubTab === "monthly"
                  ? "bg-foreground text-background shadow-xs"
                  : "text-muted hover:text-foreground hover:bg-muted/20"
              }`}
            >
              <Calendar size={15} />
              <span>Monthly Data</span>
            </button>
          </div>
        )}
      </div>

      {overviewSubTab === "general" ? (
        <>
          {/* ─── PINNED / HIGH PRIORITY SECTION ─── */}
      {pinnedTasks.length > 0 && (
        <div className="border border-red-500/20 bg-red-500/5 dark:bg-red-500/10 rounded-lg p-4 animate-pulse-dots">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-display font-bold text-sm mb-3">
            <Pin size={16} className="rotate-45" />
            PINNED & URGENT DELIVERABLES
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pinnedTasks.map((task) => (
              <div
                key={task._id}
                className="bg-card border border-border p-3.5 rounded-md flex justify-between items-start gap-4 shadow-sm"
              >
                <div>
                  <h3 className="font-semibold text-sm line-clamp-1">{task.title}</h3>
                  <p className="text-xs text-muted mt-1 line-clamp-2">
                    {task.description || "No description provided."}
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-[10px] border border-red-500/25 text-red-600 dark:text-red-400 px-2 py-0.5 rounded font-medium">
                      {task.priority.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-muted font-medium">
                      Assignee: {task.assignee?.name || "Deleted User"}
                    </span>
                    <span className="text-[10px] text-muted font-medium flex items-center gap-1">
                      <Clock size={10} />
                      Due: {formatNepali(task.dueDate)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* METRIC CARD STATS FOR ADMIN OR STAFF */}
      {user?.role === "admin" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Sales Card (Signature Sunset Gradient Hero Card) */}
            <div
              className="relative rounded-[28px] p-6 shadow-xl shadow-orange-500/10 overflow-hidden flex flex-col justify-between transition-all hover:scale-[1.01]"
              style={{
                background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)",
              }}
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-black/85 uppercase tracking-wider block">Total Sales</span>
                    <span className="text-[10px] font-bold text-black bg-black/20 px-2.5 py-0.5 rounded-full border border-black/25">Product Only</span>
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-semibold font-display text-black leading-none mt-2">
                    Rs. {totalSales.toLocaleString()}
                  </h3>
                </div>
                <div className="p-2.5 bg-black text-white rounded-2xl shadow-md shrink-0">
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 relative z-10">
                <span className="text-xs text-black/75 font-medium">Excl. delivery & fitting</span>
                {renderMiniBarChart(
                  getSparklineData("sales"),
                  theme === "dark"
                    ? "fill-[#F4F4F5] hover:fill-white transition-colors"
                    : "fill-black/70 hover:fill-black transition-colors"
                )}
              </div>
            </div>

            {/* Active Orders Card (Crisp Porcelain Card) */}
            <div className="bg-card border border-border/80 shadow-sm hover:shadow-md transition-all rounded-[28px] p-6 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-muted font-bold uppercase tracking-wider block">Active Orders</span>
                  <h3 className="text-3xl sm:text-4xl font-semibold font-display text-foreground leading-none mt-2">{activeOrdersCount}</h3>
                </div>
                <div
                  style={{ background: "linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #1D4ED8 100%)" }}
                  className="p-2.5 text-white rounded-2xl shadow-md shadow-blue-500/20 shrink-0"
                >
                  <Package size={18} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-1.5">
                  <span className="bg-neutral-200 dark:bg-neutral-200 text-black dark:text-black border border-neutral-300 dark:border-neutral-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    ↓ 4.8%
                  </span>
                  <span className="text-xs text-muted font-medium">vs last week</span>
                </div>
                {renderMiniBarChart(
                  getSparklineData("orders"),
                  theme === "dark"
                    ? "fill-white hover:fill-white/90 transition-colors"
                    : "fill-blue-500/80 hover:fill-blue-600 transition-colors"
                )}
              </div>
            </div>

            {/* Pending Tasks Card (Crisp Porcelain Card) */}
            <div className="bg-card border border-border/80 shadow-sm hover:shadow-md transition-all rounded-[28px] p-6 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-muted font-bold uppercase tracking-wider block">Pending Tasks</span>
                  <h3 className="text-3xl sm:text-4xl font-semibold font-display text-foreground leading-none mt-2">{pendingTasks.length}</h3>
                </div>
                <div
                  style={{ background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #D97706 100%)" }}
                  className="p-2.5 text-white rounded-2xl shadow-md shadow-amber-500/20 shrink-0"
                >
                  <Clock size={18} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-1.5">
                  <span className="bg-neutral-200 dark:bg-neutral-200 text-black dark:text-black border border-neutral-300 dark:border-neutral-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    ↓ 15.2%
                  </span>
                  <span className="text-xs text-muted font-medium">vs yesterday</span>
                </div>
                {renderMiniLineChart(getSparklineData("tasks"), "#d97706", "amber-spark")}
              </div>
            </div>

            {/* Completed Work Card (Crisp Porcelain Card) */}
            <div className="bg-card border border-border/80 shadow-sm hover:shadow-md transition-all rounded-[28px] p-6 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-muted font-bold uppercase tracking-wider block">Completed Work</span>
                  <h3 className="text-3xl sm:text-4xl font-semibold font-display text-foreground leading-none mt-2">{completedWorkCount}</h3>
                </div>
                <div
                  style={{ background: "linear-gradient(135deg, #34D399 0%, #10B981 50%, #059669 100%)" }}
                  className="p-2.5 text-white rounded-2xl shadow-md shadow-emerald-500/20 shrink-0"
                >
                  <CheckCircle size={18} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-1.5">
                  <span className="bg-neutral-200 dark:bg-neutral-200 text-black dark:text-black border border-neutral-300 dark:border-neutral-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    ↑ 8.3%
                  </span>
                  <span className="text-xs text-muted font-medium">vs last week</span>
                </div>
                {renderMiniLineChart(getSparklineData("completed"), "#2563eb", "blue-spark")}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Delivery Charges */}
            <div className="bg-card border border-border/80 shadow-sm hover:shadow-md transition-all p-6 rounded-[28px] flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-muted font-bold uppercase tracking-wider block">Total Delivery Charges</span>
                <h3 className="text-2xl sm:text-3xl font-semibold font-display text-blue-600 dark:text-blue-400">Rs. {totalDeliveryCharges.toLocaleString()}</h3>
                <p className="text-xs text-muted">Separate delivery fees (not in Total Sales)</p>
              </div>
              <div
                style={{ background: "linear-gradient(135deg, #38BDF8 0%, #0284C7 50%, #0369A1 100%)" }}
                className="p-3 text-white rounded-2xl shadow-md shadow-sky-500/20 shrink-0"
              >
                <Truck size={22} />
              </div>
            </div>

            {/* Total Fitting Charges */}
            <div className="bg-card border border-border/80 shadow-sm hover:shadow-md transition-all p-6 rounded-[28px] flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-muted font-bold uppercase tracking-wider block">Total Fitting Charges</span>
                <h3 className="text-2xl sm:text-3xl font-semibold font-display text-purple-600 dark:text-purple-400">Rs. {totalFittingCharges.toLocaleString()}</h3>
                <p className="text-xs text-muted">Separate installation fees (not in Total Sales)</p>
              </div>
              <div
                style={{ background: "linear-gradient(135deg, #C084FC 0%, #9333EA 50%, #7E22CE 100%)" }}
                className="p-3 text-white rounded-2xl shadow-md shadow-purple-500/20 shrink-0"
              >
                <Wrench size={22} />
              </div>
            </div>

            {/* Outstanding Receivables */}
            <div 
              onClick={() => setShowOutstandingModal(true)}
              className="bg-card border border-border/80 shadow-sm hover:shadow-md transition-all p-6 rounded-[28px] flex items-center justify-between cursor-pointer hover:border-red-500/30 hover:bg-red-500/[0.01] group"
            >
              <div className="space-y-1">
                <span className="text-xs text-muted font-bold uppercase tracking-wider block group-hover:text-red-500 transition-colors">Total Outstanding Due</span>
                <h3 className="text-2xl sm:text-3xl font-semibold font-display text-red-500">Rs. {totalDuePayment.toLocaleString()}</h3>
                <p className="text-xs text-muted">Receivables remaining from active/completed orders (Click to view)</p>
              </div>
              <div
                style={{ background: "linear-gradient(135deg, #F87171 0%, #EF4444 50%, #DC2626 100%)" }}
                className="p-3 text-white rounded-2xl shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform shrink-0"
              >
                <Clock size={22} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        // STAFF PERSONAL METRICS CARD
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            className="relative rounded-[28px] p-6 shadow-xl shadow-orange-500/10 overflow-hidden flex items-center justify-between transition-all hover:scale-[1.01]"
            style={{
              background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)",
            }}
          >
            <div className="space-y-2 relative z-10">
              <span className="text-xs font-semibold text-black/85 uppercase tracking-wider block">Your Pending Tasks</span>
              <h3 className="text-3xl sm:text-4xl font-semibold font-display text-black leading-none">{staffPendingTasks.length}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-black/10 text-black border border-black/10 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  Active
                </span>
                <span className="text-xs text-black/75 font-medium">Awaiting completion</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 relative z-10">
              <div className="p-2.5 bg-black text-white rounded-2xl shadow-md">
                <Clock size={20} />
              </div>
              {renderMiniLineChart(getSparklineData("tasks"), "#000000", "staff-tasks-spark")}
            </div>
          </div>

          <div className="bg-card border border-border/80 shadow-sm hover:shadow-md transition-all p-6 rounded-[28px] flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs text-muted font-bold uppercase tracking-wider block">Your Completed Tasks</span>
              <h3 className="text-3xl sm:text-4xl font-semibold font-display text-emerald-600 dark:text-emerald-400 leading-none">{staffCompletedTasks.length}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  Completed
                </span>
                <span className="text-xs text-muted font-medium">Finished work items</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div
                style={{ background: "linear-gradient(135deg, #34D399 0%, #10B981 50%, #059669 100%)" }}
                className="p-2.5 text-white rounded-2xl shadow-md shadow-emerald-500/20"
              >
                <CheckCircle size={20} />
              </div>
              {renderMiniLineChart(getSparklineData("completed"), "#10b981", "staff-completed-spark")}
            </div>
          </div>

          <div className="bg-card border border-border/80 shadow-sm hover:shadow-md transition-all p-6 rounded-[28px] flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs text-muted font-bold uppercase tracking-wider block">Marketing Hub</span>
              <h3 className="text-3xl sm:text-4xl font-semibold font-display text-blue-600 dark:text-blue-400 leading-none">{campaigns.length}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  Active
                </span>
                <span className="text-xs text-muted font-medium">Coordinated campaigns</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div
                style={{ background: "linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #1D4ED8 100%)" }}
                className="p-2.5 text-white rounded-2xl shadow-md shadow-blue-500/20"
              >
                <FileText size={20} />
              </div>
              {renderMiniBarChart([4, 5, 3, 6, 4, campaigns.length], "fill-blue-500/80 hover:fill-blue-500 transition-colors")}
            </div>
          </div>
        </div>
      )}

      {/* FINANCIAL OVERVIEW CARD SECTION */}
      {user?.role === "admin" && (
        <div className="space-y-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {/* Net Operating Profit Card (Signature Card) */}
            <div className="bg-card border border-border/80 rounded-[28px] shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between min-h-[260px]">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider block">Net Operating Profit</span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      netProfitVal >= 0
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                    }`}
                  >
                    {netProfitVal >= 0 ? "Surplus" : "Deficit"}
                  </span>
                </div>
                <div className="mb-3">
                  <h4
                    className={`text-3xl sm:text-4xl font-semibold font-display leading-none ${
                      netProfitVal >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    Rs. {netProfitVal.toLocaleString()}
                  </h4>
                </div>
                <div className="space-y-1.5 text-[11px] font-medium text-muted">
                  <div className="flex justify-between items-center">
                    <span>Revenue:</span>
                    <span className="font-bold text-foreground">Rs. {totalSales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Expenses:</span>
                    <span className="font-bold text-foreground">Rs. {totalExpensesVal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Purchases:</span>
                    <span className="font-bold text-foreground">Rs. {totalPurchasesVal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handlePreviewStatement("all")}
                className="text-left text-xs font-bold text-accent hover:text-accent-dark transition-colors mt-2 flex items-center gap-1 cursor-pointer"
              >
                <span>Preview Statement</span>
                <span>&rarr;</span>
              </button>
            </div>

            {/* Expenses Overview Card (Porcelain White Card) */}
            <div className="bg-card border border-border/80 rounded-[28px] shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between min-h-[260px]">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider block">Expenses Summary</span>
                  <span className="text-[10px] font-bold bg-neutral-200 dark:bg-neutral-800 text-black dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 px-2.5 py-0.5 rounded-full">
                    Outflows
                  </span>
                </div>
                <div className="mb-3">
                  <h4 className="text-3xl sm:text-4xl font-semibold font-display text-foreground leading-none">
                    Rs. {totalExpensesVal.toLocaleString()}
                  </h4>
                  <span className="text-xs text-muted font-medium mt-1 block">Total operating expenditures</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-medium text-muted">
                  <div className="flex justify-between">
                    <span>Salary:</span>
                    <span className="font-bold text-foreground">Rs. {expenseCategorySums.salary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rent:</span>
                    <span className="font-bold text-foreground">Rs. {expenseCategorySums.rent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Travel:</span>
                    <span className="font-bold text-foreground">Rs. {expenseCategorySums.travel.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Food:</span>
                    <span className="font-bold text-foreground">Rs. {expenseCategorySums.food.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setCurrentTab("expenses")}
                className="text-left text-xs font-bold text-accent hover:text-accent-dark transition-colors mt-2 flex items-center gap-1 cursor-pointer"
              >
                <span>View Expense Log</span>
                <span>&rarr;</span>
              </button>
            </div>

            {/* Purchases Tracker Card (Porcelain White Card) */}
            <div className="bg-card border border-border/80 rounded-[28px] shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between min-h-[260px]">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider block">Purchases Tracker</span>
                  <span className="text-[10px] font-bold bg-neutral-200 dark:bg-neutral-800 text-black dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 px-2.5 py-0.5 rounded-full">
                    {outstandingPurchasesVal > 0 ? "Pending Dues" : "Settled"}
                  </span>
                </div>
                <div className="mb-3">
                  <h4 className="text-3xl sm:text-4xl font-semibold font-display text-foreground leading-none">
                    Rs. {totalPurchasesVal.toLocaleString()}
                  </h4>
                  {outstandingPurchasesVal > 0 ? (
                    <span className="text-xs text-red-500 font-bold mt-1 block">Rs. {outstandingPurchasesVal.toLocaleString()} pending dues</span>
                  ) : (
                    <span className="text-xs text-muted font-medium mt-1 block">All vendor bills settled</span>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Recent Invoices</span>
                  {scopedPurchases.slice(0, 2).map((p) => (
                    <div key={p._id} className="flex justify-between items-center text-[11px] py-0.5">
                      <span className="truncate max-w-[130px] font-medium text-foreground">{p.supplier}</span>
                      <span className="text-foreground font-bold">Rs. {p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {scopedPurchases.length === 0 && (
                    <span className="text-[11px] text-muted italic">No purchases logged</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setCurrentTab("purchase")}
                className="text-left text-xs font-bold text-accent hover:text-accent-dark transition-colors mt-2 flex items-center gap-1 cursor-pointer"
              >
                <span>View Purchases Tracker</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECONDARY ROW GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: STAFF LIST (ADMIN) / TODAY'S SCHEDULE (STAFF) */}
        <div className="bg-card border border-border/80 rounded-[28px] shadow-sm hover:shadow-md transition-all p-6 flex flex-col h-[430px]">
          <div className="border-b border-border/60 pb-3.5 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="p-2 text-white rounded-xl shadow-md shrink-0"
                style={{
                  background: user?.role === "admin"
                    ? "linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #1D4ED8 100%)"
                    : "linear-gradient(135deg, #34D399 0%, #10B981 50%, #059669 100%)",
                }}
              >
                {user?.role === "admin" ? <TrendingUp size={16} /> : <CheckCircle size={16} />}
              </div>
              <h2 className="text-sm sm:text-base font-bold font-display text-foreground">
                {user?.role === "admin" ? "Staff Performance & Workload" : "Your Pending Schedule"}
              </h2>
            </div>
            {user?.role === "admin" ? (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-black dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700">
                {staffPerformance.length} Staff
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-black dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700">
                {staffPendingTasks.length} Pending
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {user?.role === "admin" ? (
              staffPerformance.map((staff) => {
                const total = staff.completed + staff.pending;
                const completionPct = total > 0 ? Math.round((staff.completed / total) * 100) : 0;
                return (
                  <div
                    key={staff.name}
                    className="p-4 rounded-2xl bg-background/60 border border-border/70 hover:bg-background hover:border-border transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-border/50 text-foreground font-bold text-xs flex items-center justify-center shrink-0 border border-border/60">
                          {staff.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-foreground leading-tight">{staff.name}</h4>
                          <span className="text-[11px] text-muted font-medium">
                            {staff.pending} tasks pending
                          </span>
                        </div>
                      </div>
                      <span className="border border-neutral-300 dark:border-neutral-700 text-black dark:text-neutral-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-neutral-200 dark:bg-neutral-800 flex items-center gap-1.5 shadow-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>{staff.completed} Done</span>
                      </span>
                    </div>
                    {/* Completion progress bar */}
                    <div className="w-full bg-border/40 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${completionPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : staffPendingTasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted">
                <CheckCircle size={40} className="text-emerald-500/30 mb-2" />
                <p className="text-sm font-medium">Great job! No pending tasks remaining today.</p>
              </div>
            ) : (
              staffPendingTasks.map((task) => (
                <div
                  key={task._id}
                  onClick={() => setCurrentTab(task.isOrder ? "order-progress" : "tasks")}
                  className="p-4 bg-background/60 border border-border/70 rounded-2xl hover:bg-background hover:border-accent hover:shadow-md cursor-pointer transition-all duration-200"
                >
                  <h4 className="font-bold text-sm line-clamp-1 text-foreground">{task.title}</h4>
                  <p className="text-xs text-muted mt-1 line-clamp-1 font-medium">
                    {task.description || "No description."}
                  </p>
                  <div className="flex justify-between items-center mt-3">
                    <span
                      className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase border ${
                        task.priority === "high"
                          ? "border-red-500/25 text-red-600 dark:text-red-400 bg-red-500/10"
                          : task.priority === "medium"
                          ? "border-amber-500/25 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                          : "border-green-500/25 text-green-600 dark:text-green-400 bg-green-500/10"
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span className="text-[10px] text-muted font-semibold">
                      Due: {formatNepali(task.dueDate)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MIDDLE COLUMN: LIVE ACTIVITY LOG (ADMIN) / OR FOCUS MODE NOTIFICATION BAR */}
        {user?.role === "admin" ? (
          <div className="bg-card border border-border/80 rounded-[28px] shadow-sm hover:shadow-md transition-all p-6 flex flex-col h-[430px]">
            <div className="border-b border-border/60 pb-3.5 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="p-2 text-white rounded-xl shadow-md shrink-0"
                  style={{ background: "linear-gradient(135deg, #C084FC 0%, #9333EA 50%, #7E22CE 100%)" }}
                >
                  <ActivityIcon size={16} />
                </div>
                <h2 className="text-sm sm:text-base font-bold font-display text-foreground">
                  Activity Audit Log
                </h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
              {activities.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted text-sm font-medium">
                  No activity logged yet
                </div>
              ) : (
                activities.map((act) => (
                  <div key={act._id} className="p-3.5 bg-background/60 border border-border/60 rounded-2xl text-xs space-y-1 hover:bg-background transition-colors">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                        {act.user?.name || "Deleted User"}
                      </span>
                      <span className="text-[10px] text-muted font-mono font-medium">
                        {new Date(act.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-border/40 text-muted">
                        {act.action}
                      </span>
                    </div>
                    <p className="text-muted leading-relaxed font-medium text-[11px] pt-0.5">{act.details}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border/80 rounded-[28px] shadow-sm hover:shadow-md transition-all p-6 flex flex-col h-[430px]">
            <div className="border-b border-border/60 pb-3.5 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="p-2 text-white rounded-xl shadow-md shrink-0"
                  style={{ background: "linear-gradient(135deg, #34D399 0%, #10B981 50%, #059669 100%)" }}
                >
                  <CheckCircle size={16} />
                </div>
                <h2 className="text-sm sm:text-base font-bold font-display text-foreground">
                  Completed Tasks
                </h2>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                {staffCompletedTasks.length} Done
              </span>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {staffCompletedTasks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted">
                  <CheckCircle size={40} className="text-muted/30 mb-2" />
                  <p className="text-sm font-medium">No tasks completed yet.</p>
                </div>
              ) : (
                staffCompletedTasks.map((task) => (
                  <div
                    key={task._id}
                    onClick={() => setCurrentTab(task.isOrder ? "order-progress" : "tasks")}
                    className="p-4 bg-background/60 border border-border/70 rounded-2xl hover:bg-background hover:border-accent hover:shadow-md cursor-pointer transition-all duration-200"
                  >
                    <h4 className="font-bold text-sm line-clamp-1 text-foreground">{task.title}</h4>
                    <p className="text-xs text-muted mt-1 line-clamp-1 font-medium">
                      {task.description || "No description."}
                    </p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[9px] border border-green-500/25 text-green-600 dark:text-green-400 px-2.5 py-1 rounded-full font-bold uppercase bg-green-500/10">
                        Completed
                      </span>
                      <span className="text-[10px] text-muted font-semibold">
                        Due: {formatNepali(task.dueDate)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: QUICK NOTES STICKY REMINDERS */}
        <div className="bg-card border border-border/80 rounded-[28px] shadow-sm hover:shadow-md transition-all p-6 flex flex-col h-[430px]">
          <div className="border-b border-border/60 pb-3.5 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="p-2 text-white rounded-xl shadow-md shrink-0"
                style={{ background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #D97706 100%)" }}
              >
                <FileText size={16} />
              </div>
              <h2 className="text-sm sm:text-base font-bold font-display text-foreground">
                Quick-Notes Widget
              </h2>
            </div>
            <button
              onClick={() => setShowNoteInput(!showNoteInput)}
              style={{
                background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 100%)",
              }}
              className="p-2 rounded-xl text-black shadow-xs hover:scale-110 active:scale-95 transition-transform cursor-pointer"
              aria-label="Add Note"
            >
              <Plus size={16} />
            </button>
          </div>

          {showNoteInput && (
            <form onSubmit={handleAddNote} className="mb-4 animate-slide-up">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-xs border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  placeholder="Type note and hit enter..."
                  required
                />
                <button
                  type="submit"
                  style={{
                    background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)",
                  }}
                  className="px-4 py-2 text-black text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            </form>
          )}

          <div className="flex-1 overflow-y-auto pr-1">
            {safeQuickNotes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted">
                <FileText size={40} className="text-muted/30 mb-2" />
                <p className="text-sm font-medium">No personal notes created yet. Click the + button above to add one.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {safeQuickNotes.map((note, index) => {
                  const colorClass = stickyColors[index % stickyColors.length];
                  return (
                    <div
                      key={note._id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between min-h-[115px] shadow-xs transition-all duration-200 hover:scale-[1.02] hover:shadow-sm ${colorClass}`}
                    >
                      <p className="text-xs font-bold leading-normal break-words">
                        {note.text}
                      </p>
                      <div className="flex justify-between items-center mt-3 border-t border-black/10 dark:border-white/10 pt-2 text-[9px] opacity-85">
                        <span className="font-extrabold">
                          By {note.createdBy?.name?.split(" ")[0] || "Staff"}
                        </span>
                        <button
                          onClick={() => deleteQuickNote(note._id)}
                          className="p-1 rounded-md hover:bg-black/10 text-inherit opacity-75 hover:opacity-100 transition-all cursor-pointer"
                          title="Delete note"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SALES & EXPENSES GROWTH TREND (ADMIN ONLY - ON THE BOTTOM) */}
      {user?.role === "admin" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 p-1 bg-border/40 rounded-2xl border border-border/50">
              <button
                onClick={() => setOverviewChartType("revenue")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  overviewChartType === "revenue"
                    ? "bg-[#18181B] text-white shadow-xs"
                    : "text-muted hover:text-foreground hover:bg-card/50"
                }`}
              >
                Revenue Trend
              </button>
              <button
                onClick={() => setOverviewChartType("dual")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  overviewChartType === "dual"
                    ? "bg-[#18181B] text-white shadow-xs"
                    : "text-muted hover:text-foreground hover:bg-card/50"
                }`}
              >
                Sales & Expenses Growth Trend
              </button>
            </div>
          </div>

          {overviewChartType === "dual" ? (
            <SalesExpensesTrendChart
              sales={safeSales}
              expenses={expenses}
              purchases={purchases}
              orders={orders}
              completedTasks={completedTasks}
              title="Sales & Expenses Growth Trend"
            />
          ) : (
            <RevenueGrowthChart
              sales={safeSales}
              orders={orders}
              completedTasks={completedTasks}
              title="Revenue Over Time"
            />
          )}
        </div>
      )}
        </>
      ) : (
        /* ─── DEDICATED MONTHLY DATA SUB-SECTION ─── */
        <div className="space-y-6 animate-fade-in">
          {/* ─── BS MONTH & YEAR SELECTOR / NAVIGATION BAR ─── */}
          <div className="space-y-3">
            <div className="bg-card border border-border/80 rounded-[28px] p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              {/* Left Side: Active Period Status */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-black shadow-xs shrink-0"
                  style={{ background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 100%)" }}
                >
                  <Calendar size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-muted">
                      {viewMode === "all_time" ? "Overall Records" : "Financial Period"}
                    </span>
                    {isCurrentMonth ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Live Current Month
                      </span>
                    ) : isLastMonth ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                        Previous Month Record
                      </span>
                    ) : viewMode === "monthly" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                        Historical Record
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25">
                        All-Time Aggregate
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    {viewMode === "all_time"
                      ? "All-Time Lifetime Financial Overview"
                      : `${NEPALI_MONTHS.find((m) => m.value === overviewMonth)?.name} (${NEPALI_MONTHS.find((m) => m.value === overviewMonth)?.nepaliName}) ${overviewYear} BS`}
                  </h2>
                </div>
              </div>

              {/* Right Side: Quick Filters & Month Selectors */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <button
                  onClick={handleGoToCurrentMonth}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                    isCurrentMonth
                      ? "bg-accent/10 border-accent/30 text-accent shadow-2xs"
                      : "border-border/70 hover:bg-muted/20 text-muted hover:text-foreground"
                  }`}
                >
                  <span>Current Month ({NEPALI_MONTHS.find((m) => m.value === currentBs.month)?.short})</span>
                </button>

                <button
                  onClick={handleGoToLastMonth}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                    isLastMonth
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-2xs"
                      : "border-border/70 hover:bg-muted/20 text-muted hover:text-foreground"
                  }`}
                >
                  <History size={13} />
                  <span>Last Month ({NEPALI_MONTHS.find((m) => m.value === lastBsMonth)?.short})</span>
                </button>

                <button
                  onClick={() => setViewMode(viewMode === "all_time" ? "monthly" : "all_time")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                    viewMode === "all_time"
                      ? "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400 shadow-2xs"
                      : "border-border/70 hover:bg-muted/20 text-muted hover:text-foreground"
                  }`}
                >
                  <span>All-Time</span>
                </button>

                {/* Month / Year Stepper Dropdowns */}
                {viewMode === "monthly" && (
                  <div className="flex items-center gap-1 bg-muted/20 border border-border/70 p-1 rounded-xl">
                    <button
                      onClick={handlePrevMonth}
                      className="p-1.5 rounded-lg hover:bg-card text-muted hover:text-foreground transition-all cursor-pointer"
                      title="Previous Month"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <select
                      value={overviewMonth}
                      onChange={(e) => {
                        setViewMode("monthly");
                        setOverviewMonth(Number(e.target.value));
                      }}
                      className="px-2.5 py-1 bg-card rounded-lg text-xs font-bold text-foreground border border-border/60 cursor-pointer focus:outline-none shadow-2xs"
                    >
                      {NEPALI_MONTHS.map((m) => (
                        <option key={m.value} value={m.value} className="bg-card">
                          {m.name} ({m.nepaliName})
                        </option>
                      ))}
                    </select>

                    <select
                      value={overviewYear}
                      onChange={(e) => {
                        setViewMode("monthly");
                        setOverviewYear(Number(e.target.value));
                      }}
                      className="px-2.5 py-1 bg-card rounded-lg text-xs font-bold text-foreground border border-border/60 cursor-pointer focus:outline-none shadow-2xs"
                    >
                      {NEPALI_YEARS.map((y) => (
                        <option key={y} value={y} className="bg-card">
                          {y} BS
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleNextMonth}
                      className="p-1.5 rounded-lg hover:bg-card text-muted hover:text-foreground transition-all cursor-pointer"
                      title="Next Month"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Historical Notification Banner */}
            {!isCurrentMonth && (
              <div className="flex items-center justify-between p-3.5 px-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-amber-500 shrink-0" />
                  <span>
                    You are currently inspecting historical records for{" "}
                    <strong>
                      {viewMode === "all_time"
                        ? "All-Time Lifetime Overview"
                        : `${NEPALI_MONTHS.find((m) => m.value === overviewMonth)?.name} ${overviewYear} BS`}
                    </strong>
                    . Live transactions are recorded in{" "}
                    <strong>
                      {NEPALI_MONTHS.find((m) => m.value === currentBs.month)?.name} {currentBs.year} BS
                    </strong>
                    .
                  </span>
                </div>
                <button
                  onClick={handleGoToCurrentMonth}
                  className="underline font-bold hover:text-amber-900 dark:hover:text-amber-100 cursor-pointer shrink-0 ml-3"
                >
                  Return to Live Month &rarr;
                </button>
              </div>
            )}
          </div>

          {/* ─── ROW 1: 4 MAIN STAT CARDS (SAME TO SAME AS GENERAL OVERVIEW) ─── */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Sales Card (Signature Sunset Gradient Hero Card) */}
              <div
                className="relative rounded-[28px] p-6 shadow-xl shadow-orange-500/10 overflow-hidden flex flex-col justify-between transition-all hover:scale-[1.01]"
                style={{
                  background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)",
                }}
              >
                <div className="flex items-start justify-between relative z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-black/85 uppercase tracking-wider block">Total Sales</span>
                      <span className="text-[10px] font-bold text-black bg-black/20 px-2.5 py-0.5 rounded-full border border-black/25">Product Only</span>
                    </div>
                    <h3 className="text-3xl sm:text-4xl font-semibold font-display text-black leading-none mt-2">
                      Rs. {totalSales.toLocaleString()}
                    </h3>
                  </div>
                  <div className="p-2.5 bg-black text-white rounded-2xl shadow-md shrink-0">
                    <DollarSign size={18} />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 relative z-10">
                  <span className="text-xs text-black/75 font-medium">Excl. delivery & fitting</span>
                  {renderMiniBarChart(
                    getSparklineData("sales"),
                    theme === "dark"
                      ? "fill-[#F4F4F5] hover:fill-white transition-colors"
                      : "fill-black/70 hover:fill-black transition-colors"
                  )}
                </div>
              </div>

              {/* Active Orders Card (Crisp Porcelain Card) */}
              <div className="bg-card border border-border/80 shadow-sm hover:shadow-md transition-all rounded-[28px] p-6 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-xs text-muted font-bold uppercase tracking-wider block">Active Orders</span>
                    <h3 className="text-3xl sm:text-4xl font-semibold font-display text-foreground leading-none mt-2">{activeOrdersCount}</h3>
                  </div>
                  <div
                    style={{ background: "linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #1D4ED8 100%)" }}
                    className="p-2.5 text-white rounded-2xl shadow-md shadow-blue-500/20 shrink-0"
                  >
                    <Package size={18} />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-neutral-200 dark:bg-neutral-200 text-black dark:text-black border border-neutral-300 dark:border-neutral-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      ↓ 4.8%
                    </span>
                    <span className="text-xs text-muted font-medium">vs last week</span>
                  </div>
                  {renderMiniBarChart(
                    getSparklineData("orders"),
                    theme === "dark"
                      ? "fill-white hover:fill-white/90 transition-colors"
                      : "fill-blue-500/80 hover:fill-blue-600 transition-colors"
                  )}
                </div>
              </div>

              {/* Pending Tasks Card (Crisp Porcelain Card) */}
              <div className="bg-card border border-border/80 shadow-sm hover:shadow-md transition-all rounded-[28px] p-6 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-xs text-muted font-bold uppercase tracking-wider block">Pending Tasks</span>
                    <h3 className="text-3xl sm:text-4xl font-semibold font-display text-foreground leading-none mt-2">{scopedPendingTasks.length}</h3>
                  </div>
                  <div
                    style={{ background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #D97706 100%)" }}
                    className="p-2.5 text-white rounded-2xl shadow-md shadow-amber-500/20 shrink-0"
                  >
                    <Clock size={18} />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-neutral-200 dark:bg-neutral-200 text-black dark:text-black border border-neutral-300 dark:border-neutral-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      ↓ 15.2%
                    </span>
                    <span className="text-xs text-muted font-medium">vs yesterday</span>
                  </div>
                  {renderMiniLineChart(getSparklineData("tasks"), "#d97706", "amber-spark-monthly")}
                </div>
              </div>

              {/* Completed Work Card (Crisp Porcelain Card) */}
              <div className="bg-card border border-border/80 shadow-sm hover:shadow-md transition-all rounded-[28px] p-6 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-xs text-muted font-bold uppercase tracking-wider block">Completed Work</span>
                    <h3 className="text-3xl sm:text-4xl font-semibold font-display text-foreground leading-none mt-2">{completedWorkCount}</h3>
                  </div>
                  <div
                    style={{ background: "linear-gradient(135deg, #34D399 0%, #10B981 50%, #059669 100%)" }}
                    className="p-2.5 text-white rounded-2xl shadow-md shadow-emerald-500/20 shrink-0"
                  >
                    <CheckCircle size={18} />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-neutral-200 dark:bg-neutral-200 text-black dark:text-black border border-neutral-300 dark:border-neutral-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      ↑ 8.3%
                    </span>
                    <span className="text-xs text-muted font-medium">vs last week</span>
                  </div>
                  {renderMiniLineChart(getSparklineData("completed"), "#2563eb", "blue-spark-monthly")}
                </div>
              </div>
            </div>

            {/* ─── ROW 2: CHARGES & RECEIVABLES (SAME TO SAME AS GENERAL OVERVIEW) ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Delivery Charges */}
              <div className="bg-card border border-border/80 shadow-sm hover:shadow-md transition-all p-6 rounded-[28px] flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-muted font-bold uppercase tracking-wider block">Total Delivery Charges</span>
                  <h3 className="text-2xl sm:text-3xl font-semibold font-display text-blue-600 dark:text-blue-400">Rs. {totalDeliveryCharges.toLocaleString()}</h3>
                  <p className="text-xs text-muted">Separate delivery fees (not in Total Sales)</p>
                </div>
                <div
                  style={{ background: "linear-gradient(135deg, #38BDF8 0%, #0284C7 50%, #0369A1 100%)" }}
                  className="p-3 text-white rounded-2xl shadow-md shadow-sky-500/20 shrink-0"
                >
                  <Truck size={22} />
                </div>
              </div>

              {/* Total Fitting Charges */}
              <div className="bg-card border border-border/80 shadow-sm hover:shadow-md transition-all p-6 rounded-[28px] flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-muted font-bold uppercase tracking-wider block">Total Fitting Charges</span>
                  <h3 className="text-2xl sm:text-3xl font-semibold font-display text-purple-600 dark:text-purple-400">Rs. {totalFittingCharges.toLocaleString()}</h3>
                  <p className="text-xs text-muted">Separate installation fees (not in Total Sales)</p>
                </div>
                <div
                  style={{ background: "linear-gradient(135deg, #C084FC 0%, #9333EA 50%, #7E22CE 100%)" }}
                  className="p-3 text-white rounded-2xl shadow-md shadow-purple-500/20 shrink-0"
                >
                  <Wrench size={22} />
                </div>
              </div>

              {/* Outstanding Receivables */}
              <div 
                onClick={() => setShowOutstandingModal(true)}
                className="bg-card border border-border/80 shadow-sm hover:shadow-md transition-all p-6 rounded-[28px] flex items-center justify-between cursor-pointer hover:border-red-500/30 hover:bg-red-500/[0.01] group"
              >
                <div className="space-y-1">
                  <span className="text-xs text-muted font-bold uppercase tracking-wider block group-hover:text-red-500 transition-colors">Total Outstanding Due</span>
                  <h3 className="text-2xl sm:text-3xl font-semibold font-display text-red-500">Rs. {totalDuePayment.toLocaleString()}</h3>
                  <p className="text-xs text-muted">Receivables remaining from active/completed orders (Click to view)</p>
                </div>
                <div
                  style={{ background: "linear-gradient(135deg, #F87171 0%, #EF4444 50%, #DC2626 100%)" }}
                  className="p-3 text-white rounded-2xl shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform shrink-0"
                >
                  <Clock size={22} />
                </div>
              </div>
            </div>
          </div>

          {/* ─── ROW 3: FINANCIAL OVERVIEWS (SAME TO SAME AS GENERAL OVERVIEW) ─── */}
          <div className="space-y-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              {/* Net Operating Profit Card (Signature Card) */}
              <div className="bg-card border border-border/80 rounded-[28px] shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between min-h-[260px]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider block">Net Operating Profit</span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        netProfitVal >= 0
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                      }`}
                    >
                      {netProfitVal >= 0 ? "Surplus" : "Deficit"}
                    </span>
                  </div>
                  <div className="mb-3">
                    <h4
                      className={`text-3xl sm:text-4xl font-semibold font-display leading-none ${
                        netProfitVal >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      Rs. {netProfitVal.toLocaleString()}
                    </h4>
                  </div>
                  <div className="space-y-1.5 text-[11px] font-medium text-muted">
                    <div className="flex justify-between items-center">
                      <span>Revenue:</span>
                      <span className="font-bold text-foreground">Rs. {totalSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Expenses:</span>
                      <span className="font-bold text-foreground">Rs. {totalExpensesVal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Purchases:</span>
                      <span className="font-bold text-foreground">Rs. {totalPurchasesVal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handlePreviewStatement("all")}
                  className="text-left text-xs font-bold text-accent hover:text-accent-dark transition-colors mt-2 flex items-center gap-1 cursor-pointer"
                >
                  <span>Preview Statement</span>
                  <span>&rarr;</span>
                </button>
              </div>

              {/* Expenses Overview Card (Porcelain White Card) */}
              <div className="bg-card border border-border/80 rounded-[28px] shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between min-h-[260px]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider block">Expenses Summary</span>
                    <span className="text-[10px] font-bold bg-neutral-200 dark:bg-neutral-800 text-black dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 px-2.5 py-0.5 rounded-full">
                      Outflows
                    </span>
                  </div>
                  <div className="mb-3">
                    <h4 className="text-3xl sm:text-4xl font-semibold font-display text-foreground leading-none">
                      Rs. {totalExpensesVal.toLocaleString()}
                    </h4>
                    <span className="text-xs text-muted font-medium mt-1 block">Total operating expenditures</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-medium text-muted">
                    <div className="flex justify-between">
                      <span>Salary:</span>
                      <span className="font-bold text-foreground">Rs. {expenseCategorySums.salary.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rent:</span>
                      <span className="font-bold text-foreground">Rs. {expenseCategorySums.rent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Travel:</span>
                      <span className="font-bold text-foreground">Rs. {expenseCategorySums.travel.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Food:</span>
                      <span className="font-bold text-foreground">Rs. {expenseCategorySums.food.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentTab("expenses")}
                  className="text-left text-xs font-bold text-accent hover:text-accent-dark transition-colors mt-2 flex items-center gap-1 cursor-pointer"
                >
                  <span>View Expense Log</span>
                  <span>&rarr;</span>
                </button>
              </div>

              {/* Purchases Tracker Card (Porcelain White Card) */}
              <div className="bg-card border border-border/80 rounded-[28px] shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between min-h-[260px]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider block">Purchases Tracker</span>
                    <span className="text-[10px] font-bold bg-neutral-200 dark:bg-neutral-800 text-black dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 px-2.5 py-0.5 rounded-full">
                      {outstandingPurchasesVal > 0 ? "Pending Dues" : "Settled"}
                    </span>
                  </div>
                  <div className="mb-3">
                    <h4 className="text-3xl sm:text-4xl font-semibold font-display text-foreground leading-none">
                      Rs. {totalPurchasesVal.toLocaleString()}
                    </h4>
                    {outstandingPurchasesVal > 0 ? (
                      <span className="text-xs text-red-500 font-bold mt-1 block">Rs. {outstandingPurchasesVal.toLocaleString()} pending dues</span>
                    ) : (
                      <span className="text-xs text-muted font-medium mt-1 block">All vendor bills settled</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Recent Invoices</span>
                    {scopedPurchases.slice(0, 2).map((p) => (
                      <div key={p._id} className="flex justify-between items-center text-[11px] py-0.5">
                        <span className="truncate max-w-[130px] font-medium text-foreground">{p.supplier}</span>
                        <span className="text-foreground font-bold">Rs. {p.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {scopedPurchases.length === 0 && (
                      <span className="text-[11px] text-muted italic">No purchases logged</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setCurrentTab("purchase")}
                  className="text-left text-xs font-bold text-accent hover:text-accent-dark transition-colors mt-2 flex items-center gap-1 cursor-pointer"
                >
                  <span>View Purchases Tracker</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTON (FAB) FOR QUICK ACTIONS */}
      <div className="fixed bottom-16 md:bottom-6 right-6 z-50">
        <div className="relative">
          {/* Quick Actions Panel */}
          {fabOpen && (
            <div className="absolute bottom-16 right-0 mb-2 w-48 bg-card border border-border rounded-lg shadow-2xl overflow-hidden py-1 flex flex-col animate-slide-up">
              {user?.role === "admin" && (
                <>
                  <button
                    onClick={() => {
                      setFabOpen(false);
                      openTaskModal();
                    }}
                    className="px-4 py-2.5 text-xs text-left font-medium hover:bg-border text-foreground flex items-center gap-2"
                  >
                    <Plus size={14} className="text-accent" />
                    Assign New Task
                  </button>
                  <button
                    onClick={() => {
                      setFabOpen(false);
                      openCampaignModal();
                    }}
                    className="px-4 py-2.5 text-xs text-left font-medium hover:bg-border text-foreground flex items-center gap-2"
                  >
                    <Calendar size={14} className="text-accent" />
                    Create Marketing Entry
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setFabOpen(false);
                  setShowNoteInput(true);
                }}
                className="px-4 py-2.5 text-xs text-left font-medium hover:bg-border text-foreground flex items-center gap-2"
              >
                <FileText size={14} className="text-accent" />
                Add Sticky Note
              </button>
            </div>
          )}

          {/* Core FAB Toggle Button */}
          <button
            onClick={() => setFabOpen(!fabOpen)}
            style={{
              background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)",
            }}
            className="h-14 w-14 rounded-full text-black shadow-2xl shadow-orange-500/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
            aria-label="Quick action trigger"
          >
            <Plus size={28} className={`transition-transform duration-200 text-black ${fabOpen ? "rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {/* Outstanding Due Accounts List Modal */}
      {showOutstandingModal && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pt-20 sm:p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-xl rounded-lg border border-border p-6 shadow-2xl animate-scale-up my-8 max-h-[85vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
              <h2 className="text-lg font-bold font-display flex items-center gap-2 text-red-500">
                <DollarSign size={20} />
                Outstanding Receivables Dues
              </h2>
              <button
                type="button"
                onClick={() => setShowOutstandingModal(false)}
                className="text-muted hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-muted mb-4">
              Below is the list of clients with remaining due balances on active or completed orders. Click on any client to view full details of the order.
            </p>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {outstandingOrdersList.length === 0 ? (
                <div className="py-8 text-center text-muted text-xs">
                  No outstanding client dues found. All payments are fully settled!
                </div>
              ) : (
                outstandingOrdersList.map((order) => (
                  <div
                    key={order._id}
                    onClick={() => setSelectedOrderForDetails(order)}
                    className="bg-card border border-border/60 p-4 rounded-xl flex items-center justify-between hover:border-red-500/30 hover:bg-red-500/[0.02] hover:shadow-md cursor-pointer transition-all duration-200 group"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-foreground group-hover:text-accent transition-colors flex items-center gap-1.5">
                        <User size={12} className="text-accent" />
                        {order.customerName}
                      </div>
                      <div className="text-[10px] text-muted font-medium">
                        Product: <span className="font-semibold text-foreground">{order.productName}</span> ({order.size})
                      </div>
                      <div className="text-[10px] text-muted font-medium flex items-center gap-1">
                        <Phone size={10} /> {order.customerContact}
                        <span className="mx-1">|</span>
                        <MapPin size={10} className="text-accent" /> {order.customerAddress}
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div className="text-xs font-extrabold text-red-500">
                          Rs. {order.duePayment.toLocaleString()} due
                        </div>
                        <div className="text-[9px] text-muted font-semibold">
                          Total: Rs. {order.totalPrice.toLocaleString()}
                        </div>
                      </div>
                      <Eye size={16} className="text-muted group-hover:text-accent transition-colors" />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-4 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowOutstandingModal(false);
                  setCurrentTab("orders");
                }}
                className="px-4 py-2 border border-border rounded text-xs hover:bg-border transition-colors font-semibold text-muted hover:text-foreground"
              >
                Go to Registry
              </button>
              <button
                type="button"
                onClick={() => setShowOutstandingModal(false)}
                className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded text-xs font-bold transition-all shadow-md shadow-accent/15"
              >
                Close Dues List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrderForDetails}
        onClose={() => setSelectedOrderForDetails(null)}
      />

      {/* Statement PDF Preview Modal */}
      <StatementPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        data={previewData}
        loading={previewLoading}
        onDownloadCsv={() => {
          if (previewData) handleExport(previewData.type);
        }}
      />
    </div>
  );
};
