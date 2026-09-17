import React, { useState, useEffect } from "react";
import { useStore, Purchase } from "../store/useStore";
import {
  Briefcase,
  Plus,
  Trash2,
  SlidersHorizontal,
  X,
  Calendar,
  User,
  Edit2,
  Eye
} from "./ui/solar-icons";
import { Printer, Download } from "lucide-react";
import { StatementPreviewModal } from "./StatementPreviewModal";
import { NepaliDatePicker } from "./ui/NepaliDatePicker";
import {
  NEPALI_MONTHS,
  NEPALI_YEARS,
  getCurrentNepaliDate,
  formatNepali,
  formatArchiveStatementLabel,
  adToBs,
} from "../utils/nepaliDate";

interface FormPurchaseItem {
  name: string;
  quantity: number;
  unit: string;
  price: number;
}

export const PurchaseTab: React.FC = () => {
  const {
    purchases,
    createPurchase,
    updatePurchaseStatus,
    updatePurchase,
    deletePurchase,
    user,
    exportStatement,
    statementArchives,
    fetchStatementArchives,
    downloadArchive,
    fetchStatementData,
    fetchArchiveData
  } = useStore();

  // Statement PDF Preview Modal States
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchStatementArchives();
    }
  }, [user, fetchStatementArchives]);

  const currentBs = getCurrentNepaliDate();

  // Statement Export States (Nepali BS)
  const [exportMonth, setExportMonth] = useState(currentBs.month.toString());
  const [exportYear, setExportYear] = useState(currentBs.year.toString());
  const [exporting, setExporting] = useState(false);

  const handlePreviewClick = async () => {
    try {
      setPreviewLoading(true);
      setPreviewModalOpen(true);
      const data = await fetchStatementData("purchases", exportMonth, exportYear);
      setPreviewData(data);
    } catch (err) {
      alert("Failed to load purchases statement: " + (err instanceof Error ? err.message : String(err)));
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
      alert("Failed to load archived purchases statement: " + (err instanceof Error ? err.message : String(err)));
      setPreviewModalOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExportClick = async () => {
    setExporting(true);
    try {
      await exportStatement("purchases", exportMonth, exportYear);
    } catch (err) {
      alert("Failed to export purchases statement: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setExporting(false);
    }
  };

  const [showModal, setShowModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);

  // Form States
  const [supplier, setSupplier] = useState("");
  const [itemsList, setItemsList] = useState<FormPurchaseItem[]>([
    { name: "", quantity: 1, unit: "pcs", price: 0 }
  ]);
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [status, setStatus] = useState<Purchase["status"]>("pending");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  // Scoped Purchases for Selected Period
  const periodPurchases = purchases.filter((p) => isDateInSelectedPeriod(p.date));

  // Calculations scoped to the active selected month & year
  const totalPurchases = periodPurchases.reduce((sum, p) => sum + p.amount, 0);
  const pendingPurchases = periodPurchases.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);

  // Filtered List (scoped to period + search + status)
  const filteredPurchases = periodPurchases.filter((p) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      p.supplier.toLowerCase().includes(query) ||
      p.itemDetails.toLowerCase().includes(query);

    const matchesStatus = statusFilter === "all" || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleOpenAddModal = () => {
    setEditingPurchase(null);
    setSupplier("");
    setItemsList([{ name: "", quantity: 1, unit: "pcs", price: 0 }]);
    setTotalAmount("");
    setStatus("pending");
    setDate(new Date().toISOString().split("T")[0]);
    setFormError("");
    setShowModal(true);
  };

  const handleOpenEditModal = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setSupplier(purchase.supplier);
    setItemsList(
      purchase.items && purchase.items.length > 0
        ? purchase.items.map((item) => ({ ...item }))
        : [{ name: purchase.itemDetails || "", quantity: 1, unit: "pcs", price: purchase.amount }]
    );
    setTotalAmount(purchase.amount !== undefined && purchase.amount !== null ? purchase.amount.toString() : "");
    setStatus(purchase.status);
    setDate(new Date(purchase.date).toISOString().split("T")[0]);
    setFormError("");
    setShowModal(true);
  };

  const handleAddItem = () => {
    setItemsList([...itemsList, { name: "", quantity: 1, unit: "pcs", price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (itemsList.length === 1) return;
    setItemsList(itemsList.filter((_, idx) => idx !== index));
  };

  const handleUpdateItem = (index: number, field: keyof FormPurchaseItem, value: any) => {
    const updated = [...itemsList];
    updated[index] = {
      ...updated[index],
      [field]: field === "quantity" || field === "price" ? (value === "" ? 0 : Number(value) || 0) : value
    };
    setItemsList(updated);

    if (field === "quantity" || field === "price") {
      const sum = updated.reduce((acc, item) => acc + (item.quantity * (item.price || 0)), 0);
      if (sum > 0) {
        setTotalAmount(sum.toString());
      }
    }
  };

  const handleTotalAmountChange = (val: string) => {
    setTotalAmount(val);
    const num = Number(val) || 0;
    // If only 1 item and its price is currently 0 or empty, automatically sync unit price
    if (itemsList.length === 1 && num > 0) {
      const qty = itemsList[0].quantity > 0 ? itemsList[0].quantity : 1;
      const unitPrice = Math.round((num / qty) * 100) / 100;
      setItemsList([{ ...itemsList[0], price: unitPrice }]);
    }
  };

  const calculatedTotalAmount = itemsList.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0);
  const displayTotal = totalAmount !== "" ? totalAmount : (calculatedTotalAmount > 0 ? calculatedTotalAmount.toString() : "");

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    // Validation
    if (!supplier.trim()) {
      setFormError("Supplier name is required.");
      return;
    }

    const calculatedTotal = itemsList.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0);
    const finalAmount = Number(totalAmount) > 0 ? Number(totalAmount) : calculatedTotal;

    if (finalAmount <= 0) {
      setFormError("Please enter a total purchase amount greater than 0.");
      return;
    }

    const invalidItem = itemsList.find(item => !item.name.trim() || item.quantity <= 0);
    if (invalidItem) {
      setFormError("Please enter a valid item description and quantity.");
      return;
    }

    // Ensure all items have a valid price for MongoDB schema requirements
    const sanitizedItems = itemsList.map(item => {
      let itemPrice = Number(item.price) || 0;
      if (itemPrice <= 0 && finalAmount > 0) {
        const totalQty = itemsList.reduce((acc, it) => acc + (it.quantity || 1), 0);
        itemPrice = Math.round((finalAmount / totalQty) * 100) / 100;
      }
      return {
        ...item,
        price: itemPrice
      };
    });

    // Auto generate details summary text for backward compatibility
    const itemDetailsText = sanitizedItems
      .map(item => `${item.name} (${item.quantity} ${item.unit} @ Rs. ${item.price.toLocaleString()})`)
      .join(", ");

    setSubmitting(true);
    try {
      if (editingPurchase) {
        // Update existing purchase
        await updatePurchase(editingPurchase._id, {
          supplier,
          itemDetails: itemDetailsText,
          amount: finalAmount,
          status,
          items: sanitizedItems,
          date
        });
      } else {
        // Create new purchase
        await createPurchase({
          supplier,
          itemDetails: itemDetailsText,
          amount: finalAmount,
          status,
          items: sanitizedItems,
          date
        });
      }
      setShowModal(false);
      setEditingPurchase(null);
    } catch (err: any) {
      setFormError(err.message || "Failed to save purchase.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: Purchase["status"]) => {
    try {
      await updatePurchaseStatus(id, newStatus);
    } catch (err) {
      console.error("Failed to update purchase status", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this purchase log?")) {
      try {
        await deletePurchase(id);
      } catch (err) {
        console.error("Failed to delete purchase log", err);
      }
    }
  };

  const getStatusBadge = (status: Purchase["status"]) => {
    switch (status) {
      case "paid":
        return "bg-green-600 border-green-600 text-white";
      case "partial":
        return "bg-amber-600 border-amber-600 text-white";
      default:
        return "bg-red-600 border-red-600 text-white";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-card p-5 sm:p-6 rounded-[28px] border border-border/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div
            style={{ background: "linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #1D4ED8 100%)" }}
            className="p-3 text-white rounded-2xl shadow-md shadow-blue-500/20 shrink-0"
          >
            <Briefcase size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground leading-tight">
              Purchases Tracker
            </h1>
            <p className="text-xs text-muted font-medium mt-0.5">
              Log raw material stock orders, imports, and payments made to suppliers and vendors.
            </p>
          </div>
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

          {/* Quick Statement Download */}
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
              title="Preview and Print PDF Purchases Statement"
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
            Log Supplier Purchase
          </button>
        </div>
      </div>

      {/* Archived Monthly Statements */}
      {user?.role === "admin" && statementArchives.filter((a) => a.type === "purchases").length > 0 && (
        <div className="bg-card border border-border p-4 rounded-lg">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar size={14} className="text-accent" />
            Archived Monthly Purchases Statements (PDF & CSV)
          </h3>
          <div className="flex flex-wrap gap-2">
            {statementArchives
              .filter((a) => a.type === "purchases")
              .map((archive) => (
                <div
                  key={archive._id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-border bg-background hover:bg-accent/[0.04] hover:border-accent/30 text-xs font-bold transition-all"
                >
                  <button
                    onClick={() => handlePreviewArchive(archive._id)}
                    className="flex items-center gap-1.5 text-foreground hover:text-accent transition-colors"
                    title="Preview / Print PDF"
                  >
                    <Briefcase size={12} className="text-accent" />
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Total Purchases Cost (Signature Sunset Gradient Hero Card) */}
        <div
          className="relative rounded-[28px] p-6 shadow-xl shadow-orange-500/10 overflow-hidden flex items-center justify-between transition-all hover:scale-[1.01]"
          style={{
            background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)",
          }}
        >
          <div className="relative z-10 space-y-1">
            <span className="text-xs font-semibold text-black/85 uppercase tracking-wider block">
              Total Purchases {exportMonth === "all" ? "(All Time)" : `(${selectedMonthInfo?.name || "Month"} ${exportYear} BS)`}
            </span>
            <h3 className="text-3xl sm:text-4xl font-semibold font-display text-black leading-none mt-1">Rs. {totalPurchases.toLocaleString()}</h3>
            <p className="text-xs text-black/75 font-medium mt-1">
              {periodPurchases.length} {periodPurchases.length === 1 ? "invoice" : "invoices"} recorded {exportMonth === "all" ? "(All Time)" : `in ${selectedMonthInfo?.name || "Month"} ${exportYear}`}
            </p>
          </div>
          <div className="p-3 bg-black text-white rounded-2xl shadow-md shrink-0 relative z-10">
            <Briefcase size={24} />
          </div>
        </div>

        {/* Outstanding Vendor Dues (Crisp Porcelain Card) */}
        <div className="bg-card border border-border/80 shadow-xs hover:shadow-md transition-all p-6 rounded-[28px] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">Outstanding Vendor Dues</span>
            <h3 className="text-3xl sm:text-4xl font-bold font-display text-red-500 leading-none mt-1">Rs. {pendingPurchases.toLocaleString()}</h3>
            <p className="text-[10px] text-muted mt-1 font-medium">{periodPurchases.filter((p) => p.status === "pending").length} unpaid invoices in period</p>
          </div>
          <div
            style={{ background: "linear-gradient(135deg, #F87171 0%, #EF4444 50%, #DC2626 100%)" }}
            className="p-3 text-white rounded-2xl shadow-md shadow-red-500/20 shrink-0"
          >
            <SlidersHorizontal size={24} className="rotate-90" />
          </div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-card border border-border/80 rounded-[28px] shadow-xs p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 pl-10 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-xs transition-all duration-200"
            placeholder="Search by supplier name or items description..."
          />
          <SlidersHorizontal className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-muted" />
        </div>

        <div className="flex items-center gap-2 text-xs w-full md:w-auto">
          <span className="text-muted font-medium">Payment Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-xs font-semibold cursor-pointer transition-all duration-200"
          >
            <option value="all">All Invoices</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
          </select>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-card border border-border/80 rounded-[28px] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-card text-muted border-b border-border uppercase font-semibold tracking-wider text-[10px]">
                <th className="p-4">Date</th>
                <th className="p-4">Supplier / Vendor</th>
                <th className="p-4">Purchased Item Details</th>
                <th className="p-4 font-medium">Logged By</th>
                <th className="p-4 text-center">Payment Status</th>
                <th className="p-4 text-right">Invoice Amount</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    {exportMonth === "all"
                      ? "No supplier purchase invoices logged matching these criteria."
                      : `No supplier purchase invoices logged for ${selectedMonthInfo?.name || "Month"} ${exportYear} BS. Switch months above or select All Time.`}
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => (
                  <React.Fragment key={purchase._id}>
                    <tr className="hover:bg-border/20 transition-colors">
                      <td className="p-4 font-semibold text-foreground text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-muted" />
                          {formatNepali(purchase.date)}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-foreground">
                        {purchase.supplier}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-foreground max-w-xs truncate" title={purchase.itemDetails}>
                            {purchase.itemDetails}
                          </span>
                          {purchase.items && purchase.items.length > 0 && (
                            <button
                              onClick={() => setExpandedPurchaseId(expandedPurchaseId === purchase._id ? null : purchase._id)}
                              className="text-[10px] text-accent font-bold self-start mt-0.5 hover:underline"
                            >
                              {expandedPurchaseId === purchase._id ? "Hide breakdown" : `View breakdown (${purchase.items.length} items)`}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-medium text-muted">
                        <div className="flex items-center gap-1.5">
                          <User size={11} className="text-accent" />
                          {purchase.createdBy?.name || "System"}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <select
                          value={purchase.status}
                          onChange={(e) => handleStatusChange(purchase._id, e.target.value as any)}
                          className={`px-2 py-1 text-[9px] font-bold rounded border uppercase cursor-pointer focus:outline-none ${getStatusBadge(purchase.status)}`}
                        >
                          <option value="paid">Paid</option>
                          <option value="pending">Pending</option>
                          <option value="partial">Partial</option>
                        </select>
                      </td>
                      <td className="p-4 text-right font-extrabold text-foreground">
                        Rs. {purchase.amount.toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingPurchase(viewingPurchase?._id === purchase._id ? null : purchase)}
                            className="p-1.5 bg-blue-600 rounded text-white hover:bg-blue-700 transition-colors shadow-sm"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          {user?.role === "admin" && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(purchase)}
                                className="p-1.5 bg-amber-600 rounded text-white hover:bg-amber-700 transition-colors shadow-sm"
                                title="Edit Purchase"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(purchase._id)}
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

                    {/* Collapsible itemized details sub-row */}
                    {expandedPurchaseId === purchase._id && purchase.items && purchase.items.length > 0 && (
                      <tr className="bg-border/5">
                        <td colSpan={7} className="p-4 border-b border-border">
                          <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm max-w-2xl animate-fade-in">
                            <h4 className="font-bold text-[10px] uppercase text-muted tracking-wider mb-2.5">
                              Itemized Invoice Breakdown
                            </h4>
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="text-muted border-b border-border/60 uppercase font-semibold text-[9px]">
                                  <th className="pb-2">Material / Item</th>
                                  <th className="pb-2 text-center">Qty</th>
                                  <th className="pb-2 text-right">Unit Price</th>
                                  <th className="pb-2 text-right">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/40">
                                {purchase.items.map((item, index) => (
                                  <tr key={index} className="text-foreground hover:bg-border/10 transition-colors">
                                    <td className="py-2 font-semibold">{item.name}</td>
                                    <td className="py-2 text-center font-bold">
                                      {item.quantity} <span className="text-[9px] font-normal text-muted">{item.unit}</span>
                                    </td>
                                    <td className="py-2 text-right">Rs. {item.price.toLocaleString()}</td>
                                    <td className="py-2 text-right font-bold">
                                      Rs. {(item.quantity * item.price).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 pt-16 sm:p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-4xl rounded-[28px] border border-border/80 p-5 sm:p-7 shadow-2xl animate-scale-up max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 border-b border-border/60 pb-3">
              <h2 className="text-base sm:text-lg font-bold font-display flex items-center gap-2.5">
                <div
                  style={{ background: "linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #1D4ED8 100%)" }}
                  className="p-2 text-white rounded-xl shadow-xs shrink-0"
                >
                  <Briefcase size={18} />
                </div>
                {editingPurchase ? "Edit Purchase Invoice" : "Log Supplier Purchase"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted hover:text-foreground p-1.5 rounded-xl hover:bg-muted/20 transition-all"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                    Supplier / Vendor Name *
                  </label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-accent text-sm"
                    placeholder="e.g. Nepal Acrylic Supplies Pvt. Ltd."
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                    Invoice Date (BS) *
                  </label>
                  <NepaliDatePicker
                    value={date}
                    onChange={(iso) => setDate(iso)}
                    required
                  />
                </div>
              </div>

              {/* Structured Line Items Entry */}
              <div className="space-y-2">
                <div className="flex justify-between items-center border-b border-border/80 pb-1">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Purchase Items *</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 py-1 px-2.5 bg-accent hover:bg-accent-dark text-white rounded text-[10px] font-bold transition-all shadow-sm"
                  >
                    <Plus size={10} /> Add Item
                  </button>
                </div>

                <div className="hidden sm:grid grid-cols-12 gap-2 px-2 text-[10px] font-bold text-muted uppercase tracking-wider">
                  <div className="col-span-5">Item Description</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-2 text-center">Unit</div>
                  <div className="col-span-2 text-right">Unit Price</div>
                  <div className="col-span-1"></div>
                </div>

                <div className="space-y-2">
                  {itemsList.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center bg-border/20 p-2.5 rounded border border-border/40">
                      <div className="col-span-12 sm:col-span-5">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(index, "name", e.target.value)}
                          placeholder="Item description (e.g. Acrylic Sheets)"
                          className="w-full px-2 py-1.5 text-xs border border-border rounded bg-background focus:outline-none"
                          required
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <input
                          type="number"
                          value={item.quantity || ""}
                          onChange={(e) => handleUpdateItem(index, "quantity", e.target.value)}
                          placeholder="Qty"
                          min="1"
                          className="w-full px-2 py-1.5 text-xs border border-border rounded bg-background focus:outline-none font-bold text-center"
                          required
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleUpdateItem(index, "unit", e.target.value)}
                          placeholder="Unit (pcs)"
                          className="w-full px-2 py-1.5 text-xs border border-border rounded bg-background focus:outline-none text-center"
                          required
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <input
                          type="number"
                          value={item.price || ""}
                          onChange={(e) => handleUpdateItem(index, "price", e.target.value)}
                          placeholder="Price"
                          min="0"
                          step="any"
                          className="w-full px-2 py-1.5 text-xs border border-border rounded bg-background focus:outline-none text-right font-bold"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-1 text-center">
                        <button
                          type="button"
                          disabled={itemsList.length === 1}
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4">
                <div>
                  <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                    Payment Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-accent text-sm font-semibold"
                  >
                    <option value="pending">Pending (Unpaid)</option>
                    <option value="partial">Partial Payment</option>
                    <option value="paid">Fully Paid</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-semibold text-muted uppercase tracking-wider">
                      Total Amount (Rs.) *
                    </label>
                    <span className="text-[10px] text-accent font-medium">Click to enter or edit</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted select-none">
                      Rs.
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={displayTotal}
                      onChange={(e) => handleTotalAmountChange(e.target.value)}
                      placeholder="0"
                      required
                      className="w-full pl-9 pr-3 py-2 border border-border rounded bg-background text-sm font-extrabold text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-border rounded text-xs hover:bg-border transition-colors font-semibold"
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
                  {submitting ? "Saving..." : editingPurchase ? "Update Invoice" : "Log Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingPurchase && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-lg rounded-lg border border-border p-6 shadow-2xl animate-scale-up max-h-[calc(100dvh-32px)] sm:max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
              <h2 className="text-lg font-bold font-display flex items-center gap-2">
                <Eye className="text-accent" />
                Purchase Details
              </h2>
              <button
                onClick={() => setViewingPurchase(null)}
                className="text-muted hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-0.5">Supplier / Vendor</span>
                  <span className="text-sm font-bold text-foreground">{viewingPurchase.supplier}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-0.5">Invoice Date</span>
                  <p className="text-xs font-semibold text-foreground">
                    {formatNepali(viewingPurchase.date)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-0.5">Payment Status</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${getStatusBadge(viewingPurchase.status)}`}>
                    {viewingPurchase.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-0.5">Total Amount</span>
                  <span className="text-lg font-extrabold text-foreground font-display">Rs. {viewingPurchase.amount.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-0.5">Logged By</span>
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <User size={12} className="text-accent" />
                  {viewingPurchase.createdBy?.name || "System"}
                </span>
              </div>

              {/* Itemized Breakdown */}
              {viewingPurchase.items && viewingPurchase.items.length > 0 ? (
                <div className="border-t border-border pt-3">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-2">Itemized Invoice Breakdown</span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                      <thead>
                        <tr className="text-muted border-b border-border/60 uppercase font-semibold text-[9px]">
                          <th className="pb-2">Material / Item</th>
                          <th className="pb-2 text-center">Qty</th>
                          <th className="pb-2 text-right">Unit Price</th>
                          <th className="pb-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {viewingPurchase.items.map((item, index) => (
                          <tr key={index} className="text-foreground">
                            <td className="py-2 font-semibold">{item.name}</td>
                            <td className="py-2 text-center font-bold">
                              {item.quantity} <span className="text-[9px] font-normal text-muted">{item.unit}</span>
                            </td>
                            <td className="py-2 text-right">Rs. {item.price.toLocaleString()}</td>
                            <td className="py-2 text-right font-bold">Rs. {(item.quantity * item.price).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="border-t border-border pt-3">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">Item Details</span>
                  <p className="text-sm text-foreground font-medium">{viewingPurchase.itemDetails}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-4 mt-4">
              {user?.role === "admin" && (
                <button
                  onClick={() => {
                    handleOpenEditModal(viewingPurchase);
                    setViewingPurchase(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded text-xs hover:bg-amber-700 transition-colors shadow-sm font-bold"
                >
                  <Edit2 size={13} /> Edit Purchase
                </button>
              )}
              <button
                onClick={() => setViewingPurchase(null)}
                className="px-4 py-2 border border-border rounded text-xs hover:bg-border transition-colors font-semibold"
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
