import React, { useState, useEffect } from "react";
import { useStore, Expense } from "../store/useStore";
import {
  DollarSign,
  Plus,
  Trash2,
  Search,
  X,
  Calendar,
  User,
  Edit2,
  Eye
} from "./ui/solar-icons";
import { Printer, Download } from "lucide-react";
import { StatementPreviewModal } from "./StatementPreviewModal";
import { NepaliDatePicker } from "./ui/NepaliDatePicker";
import { SalesExpensesTrendChart } from "./SalesExpensesTrendChart";
import {
  NEPALI_MONTHS,
  NEPALI_YEARS,
  getCurrentNepaliDate,
  formatNepali,
  formatArchiveStatementLabel,
  adToBs,
} from "../utils/nepaliDate";

export const ExpensesTab: React.FC = () => {
  const {
    expenses,
    purchases,
    sales,
    orders,
    tasks,
    createExpense,
    updateExpense,
    deleteExpense,
    user,
    exportStatement,
    statementArchives,
    fetchStatementArchives,
    downloadArchive,
    fetchStatementData,
    fetchArchiveData,
    fetchPurchases,
    fetchExpenses,
    fetchSales
  } = useStore();

  // Statement PDF Preview Modal States
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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

  const currentBs = getCurrentNepaliDate();

  // Statement Export States (Nepali BS)
  const [exportMonth, setExportMonth] = useState(currentBs.month.toString());
  const [exportYear, setExportYear] = useState(currentBs.year.toString());
  const [exporting, setExporting] = useState(false);

  const handlePreviewClick = async () => {
    try {
      setPreviewLoading(true);
      setPreviewModalOpen(true);
      const data = await fetchStatementData("expenses", exportMonth, exportYear);
      setPreviewData(data);
    } catch (err) {
      alert("Failed to load expenses statement: " + (err instanceof Error ? err.message : String(err)));
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
      alert("Failed to load archived expenses statement: " + (err instanceof Error ? err.message : String(err)));
      setPreviewModalOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExportClick = async () => {
    setExporting(true);
    try {
      await exportStatement("expenses", exportMonth, exportYear);
    } catch (err) {
      alert("Failed to export expenses statement: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setExporting(false);
    }
  };

  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);

  // Form States
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Expense["category"]>("salary");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Normalized category resolver for backward compatibility
  const getNormalizedCategory = (cat: string): Expense["category"] => {
    if (cat === "wages_salaries" || cat === "salary") return "salary";
    if (cat === "rent_utilities" || cat === "rent") return "rent";
    if (cat === "logistics_fuel" || cat === "travel") return "travel";
    if (cat === "food") return "food";
    return "miscellaneous"; // defaults and other types mapped here
  };

  // Period helpers
  const lastMonthVal = currentBs.month === 1 ? 12 : currentBs.month - 1;
  const lastMonthYear = currentBs.month === 1 ? currentBs.year - 1 : currentBs.year;
  const currMonthInfo = NEPALI_MONTHS.find((m) => m.value === currentBs.month);
  const lastMonthInfo = NEPALI_MONTHS.find((m) => m.value === lastMonthVal);
  const selectedMonthInfo = exportMonth === "all" ? null : NEPALI_MONTHS.find((m) => m.value === Number(exportMonth));

  const isDateInSelectedPeriod = (dateVal: string | Date | undefined) => {
    if (exportMonth === "all") return true;
    if (!dateVal) return false;
    try {
      const bs = adToBs(dateVal);
      return bs.month === Number(exportMonth) && bs.year === Number(exportYear);
    } catch {
      return false;
    }
  };

  // Scoped Expenses for Selected Period
  const periodExpenses = expenses.filter((e) => isDateInSelectedPeriod(e.date));

  // Calculations scoped to the active selected month & year
  const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Filtered List (strictly sorted chronologically by date descending)
  const filteredExpenses = periodExpenses
    .filter((e) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        e.title.toLowerCase().includes(query) ||
        (e.description && e.description.toLowerCase().includes(query));

      const normCat = getNormalizedCategory(e.category);
      const matchesCategory = categoryFilter === "all" || normCat === categoryFilter;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setTitle("");
    setCategory("salary");
    setAmount("");
    setDescription("");
    setDate(new Date().toISOString().split("T")[0]);
    setFormError("");
    setShowModal(true);
  };

  const handleOpenEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setTitle(expense.title);
    setCategory(getNormalizedCategory(expense.category));
    setAmount(String(expense.amount));
    setDescription(expense.description || "");
    setDate(new Date(expense.date).toISOString().split("T")[0]);
    setFormError("");
    setShowModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!title.trim() || !category || !amount.trim()) {
      setFormError("Please fill out all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingExpense) {
        // Update existing expense
        await updateExpense(editingExpense._id, {
          title,
          category,
          amount: Number(amount),
          description,
          date
        });
      } else {
        // Create new expense
        await createExpense({
          title,
          category,
          amount: Number(amount),
          description,
          date
        });
      }
      setShowModal(false);
      setEditingExpense(null);
    } catch (err: any) {
      setFormError(err.message || "Failed to save expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this expense log?")) {
      try {
        await deleteExpense(id);
      } catch (err) {
        console.error("Failed to delete expense log", err);
      }
    }
  };

  const getCategoryLabel = (cat: string) => {
    const norm = getNormalizedCategory(cat);
    switch (norm) {
      case "salary":
        return "Salary & Wages";
      case "rent":
        return "Rent & Utilities";
      case "travel":
        return "Travel & Transport";
      case "food":
        return "Food & Catering";
      case "miscellaneous":
        return "Miscellaneous";
      default:
        return norm;
    }
  };

  const getCategoryBadge = (cat: string) => {
    const norm = getNormalizedCategory(cat);
    switch (norm) {
      case "salary":
        return "bg-purple-600 border-purple-600 text-white";
      case "rent":
        return "bg-pink-600 border-pink-600 text-white";
      case "travel":
        return "bg-blue-600 border-blue-600 text-white";
      case "food":
        return "bg-amber-600 border-amber-600 text-white";
      default:
        return "bg-zinc-600 border-zinc-600 text-white";
    }
  };

  // ──── PIE/DONUT CHART SEGMENTS CALCULATION ────
  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent - Math.PI / 2);
    const y = Math.sin(2 * Math.PI * percent - Math.PI / 2);
    return [x, y];
  };

  const salarySum = periodExpenses.reduce((sum, e) => sum + (getNormalizedCategory(e.category) === "salary" ? e.amount : 0), 0);
  const rentSum = periodExpenses.reduce((sum, e) => sum + (getNormalizedCategory(e.category) === "rent" ? e.amount : 0), 0);
  const travelSum = periodExpenses.reduce((sum, e) => sum + (getNormalizedCategory(e.category) === "travel" ? e.amount : 0), 0);
  const foodSum = periodExpenses.reduce((sum, e) => sum + (getNormalizedCategory(e.category) === "food" ? e.amount : 0), 0);
  const miscSum = periodExpenses.reduce((sum, e) => sum + (getNormalizedCategory(e.category) === "miscellaneous" ? e.amount : 0), 0);
  const totalCategorySum = salarySum + rentSum + travelSum + foodSum + miscSum || 1;

  const categoriesData = [
    { key: "salary", label: "Salary & Wages", value: salarySum, color: "#9333EA", hoverColor: "#A855F7" },
    { key: "rent", label: "Rent & Utilities", value: rentSum, color: "#EC4899", hoverColor: "#F472B6" },
    { key: "travel", label: "Travel & Transport", value: travelSum, color: "#2563EB", hoverColor: "#3B82F6" },
    { key: "food", label: "Food & Catering", value: foodSum, color: "#D97706", hoverColor: "#F59E0B" },
    { key: "miscellaneous", label: "Miscellaneous", value: miscSum, color: "#71717A", hoverColor: "#94A3B8" }
  ].filter(c => c.value > 0);

  let accumulatedPercent = 0;
  const segments = categoriesData.map((data) => {
    const percent = data.value / totalCategorySum;
    const startPercent = accumulatedPercent;
    const endPercent = accumulatedPercent + percent;
    accumulatedPercent = endPercent;

    const [startX, startY] = getCoordinatesForPercent(startPercent);
    const [endX, endY] = getCoordinatesForPercent(endPercent);

    const largeArcFlag = percent > 0.5 ? 1 : 0;

    const scaleStartX = 60 + startX * 40;
    const scaleStartY = 60 + startY * 40;
    const scaleEndX = 60 + endX * 40;
    const scaleEndY = 60 + endY * 40;

    const pathData = [
      `M ${scaleStartX} ${scaleStartY}`,
      `A 40 40 0 ${largeArcFlag} 1 ${scaleEndX} ${scaleEndY}`
    ].join(" ");

    return {
      ...data,
      pathData,
      percent: Math.round(percent * 100)
    };
  });

  return (
    <div className="space-y-6">
           <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-card p-5 sm:p-6 rounded-[28px] border border-border/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <DollarSign className="text-accent" />
            Expenses Log
          </h1>
          <p className="text-xs text-muted mt-1">
            Track business operating costs, salary payments, rent, utility bills, and other overheads.
          </p>
        </div>

        {/* Top Buttons & Actions Toolbar (Compact and responsive without horizontal scroll) */}
        <div className="flex flex-wrap items-center gap-2 self-stretch xl:self-auto">
          {/* Quick Period Chips */}
          <div className="flex items-center gap-1 bg-border/20 p-1 rounded-xl border border-border/40">
            <button
              type="button"
              onClick={() => {
                setExportMonth(currentBs.month.toString());
                setExportYear(currentBs.year.toString());
              }}
              className={`px-2.5 py-1 text-[11px] rounded-lg font-bold transition-all ${
                exportMonth === currentBs.month.toString() && exportYear === currentBs.year.toString()
                  ? "bg-accent text-white shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Current ({currMonthInfo?.name || "Now"})
            </button>
            <button
              type="button"
              onClick={() => {
                setExportMonth(lastMonthVal.toString());
                setExportYear(lastMonthYear.toString());
              }}
              className={`px-2.5 py-1 text-[11px] rounded-lg font-bold transition-all ${
                exportMonth === lastMonthVal.toString() && exportYear === lastMonthYear.toString()
                  ? "bg-accent text-white shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Last Month ({lastMonthInfo?.name || "Prev"})
            </button>
            <button
              type="button"
              onClick={() => setExportMonth("all")}
              className={`px-2.5 py-1 text-[11px] rounded-lg font-bold transition-all ${
                exportMonth === "all"
                  ? "bg-accent text-white shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              All Time
            </button>
          </div>

          {/* Quick Statement Download & Selects */}
          <div className="flex flex-wrap items-center gap-1.5 bg-border/20 p-1.5 rounded-xl border border-border/40">
            <select
              value={exportMonth}
              onChange={(e) => setExportMonth(e.target.value)}
              className="bg-card border border-border text-foreground text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent font-semibold cursor-pointer h-8"
            >
              <option value="all">All Time</option>
              {NEPALI_MONTHS.map((m) => (
                <option key={m.value} value={m.value.toString()}>
                  {m.name} ({m.nepaliName})
                </option>
              ))}
            </select>
            <select
              value={exportYear}
              onChange={(e) => setExportYear(e.target.value)}
              className="bg-card border border-border text-foreground text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent font-semibold cursor-pointer h-8"
            >
              {NEPALI_YEARS.map((y) => (
                <option key={y} value={y.toString()}>
                  {y} BS
                </option>
              ))}
            </select>
            <button
              onClick={handlePreviewClick}
              style={{
                background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)",
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-black text-[11px] rounded-lg font-bold transition-all shadow-xs active:scale-95 cursor-pointer hover:opacity-95 whitespace-nowrap h-8"
              title="Preview and Print PDF Expenses Statement"
            >
              <Printer size={13} />
              <span>Preview / Print PDF</span>
            </button>
            <button
              onClick={handleExportClick}
              disabled={exporting}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-accent text-white text-[11px] rounded-lg font-bold hover:bg-accent-dark transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap h-8 shadow-xs"
            >
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>

          <button
            onClick={handleOpenAddModal}
            style={{
              background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)",
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-1 text-black rounded-xl font-bold text-xs transition-all shadow-xs hover:scale-[1.02] active:scale-95 cursor-pointer whitespace-nowrap h-8"
          >
            <Plus size={15} />
            Log New Expense
          </button>
        </div>
      </div>

      {/* Archived Monthly Statements */}
      {user?.role === "admin" && statementArchives.filter((a) => a.type === "expenses").length > 0 && (
        <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar size={14} className="text-accent" />
            Archived Monthly Expenses Statements (PDF & CSV)
          </h3>
          <div className="flex flex-wrap gap-2">
            {statementArchives
              .filter((a) => a.type === "expenses")
              .map((archive) => (
                <div
                  key={archive._id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border bg-background hover:bg-accent/[0.04] hover:border-accent/30 text-xs font-bold transition-all"
                >
                  <button
                    onClick={() => handlePreviewArchive(archive._id)}
                    className="flex items-center gap-1.5 text-foreground hover:text-accent transition-colors"
                    title="Preview / Print PDF"
                  >
                    <DollarSign size={12} className="text-accent" />
                    <span>{formatArchiveStatementLabel(archive)}</span>
                  </button>
                  <button
                    onClick={() => downloadArchive(archive._id, archive.filename)}
                    className="text-muted hover:text-accent p-1 ml-1 rounded hover:bg-accent/10 transition-colors"
                    title="Download CSV"
                  >
                    <Download size={12} />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Pie Chart & Overall summary layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Overall Expenses Panel (Signature Sunset Gradient Hero Card) */}
        <div
          className="relative rounded-[28px] p-6 shadow-xl shadow-orange-500/10 overflow-hidden flex flex-col justify-between min-h-[240px] text-black transition-all hover:scale-[1.01]"
          style={{
            background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)",
          }}
        >
          <div className="flex items-center gap-4 relative z-10">
            <div className="h-12 w-12 rounded-2xl bg-black flex items-center justify-center text-white flex-shrink-0 shadow-md">
              <DollarSign size={24} />
            </div>
            <div>
              <span className="text-xs font-semibold text-black/85 uppercase tracking-wider">
                Total Expenses {exportMonth === "all" ? "(All Time)" : `(${selectedMonthInfo?.name || "Month"} ${exportYear} BS)`}
              </span>
              <h3 className="text-3xl sm:text-4xl font-semibold font-display text-black mt-1 leading-none">Rs. {totalExpenses.toLocaleString()}</h3>
              <p className="text-xs text-black/75 mt-1 font-medium">
                {periodExpenses.length} {periodExpenses.length === 1 ? "log" : "logs"} recorded {exportMonth === "all" ? "(All Time)" : `in ${selectedMonthInfo?.name || "Month"} ${exportYear}`}
              </p>
            </div>
          </div>

          <div className="border-t border-black/10 pt-4 mt-2 relative z-10">
            <span className="text-[10px] text-black/85 uppercase font-bold tracking-wider block mb-2">Category distribution</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-medium text-black/80">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-black/50" /> Salary</span>
                <span className="font-bold text-black">Rs. {salarySum.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-black/50" /> Rent</span>
                <span className="font-bold text-black">Rs. {rentSum.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-black/50" /> Travel</span>
                <span className="font-bold text-black">Rs. {travelSum.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-black/50" /> Food</span>
                <span className="font-bold text-black">Rs. {foodSum.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-black/50" /> Misc</span>
                <span className="font-bold text-black">Rs. {miscSum.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown Donut Chart Panel (Crisp Porcelain Card) */}
        <div className="bg-card border border-border/80 p-6 rounded-[28px] shadow-sm hover:shadow-md transition-all flex items-center justify-around lg:col-span-2 min-h-[240px]">
          <div className="flex flex-col justify-center">
            <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-2">Expense Categories</span>
            <div className="space-y-2">
              {categoriesData.length === 0 ? (
                <span className="text-xs text-muted italic">No expenses logged yet</span>
              ) : (
                categoriesData.map((seg) => {
                  const pct = Math.round((seg.value / totalCategorySum) * 100);
                  return (
                    <div key={seg.key} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="text-xs font-bold text-foreground">{seg.label}:</span>
                      <span className="text-xs font-medium text-muted">Rs. {seg.value.toLocaleString()} ({pct}%)</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="relative h-40 w-40 flex items-center justify-center">
            {categoriesData.length === 0 ? (
              <svg viewBox="0 0 120 120" className="h-full w-full">
                <circle cx="60" cy="60" r="40" fill="none" stroke="var(--border)" strokeWidth="12" />
                <text x="60" y="64" textAnchor="middle" fill="var(--muted)" fontSize="9" className="font-bold">NO DATA</text>
              </svg>
            ) : (
              <svg viewBox="0 0 120 120" className="h-full w-full overflow-visible">
                {segments.map((seg, idx) => (
                  <path
                    key={idx}
                    d={seg.pathData}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="14"
                    strokeLinecap="butt"
                    className="transition-all hover:stroke-amber-500 cursor-pointer"
                    style={{ transition: "stroke 0.2s" }}
                  >
                    <title>{`${seg.label}: ${seg.percent}%`}</title>
                  </path>
                ))}
                <circle cx="60" cy="60" r="32" fill="var(--card)" />
                <text x="60" y="63" textAnchor="middle" fill="var(--foreground)" fontSize="8" className="font-extrabold uppercase tracking-wider">
                  Breakdown
                </text>
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Sales & Expenses Growth Trend (Matching Signature Sunset Gradient Spline) */}
      <SalesExpensesTrendChart
        sales={sales}
        expenses={expenses}
        purchases={purchases}
        orders={orders}
        completedTasks={tasks.filter((t) => t.status === "done")}
        title="Sales & Expenses Growth Trend"
      />

      {/* Filter and Table */}
      <div className="bg-card border border-border/80 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 pl-9 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-xs"
            placeholder="Search expenses by title or description..."
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted" />
        </div>

        <div className="flex items-center gap-2 text-xs w-full md:w-auto">
          <span className="text-muted font-medium">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2 py-1.5 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-xs font-semibold cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="salary">Salary & Wages</option>
            <option value="rent">Rent & Utilities</option>
            <option value="travel">Travel & Transport</option>
            <option value="food">Food & Catering</option>
            <option value="miscellaneous">Miscellaneous</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-card text-muted border-b border-border uppercase font-semibold tracking-wider text-[10px]">
                <th className="p-4">Date</th>
                <th className="p-4">Category</th>
                <th className="p-4">Expense Title</th>
                <th className="p-4">Logged By</th>
                <th className="p-4">Description</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    {exportMonth === "all"
                      ? "No expenses logged matching selected filters."
                      : `No expense logs recorded for ${selectedMonthInfo?.name || "Month"} ${exportYear} BS. Switch months above or select All Time.`}
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense._id} className="hover:bg-border/20 transition-colors">
                    <td className="p-4 text-xs font-semibold text-muted">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-muted" />
                        {formatNepali(expense.date)}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${getCategoryBadge(expense.category)}`}>
                        {getCategoryLabel(expense.category)}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-foreground">
                      {expense.title}
                    </td>
                    <td className="p-4 font-semibold text-muted">
                      <div className="flex items-center gap-1.5">
                        <User size={11} className="text-accent" />
                        {expense.createdBy?.name || "System"}
                      </div>
                    </td>
                    <td className="p-4 text-muted font-medium max-w-xs truncate" title={expense.description}>
                      {expense.description || "—"}
                    </td>
                    <td className="p-4 text-right font-extrabold text-red-500">
                      Rs. {expense.amount.toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingExpense(viewingExpense?._id === expense._id ? null : expense)}
                          className="p-1.5 bg-blue-600 rounded text-white hover:bg-blue-700 transition-colors shadow-sm"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        {user?.role === "admin" && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(expense)}
                              className="p-1.5 bg-amber-600 rounded text-white hover:bg-amber-700 transition-colors shadow-sm"
                              title="Edit Expense"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(expense._id)}
                              className="p-1.5 bg-red-600 rounded text-white hover:bg-red-700 transition-colors shadow-sm"
                              title="Delete Log"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Expense Modal */}
      {showModal && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pt-20 sm:p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border/80 p-6 shadow-2xl animate-scale-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
              <h2 className="text-lg font-bold font-display flex items-center gap-2">
                <DollarSign className="text-accent" />
                {editingExpense ? "Edit Expense" : "Log Business Expense"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 text-xs bg-red-600 border border-red-600 text-white rounded font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Expense Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm"
                  placeholder="e.g. Purchase of Red Neon Flex Coils"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm font-semibold cursor-pointer"
                >
                  <option value="salary">Salary & Wages</option>
                  <option value="rent">Rent & Utilities</option>
                  <option value="travel">Travel & Transport</option>
                  <option value="food">Food & Catering</option>
                  <option value="miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                    Amount (Rs.) *
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm font-bold text-red-500"
                    placeholder="Amount in Rs."
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                    Expense Date (BS) *
                  </label>
                  <NepaliDatePicker
                    value={date}
                    onChange={(iso) => setDate(iso)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Description / Remarks
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-20 px-3 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm resize-none"
                  placeholder="Invoice number, merchant, payment specifics..."
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-border rounded-xl text-xs hover:bg-border transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)",
                  }}
                  className="px-5 py-2 text-black rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingExpense ? "Update Expense" : "Log Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Expense Detail Modal */}
      {viewingExpense && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pt-20 sm:p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border/80 p-6 shadow-2xl animate-scale-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
              <h2 className="text-lg font-bold font-display flex items-center gap-2">
                <Eye className="text-accent" />
                Expense Details
              </h2>
              <button
                onClick={() => setViewingExpense(null)}
                className="text-muted hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-0.5">Expense Title</span>
                <span className="text-sm font-bold text-foreground">{viewingExpense.title}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-0.5">Category</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${getCategoryBadge(viewingExpense.category)}`}>
                    {getCategoryLabel(viewingExpense.category)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-0.5">Date</span>
                  <p className="text-xs font-semibold text-foreground">
                    {formatNepali(viewingExpense.date)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-0.5">Amount</span>
                  <span className="text-lg font-extrabold text-red-500 font-display">Rs. {viewingExpense.amount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-0.5">Logged By</span>
                  <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <User size={12} className="text-accent" />
                    {viewingExpense.createdBy?.name || "System"}
                  </span>
                </div>
              </div>

              {viewingExpense.description && (
                <div className="border-t border-border pt-3">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">Description / Remarks</span>
                  <p className="text-sm text-foreground font-medium whitespace-pre-wrap">{viewingExpense.description}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-4 mt-4">
              {user?.role === "admin" && (
                <button
                  onClick={() => {
                    handleOpenEditModal(viewingExpense);
                    setViewingExpense(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs hover:bg-amber-700 transition-colors shadow-sm font-bold"
                >
                  <Edit2 size={13} /> Edit Expense
                </button>
              )}
              <button
                onClick={() => setViewingExpense(null)}
                className="px-4 py-2 border border-border rounded-xl text-xs hover:bg-border transition-colors font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statement PDF Preview Modal */}
      <StatementPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        data={previewData}
        loading={previewLoading}
        onDownloadCsv={handleExportClick}
      />
    </div>
  );
};
