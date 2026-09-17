import React, { useState, useEffect } from "react";
import { useStore, Attendance, Salary, User as StoreUser } from "../store/useStore";
import {
  Calendar,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  DollarSign,
  TrendingUp,
  User as UserIcon,
  CheckCircle2,
  FileText,
  Edit2,
  Trash2
} from "./ui/solar-icons";
import { UserPlus, Users, AlertTriangle, Key, ShieldCheck, Search, Shield } from "lucide-react";
import { NepaliDatePicker } from "./ui/NepaliDatePicker";
import {
  NEPALI_MONTHS,
  NEPALI_YEARS,
  NEPALI_DAYS,
  toNepaliDate,
  getCurrentNepaliDate,
  getDaysInBsMonth,
  getFirstDayOfBsMonth,
  bsToAd,
  adToBs,
  formatNepali,
} from "../utils/nepaliDate";

export const StaffManagement: React.FC = () => {
  const {
    user,
    activeStaffProfile,
    users,
    attendanceLogs,
    salaries,
    fetchUsers,
    fetchAttendanceLogs,
    logAttendance,
    updateAttendance,
    deleteAttendance,
    createSalary,
    updateSalary,
    deleteSalary,
    createUser,
    updateUser,
    deleteUser
  } = useStore();

  // Active staff member (supports direct login or shared staff login persona)
  const getActiveStaff = (): StoreUser | null => {
    if (user?.role === "admin") return null;
    if (user?.email === "staff@ktmdecor.com") {
      return activeStaffProfile;
    }
    return user;
  };

  const activeStaff = getActiveStaff();
  const isAdmin = user?.role === "admin";

  // Tab State (for admin)
  const [adminTab, setAdminTab] = useState<"payroll" | "directory" | "calendar" | "bulk">("payroll");

  const currentBs = getCurrentNepaliDate();

  // Selected Date Filter State (defaulting to current Nepali BS date)
  const [selectedMonth, setSelectedMonth] = useState<number>(currentBs.month); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(currentBs.year);
  const [selectedAdminStaffId, setSelectedAdminStaffId] = useState<string>("");
  const [selectedDayNum, setSelectedDayNum] = useState<number>(currentBs.day);
  const [activityDate, setActivityDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Modal / Form States
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingLog, setEditingLog] = useState<Attendance | null>(null);
  const [modalDate, setModalDate] = useState<Date>(new Date());
  const [modalUserId, setModalUserId] = useState<string>("");
  const [modalStatus, setModalStatus] = useState<"present" | "absent" | "half_day" | "leave">("present");
  const [modalCheckIn, setModalCheckIn] = useState<string>("");
  const [modalCheckOut, setModalCheckOut] = useState<string>("");
  const [modalNotes, setModalNotes] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Salary Modal & Form States
  const [showSalaryModal, setShowSalaryModal] = useState<boolean>(false);
  const [selectedSalaryUser, setSelectedSalaryUser] = useState<StoreUser | null>(null);
  const [salaryBase, setSalaryBase] = useState<number>(30000);
  const [salaryPresentDays, setSalaryPresentDays] = useState<number>(0);
  const [salaryAbsentDays, setSalaryAbsentDays] = useState<number>(0);
  const [salaryBonus, setSalaryBonus] = useState<number>(0);
  const [salaryDeductions, setSalaryDeductions] = useState<number>(0);
  const [salaryFinal, setSalaryFinal] = useState<number>(0);
  const [salaryStatus, setSalaryStatus] = useState<"pending" | "paid">("pending");
  const [salaryPaymentMethod, setSalaryPaymentMethod] = useState<"cash" | "online_banking" | "esewa" | "cheque" | "other">("cash");
  const [salaryPaymentDate, setSalaryPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [salaryNotes, setSalaryNotes] = useState<string>("");
  const [editingSalaryRecord, setEditingSalaryRecord] = useState<Salary | null>(null);
  const [salaryFormError, setSalaryFormError] = useState<string>("");
  const [salarySubmitting, setSalarySubmitting] = useState<boolean>(false);
  const [salaryModalMonth, setSalaryModalMonth] = useState<number>(currentBs.month);
  const [salaryModalYear, setSalaryModalYear] = useState<number>(currentBs.year);

  // Historical Salary Log Filter States
  const [historySearchQuery, setHistorySearchQuery] = useState<string>("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("all");
  const [historyMonthFilter, setHistoryMonthFilter] = useState<string>("all");
  const [historyYearFilter, setHistoryYearFilter] = useState<string>("all");

  // Bulk logging state
  const [bulkDate, setBulkDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [bulkStatusMap, setBulkStatusMap] = useState<Record<string, "present" | "absent" | "half_day" | "leave">>({});
  const [bulkNotesMap, setBulkNotesMap] = useState<Record<string, string>>({});
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string>("");

  // User Management Modal & Form States
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<StoreUser | null>(null);
  const [userFormName, setUserFormName] = useState<string>("");
  const [userFormEmail, setUserFormEmail] = useState<string>("");
  const [userFormRole, setUserFormRole] = useState<"staff" | "admin">("staff");
  const [userFormBaseSalary, setUserFormBaseSalary] = useState<number | string>(25000);
  const [userFormPassword, setUserFormPassword] = useState<string>("");
  const [userFormError, setUserFormError] = useState<string>("");
  const [userFormSubmitting, setUserFormSubmitting] = useState<boolean>(false);

  // User Deletion Confirmation Modal States
  const [showDeleteUserModal, setShowDeleteUserModal] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<StoreUser | null>(null);
  const [deleteUserError, setDeleteUserError] = useState<string>("");
  const [deleteUserSubmitting, setDeleteUserSubmitting] = useState<boolean>(false);

  // Directory Search Filter State
  const [directorySearchQuery, setDirectorySearchQuery] = useState<string>("");

  // Year list in Bikram Sambat
  const years = NEPALI_YEARS;
  // Month list in Bikram Sambat
  const months = NEPALI_MONTHS;

  // Fetch initial data
  useEffect(() => {
    fetchUsers();
  }, []);

  // Set default admin selected staff
  useEffect(() => {
    const staffList = users.filter(u => u.role === "staff" && u.email !== "staff@ktmdecor.com");
    if (staffList.length > 0 && !selectedAdminStaffId) {
      setSelectedAdminStaffId(staffList[0]._id);
    }
  }, [users]);

  // Clamp selectedDayNum when month/year changes
  useEffect(() => {
    const daysInMonth = getDaysInBsMonth(selectedYear, selectedMonth);
    if (selectedDayNum > daysInMonth) {
      setSelectedDayNum(daysInMonth);
    }
  }, [selectedMonth, selectedYear]);

  // Sync selectedMonth and selectedYear with activityDate selection
  useEffect(() => {
    const bs = adToBs(activityDate);
    if (bs.month !== selectedMonth || bs.year !== selectedYear) {
      setSelectedMonth(bs.month);
      setSelectedYear(bs.year);
    }
  }, [activityDate]);

  // Fetch attendance logs when filter selections change
  useEffect(() => {
    if (isAdmin) {
      if (adminTab === "payroll") {
        // Fetch all attendance logs for the month to calculate payroll
        fetchAttendanceLogs(undefined, selectedMonth, selectedYear);
      } else if (adminTab === "calendar" && selectedAdminStaffId) {
        // Fetch logs for the specific staff member
        fetchAttendanceLogs(selectedAdminStaffId, selectedMonth, selectedYear);
      }
    } else if (activeStaff) {
      // Fetch current staff's logs
      fetchAttendanceLogs(activeStaff._id, selectedMonth, selectedYear);
    }
  }, [isAdmin, adminTab, activeStaff?.email, activeStaff?._id, selectedAdminStaffId, selectedMonth, selectedYear]);

  // Bulk state initialization when users load
  useEffect(() => {
    const staffList = users.filter(u => u.role === "staff" && u.email !== "staff@ktmdecor.com");
    const initialStatuses: Record<string, "present" | "absent" | "half_day" | "leave"> = {};
    const initialNotes: Record<string, string> = {};
    staffList.forEach(s => {
      initialStatuses[s._id] = "present";
      initialNotes[s._id] = "";
    });
    setBulkStatusMap(initialStatuses);
    setBulkNotesMap(initialNotes);
  }, [users]);

  // Help calculate weekdays in Nepal (Sunday through Friday, Saturday off)
  const getWorkingDaysInMonth = (year: number, month: number): number => {
    const totalDays = getDaysInBsMonth(year, month);
    const firstDay = getFirstDayOfBsMonth(year, month);
    let count = 0;
    for (let d = 1; d <= totalDays; d++) {
      const day = (firstDay + d - 1) % 7;
      if (day !== 6) { // 6 is Saturday (Nepal weekend)
        count++;
      }
    }
    return count;
  };

  // Find attendance record matching a day
  const getLogForDay = (day: number): Attendance | undefined => {
    return attendanceLogs.find(log => {
      const bs = adToBs(log.date);
      return (
        bs.day === day &&
        bs.month === selectedMonth &&
        bs.year === selectedYear
      );
    });
  };

  // Find attendance record matching a specific user and date string (YYYY-MM-DD)
  const getLogForUserOnDate = (userId: string, dateStr: string): Attendance | undefined => {
    return attendanceLogs.find(log => {
      const isCorrectUser = log.user?._id === userId || (log.user as any) === userId;
      const logDateStr = new Date(log.date).toISOString().slice(0, 10);
      return isCorrectUser && logDateStr === dateStr;
    });
  };

  // Check-In and Check-Out helper for Today (for Staff View)
  const getTodayLog = (): Attendance | undefined => {
    const today = new Date();
    return attendanceLogs.find(log => {
      const logDate = new Date(log.date);
      return (
        logDate.getUTCDate() === today.getDate() &&
        logDate.getUTCMonth() === today.getMonth() &&
        logDate.getUTCFullYear() === today.getFullYear() &&
        (log.user?._id === activeStaff?._id || (log.user as any) === activeStaff?._id)
      );
    });
  };

  const todayLog = getTodayLog();

  const handleQuickCheckIn = async () => {
    if (!activeStaff) return;
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const checkInTime = new Date().toISOString();
      await logAttendance({
        user: activeStaff._id,
        date: todayStr,
        status: "present",
        checkIn: checkInTime,
        notes: "Daily check-in via Work Station dashboard."
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleQuickCheckOut = async () => {
    if (!todayLog) return;
    try {
      const checkOutTime = new Date().toISOString();
      await updateAttendance(todayLog._id, {
        status: todayLog.status,
        checkIn: todayLog.checkIn,
        checkOut: checkOutTime,
        notes: todayLog.notes
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  // Open Log/Edit Modal
  const openModal = (date: Date, existingLog?: Attendance, userId?: string) => {
    setErrorMsg("");
    setModalDate(date);
    setEditingLog(existingLog || null);
    
    if (userId) {
      setModalUserId(userId);
    } else if (activeStaff) {
      setModalUserId(activeStaff._id);
    }

    if (existingLog) {
      setModalStatus(existingLog.status);
      setModalNotes(existingLog.notes || "");
      
      if (existingLog.checkIn) {
        const d = new Date(existingLog.checkIn);
        setModalCheckIn(d.toTimeString().slice(0, 5));
      } else {
        setModalCheckIn("");
      }

      if (existingLog.checkOut) {
        const d = new Date(existingLog.checkOut);
        setModalCheckOut(d.toTimeString().slice(0, 5));
      } else {
        setModalCheckOut("");
      }
    } else {
      setModalStatus("present");
      setModalNotes("");
      setModalCheckIn("");
      setModalCheckOut("");
    }
    setShowEditModal(true);
  };

  // Save Modal Log
  const handleSaveModalLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      // Build check-in/out full timestamps based on selected date
      let checkInTimestamp: string | null = null;
      let checkOutTimestamp: string | null = null;

      const dateBase = new Date(modalDate);

      if (modalCheckIn) {
        const [hours, minutes] = modalCheckIn.split(":");
        const d = new Date(dateBase);
        d.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        checkInTimestamp = d.toISOString();
      }

      if (modalCheckOut) {
        const [hours, minutes] = modalCheckOut.split(":");
        const d = new Date(dateBase);
        d.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        checkOutTimestamp = d.toISOString();
      }

      const dateStr = dateBase.toISOString().slice(0, 10);

      if (editingLog) {
        // Edit log
        await updateAttendance(editingLog._id, {
          status: modalStatus,
          checkIn: checkInTimestamp,
          checkOut: checkOutTimestamp,
          notes: modalNotes
        });
      } else {
        // Create log
        await logAttendance({
          user: modalUserId,
          date: dateStr,
          status: modalStatus,
          checkIn: checkInTimestamp,
          checkOut: checkOutTimestamp,
          notes: modalNotes
        });
      }
      setShowEditModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save attendance log.");
    }
  };

  // Delete Log
  const handleDeleteLog = async () => {
    if (!editingLog) return;
    if (!window.confirm("Are you sure you want to delete this attendance log?")) return;
    try {
      await deleteAttendance(editingLog._id);
      setShowEditModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete attendance log.");
    }
  };

  // Bulk Attendance Logging Handler
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkSuccessMsg("");
    setErrorMsg("");

    const staffList = users.filter(u => u.role === "staff" && u.email !== "staff@ktmdecor.com");
    try {
      for (const staff of staffList) {
        const status = bulkStatusMap[staff._id] || "present";
        const notes = bulkNotesMap[staff._id] || "";
        const dateBase = new Date(bulkDate);
        
        let checkInTimestamp: string | undefined = undefined;
        let checkOutTimestamp: string | undefined = undefined;

        if (status === "present" || status === "half_day") {
          // Add default check-in/out timestamps (9:00 AM to 5:00 PM)
          const checkInDate = new Date(dateBase);
          checkInDate.setHours(9, 0, 0, 0);
          checkInTimestamp = checkInDate.toISOString();

          const checkOutDate = new Date(dateBase);
          checkOutDate.setHours(17, 0, 0, 0);
          checkOutTimestamp = checkOutDate.toISOString();
        }

        await logAttendance({
          user: staff._id,
          date: bulkDate,
          status,
          checkIn: checkInTimestamp,
          checkOut: checkOutTimestamp,
          notes: notes
        });
      }

      setBulkSuccessMsg("Bulk attendance logged successfully for all staff members!");
      // Reset notes
      const initialNotes: Record<string, string> = {};
      staffList.forEach(s => {
        initialNotes[s._id] = "";
      });
      setBulkNotesMap(initialNotes);
    } catch (err: any) {
      setErrorMsg(err.message || "Bulk logging encountered some failures.");
    }
  };

  // Calculate monthly stats for a user
  const getUserMonthlyStats = (userId: string) => {
    const userLogs = attendanceLogs.filter(log => {
      const isCorrectUser = log.user?._id === userId || (log.user as any) === userId;
      return isCorrectUser;
    });

    let present = 0;
    let leaves = 0;
    let absents = 0;
    let halfDays = 0;

    userLogs.forEach(log => {
      if (log.status === "present") present++;
      else if (log.status === "leave") leaves++;
      else if (log.status === "absent") absents++;
      else if (log.status === "half_day") halfDays++;
    });

    const totalWorkingDays = getWorkingDaysInMonth(selectedYear, selectedMonth);
    const presentCredit = present + (halfDays * 0.5);
    const offDays = absents + leaves + (halfDays * 0.5);

    const workingDaysPercent = totalWorkingDays > 0 ? (presentCredit / totalWorkingDays) * 100 : 0;

    return {
      presentCount: present,
      leaveCount: leaves,
      absentCount: absents,
      halfDayCount: halfDays,
      totalWorkingDays,
      presentCredit,
      offDays,
      workingDaysPercent
    };
  };

  // Render Calendar Grid helper
  const renderCalendar = () => {
    const daysInMonth = getDaysInBsMonth(selectedYear, selectedMonth);
    const firstDayOfWeek = getFirstDayOfBsMonth(selectedYear, selectedMonth); // 0 = Sunday

    const gridCells = [];

    // Preceding empty slots
    for (let i = 0; i < firstDayOfWeek; i++) {
      gridCells.push(<div key={`empty-${i}`} className="h-14 sm:h-24 md:h-28 border border-border/30 bg-muted/5 opacity-40" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = (firstDayOfWeek + day - 1) % 7;
      const isWeekend = dayOfWeek === 6; // Saturday in Nepal
      const log = getLogForDay(day);
      const isToday =
        day === currentBs.day &&
        selectedMonth === currentBs.month &&
        selectedYear === currentBs.year;
      
      const isSelected = day === selectedDayNum;

      let cellBg = "bg-card";
      let textBadgeColor = "text-muted";
      let statusText = "";

      if (log) {
        if (log.status === "present") {
          cellBg = "bg-green-500/5 dark:bg-green-500/10 border-green-500/25";
          textBadgeColor = "text-green-600 dark:text-green-400";
          statusText = "Present";
        } else if (log.status === "absent") {
          cellBg = "bg-red-500/5 dark:bg-red-500/10 border-red-500/25";
          textBadgeColor = "text-red-600 dark:text-red-400";
          statusText = "Absent";
        } else if (log.status === "half_day") {
          cellBg = "bg-orange-500/5 dark:bg-orange-500/10 border-orange-500/25";
          textBadgeColor = "text-orange-600 dark:text-orange-400";
          statusText = "Half Day";
        } else if (log.status === "leave") {
          cellBg = "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/25";
          textBadgeColor = "text-amber-600 dark:text-amber-400";
          statusText = "On Leave";
        }
      } else if (isWeekend) {
        cellBg = "bg-muted/10 opacity-70";
        statusText = "Weekend";
      }

      let borderRingClass = "border-border";
      if (isSelected) {
        borderRingClass = "ring-2 ring-accent bg-accent/5 dark:bg-accent/10 border-accent/30 z-10";
      } else if (isToday) {
        borderRingClass = "ring-2 ring-accent/30 border-accent/30";
      }

      gridCells.push(
        <div
          key={`day-${day}`}
          onClick={() => {
            setSelectedDayNum(day);
          }}
          className={`h-14 sm:h-24 md:h-28 p-1.5 sm:p-2 border flex flex-col justify-between cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-sm group relative ${cellBg} ${borderRingClass}`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-[10px] sm:text-xs font-extrabold ${isToday ? "text-accent" : "text-foreground"}`}>
              {day}
            </span>
            {statusText && (
              <>
                <span className={`hidden sm:inline-block text-[8px] sm:text-[9px] font-bold uppercase tracking-wider ${textBadgeColor}`}>
                  {statusText}
                </span>
                {log && (
                  <span className={`sm:hidden w-1.5 h-1.5 rounded-full absolute top-1.5 right-1.5 ${
                    log.status === "present" ? "bg-green-500" :
                    log.status === "absent" ? "bg-red-500" :
                    log.status === "half_day" ? "bg-orange-500" :
                    "bg-amber-500"
                  }`} />
                )}
              </>
            )}
          </div>

          <div className="hidden sm:flex flex-col justify-end space-y-0.5 text-[8px] sm:text-[10px] text-muted overflow-hidden">
            {log?.checkIn && (
              <div className="flex items-center gap-1">
                <Clock size={8} />
                <span className="truncate">In: {new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
            {log?.checkOut && (
              <div className="flex items-center gap-1">
                <Clock size={8} />
                <span className="truncate">Out: {new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
            {log?.notes && (
              <div className="flex items-center gap-1 text-muted/80 max-w-full">
                <FileText size={8} className="shrink-0" />
                <span className="truncate">{log.notes}</span>
              </div>
            )}
            {!log && !isWeekend && (
              <span className="text-[8px] font-medium text-muted/50 italic select-none">
                Unmarked
              </span>
            )}
          </div>

          {/* Quick hover indicator for desktop */}
          {(isAdmin || (isToday && !log)) && (
            <div className="absolute inset-0 bg-accent/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 hidden sm:flex items-center justify-center transition-opacity rounded-xl">
              <span className="bg-accent text-white text-[9px] font-bold uppercase px-2 py-1 rounded shadow-sm">
                Select Day
              </span>
            </div>
          )}
        </div>
      );
    }

    return gridCells;
  };

  // Render Selected Day Details Helper
  const renderSelectedDayDetails = (userIdToRender: string) => {
    const selectedDate = bsToAd(selectedYear, selectedMonth, selectedDayNum);
    const dayOfWeek = (getFirstDayOfBsMonth(selectedYear, selectedMonth) + selectedDayNum - 1) % 7;
    const isWeekend = dayOfWeek === 6; // Saturday
    const log = getLogForDay(selectedDayNum);
    const isToday =
      selectedDayNum === currentBs.day &&
      selectedMonth === currentBs.month &&
      selectedYear === currentBs.year;

    let statusText = "Unmarked";
    let statusColorClass = "text-muted bg-muted/10 border-muted/20";

    if (log) {
      if (log.status === "present") {
        statusText = "Present";
        statusColorClass = "text-green-500 bg-green-500/10 border-green-500/20";
      } else if (log.status === "absent") {
        statusText = "Absent";
        statusColorClass = "text-red-500 bg-red-500/10 border-red-500/20";
      } else if (log.status === "half_day") {
        statusText = "Half Day";
        statusColorClass = "text-orange-500 bg-orange-500/10 border-orange-500/20";
      } else if (log.status === "leave") {
        statusText = "On Leave";
        statusColorClass = "text-amber-500 bg-amber-500/10 border-amber-500/20";
      }
    } else if (isWeekend) {
      statusText = "Weekend";
      statusColorClass = "text-muted bg-muted/10 border-muted/20";
    }

    return (
      <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-muted">
              Selected Day Details
            </h4>
            <p className="text-sm font-bold text-foreground mt-0.5">
              {formatNepali(selectedDate)} ({NEPALI_DAYS[dayOfWeek].name})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusColorClass}`}>
              {statusText}
            </span>
            {(isAdmin || isToday || log) && (
              <button
                onClick={() => openModal(selectedDate, log, userIdToRender)}
                className="px-3 py-1.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-[10px] font-bold uppercase transition-all shadow-sm"
              >
                {isAdmin ? (log ? "Edit Log" : "Log Day") : (isToday ? (log ? "Update Details" : "Log Check-In") : "View Details")}
              </button>
            )}
          </div>
        </div>

        {log && (log.checkIn || log.checkOut || log.notes) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/10 p-3 rounded-xl border border-border/40 text-xs font-semibold">
            {(log.status === "present" || log.status === "half_day") && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-muted">
                  <Clock size={12} />
                  <span>Timings</span>
                </div>
                <div className="space-y-1 text-foreground font-bold">
                  <p>Check-In: {log.checkIn ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}</p>
                  <p>Check-Out: {log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}</p>
                </div>
              </div>
            )}
            {log.notes && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-muted">
                  <FileText size={12} />
                  <span>Notes / Remarks</span>
                </div>
                <p className="text-foreground italic font-medium leading-relaxed">
                  "{log.notes}"
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper to open Salary modal for creating a new record
  const openCreateSalaryModal = (staff: StoreUser) => {
    setSalaryFormError("");
    setEditingSalaryRecord(null);
    setSelectedSalaryUser(staff);
    
    const targetMonth = selectedMonth || currentBs.month;
    const targetYear = selectedYear || currentBs.year;
    setSalaryModalMonth(targetMonth);
    setSalaryModalYear(targetYear);

    const stats = getUserMonthlyStats(staff._id);
    const base = staff.baseSalary || 30000;
    const dailyRate = base / (stats.totalWorkingDays || 30);
    const calculatedDeductions = Math.round(stats.offDays * dailyRate);
    const net = Math.max(0, Math.round(base - calculatedDeductions));

    setSalaryBase(base);
    setSalaryPresentDays(stats.presentCredit);
    setSalaryAbsentDays(stats.offDays);
    setSalaryBonus(0);
    setSalaryDeductions(calculatedDeductions);
    setSalaryFinal(net);
    setSalaryStatus("pending");
    setSalaryPaymentMethod("cash");

    const daysInTargetMonth = getDaysInBsMonth(targetYear, targetMonth);
    const defaultAdDate = bsToAd(targetYear, targetMonth, Math.min(28, daysInTargetMonth));
    setSalaryPaymentDate(defaultAdDate.toISOString().slice(0, 10));
    setSalaryNotes("");
    
    setShowSalaryModal(true);
  };

  // Helper to open Salary modal for editing an existing record
  const openEditSalaryModal = (record: Salary) => {
    setSalaryFormError("");
    setEditingSalaryRecord(record);
    setSelectedSalaryUser(record.user);
    
    setSalaryModalMonth(record.month);
    setSalaryModalYear(record.year);
    setSalaryBase(record.baseSalary);
    setSalaryPresentDays(record.presentDays);
    setSalaryAbsentDays(record.absentDays);
    setSalaryBonus(record.bonus);
    setSalaryDeductions(record.deductions);
    setSalaryFinal(record.finalSalary);
    setSalaryStatus(record.status);
    setSalaryPaymentMethod(record.paymentMethod || "cash");
    setSalaryPaymentDate(record.paymentDate ? record.paymentDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setSalaryNotes(record.notes || "");
    
    setShowSalaryModal(true);
  };

  // Handler for changing month and year inside the Process Monthly Salary modal
  const handleSalaryMonthYearChange = async (newMonth: number, newYear: number) => {
    setSalaryModalMonth(newMonth);
    setSalaryModalYear(newYear);

    // If payment date is not yet set, set a reasonable default
    if (!salaryPaymentDate) {
      const targetDate = bsToAd(newYear, newMonth, Math.min(28, getDaysInBsMonth(newYear, newMonth))).toISOString().slice(0, 10);
      setSalaryPaymentDate(targetDate);
    }

    // Auto-calculate attendance stats for this employee and period
    const userToEvaluate = editingSalaryRecord ? editingSalaryRecord.user : selectedSalaryUser;
    if (userToEvaluate) {
      const totalWorkingDays = getWorkingDaysInMonth(newYear, newMonth);
      const base = salaryBase || (userToEvaluate as any).baseSalary || 30000;

      if (newMonth === selectedMonth && newYear === selectedYear) {
        const stats = getUserMonthlyStats((userToEvaluate as any)._id || userToEvaluate);
        const dailyRate = base / (stats.totalWorkingDays || 30);
        const calculatedDeductions = Math.round(stats.offDays * dailyRate);
        const net = Math.max(0, Math.round(base - calculatedDeductions));

        setSalaryPresentDays(stats.presentCredit);
        setSalaryAbsentDays(stats.offDays);
        setSalaryDeductions(calculatedDeductions);
        setSalaryFinal(net);
      } else {
        try {
          const { token } = useStore.getState();
          const currentApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "" : "http://localhost:5001");
          const evalUserId = (userToEvaluate as any)._id || userToEvaluate;
          const res = await fetch(`${currentApiUrl}/api/attendance?userId=${evalUserId}&month=${newMonth}&year=${newYear}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          if (res.ok) {
            const logs = await res.json();
            if (Array.isArray(logs) && logs.length > 0) {
              let present = 0;
              let leaves = 0;
              let absents = 0;
              let halfDays = 0;

              logs.forEach((log: any) => {
                if (log.status === "present") present++;
                else if (log.status === "leave") leaves++;
                else if (log.status === "absent") absents++;
                else if (log.status === "half_day") halfDays++;
              });

              const presentCredit = present + (halfDays * 0.5);
              const offDays = absents + leaves + (halfDays * 0.5);
              const dailyRate = base / (totalWorkingDays || 30);
              const calculatedDeductions = Math.round(offDays * dailyRate);
              const net = Math.max(0, Math.round(base - calculatedDeductions));

              setSalaryPresentDays(presentCredit);
              setSalaryAbsentDays(offDays);
              setSalaryDeductions(calculatedDeductions);
              setSalaryFinal(net);
              return;
            }
          }
        } catch (err) {
          console.error("Failed to query month attendance:", err);
        }

        // Fallback: default to working days of that month with 0 deductions
        setSalaryPresentDays(totalWorkingDays);
        setSalaryAbsentDays(0);
        setSalaryDeductions(0);
        setSalaryFinal(base);
      }
    }
  };

  // Handle salary calculation changes when bonus, deductions, base salary are edited in form
  useEffect(() => {
    const calculated = salaryBase - salaryDeductions + salaryBonus;
    setSalaryFinal(Math.max(0, calculated));
  }, [salaryBase, salaryDeductions, salaryBonus]);

  // Save or Update Salary Record
  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalaryFormError("");
    setSalarySubmitting(true);
    
    if (!selectedSalaryUser) {
      setSalaryFormError("No employee selected.");
      setSalarySubmitting(false);
      return;
    }

    try {
      if (editingSalaryRecord) {
        await updateSalary(editingSalaryRecord._id, {
          month: Number(salaryModalMonth),
          year: Number(salaryModalYear),
          bonus: Number(salaryBonus),
          deductions: Number(salaryDeductions),
          finalSalary: Number(salaryFinal),
          status: salaryStatus,
          paymentDate: salaryStatus === "paid" ? salaryPaymentDate : null,
          paymentMethod: salaryStatus === "paid" ? salaryPaymentMethod : null,
          notes: salaryNotes
        });
      } else {
        await createSalary({
          user: selectedSalaryUser._id,
          month: Number(salaryModalMonth),
          year: Number(salaryModalYear),
          baseSalary: Number(salaryBase),
          presentDays: Number(salaryPresentDays),
          absentDays: Number(salaryAbsentDays),
          bonus: Number(salaryBonus),
          deductions: Number(salaryDeductions),
          calculatedSalary: salaryBase - salaryDeductions + salaryBonus,
          finalSalary: Number(salaryFinal),
          status: salaryStatus,
          paymentDate: salaryStatus === "paid" ? salaryPaymentDate : null,
          paymentMethod: salaryStatus === "paid" ? salaryPaymentMethod : null,
          notes: salaryNotes
        });
      }
      if (salaryModalMonth !== selectedMonth || salaryModalYear !== selectedYear) {
        setSelectedMonth(salaryModalMonth);
        setSelectedYear(salaryModalYear);
      }
      setShowSalaryModal(false);
    } catch (err: any) {
      setSalaryFormError(err.message || "Failed to process salary record.");
    } finally {
      setSalarySubmitting(false);
    }
  };

  // Quick Pay handler
  const handleQuickPaySalary = async (record: Salary, paymentMethodSelected: typeof salaryPaymentMethod) => {
    try {
      await updateSalary(record._id, {
        status: "paid",
        paymentDate: new Date().toISOString(),
        paymentMethod: paymentMethodSelected
      });
    } catch (err: any) {
      alert("Failed to pay salary: " + err.message);
    }
  };

  // Delete Salary record
  const handleDeleteSalaryRecord = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this salary record? This will also remove the corresponding transaction in the Expenses Log if it was marked as Paid.")) return;
    try {
      await deleteSalary(id);
      setShowSalaryModal(false);
    } catch (err: any) {
      alert("Failed to delete salary record: " + err.message);
    }
  };

  // Staff Member Management Handlers
  const openAddUserModal = () => {
    setEditingUser(null);
    setUserFormName("");
    setUserFormEmail("");
    setUserFormRole("staff");
    setUserFormBaseSalary(25000);
    setUserFormPassword("");
    setUserFormError("");
    setShowUserModal(true);
  };

  const openEditUserModal = (staffUser: StoreUser) => {
    setEditingUser(staffUser);
    setUserFormName(staffUser.name);
    setUserFormEmail(staffUser.email);
    setUserFormRole(staffUser.role || "staff");
    setUserFormBaseSalary(staffUser.baseSalary || 30000);
    setUserFormPassword("");
    setUserFormError("");
    setShowUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormName.trim()) {
      setUserFormError("Staff member name is required.");
      return;
    }
    if (!userFormEmail.trim()) {
      setUserFormError("Staff email address is required.");
      return;
    }

    setUserFormSubmitting(true);
    setUserFormError("");
    try {
      const salaryNum = Number(userFormBaseSalary);
      const parsedSalary = isNaN(salaryNum) ? 30000 : Math.max(0, salaryNum);

      if (editingUser) {
        await updateUser(editingUser._id, {
          name: userFormName.trim(),
          email: userFormEmail.trim().toLowerCase(),
          role: userFormRole,
          baseSalary: parsedSalary,
          ...(userFormPassword.trim() ? { password: userFormPassword.trim() } : {}),
        });
      } else {
        await createUser({
          name: userFormName.trim(),
          email: userFormEmail.trim().toLowerCase(),
          role: userFormRole,
          baseSalary: parsedSalary,
          password: userFormPassword.trim() || undefined,
        });
      }
      setShowUserModal(false);
    } catch (err: any) {
      setUserFormError(err.message || "Failed to save staff member.");
    } finally {
      setUserFormSubmitting(false);
    }
  };

  const openDeleteUserModal = (staffUser: StoreUser) => {
    setUserToDelete(staffUser);
    setDeleteUserError("");
    setShowDeleteUserModal(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteUserSubmitting(true);
    setDeleteUserError("");
    try {
      await deleteUser(userToDelete._id);
      setShowDeleteUserModal(false);
      setUserToDelete(null);
    } catch (err: any) {
      setDeleteUserError(err.message || "Failed to remove staff member.");
    } finally {
      setDeleteUserSubmitting(false);
    }
  };

  const staffList = users.filter(u => u.role === "staff" && u.email !== "staff@ktmdecor.com");
  const selectedStaffUser = users.find(u => u._id === selectedAdminStaffId);

  // Month navigation for controls
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP CONTROLS & DATE SELECTOR */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Admin Navigation Tabs */}
        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5 bg-muted/20 border border-border/80 p-1 rounded-xl">
              <button
                onClick={() => setAdminTab("payroll")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  adminTab === "payroll"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <DollarSign size={15} />
                <span>Payroll & Roster</span>
              </button>
              <button
                onClick={() => setAdminTab("directory")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  adminTab === "directory"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Users size={15} />
                <span>Staff Directory</span>
              </button>
              <button
                onClick={() => setAdminTab("calendar")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  adminTab === "calendar"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Calendar size={15} />
                <span>Staff Calendars</span>
              </button>
              <button
                onClick={() => setAdminTab("bulk")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  adminTab === "bulk"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <PlusCircle size={15} />
                <span>Bulk Attendance</span>
              </button>
            </div>

            <button
              onClick={openAddUserModal}
              style={{ background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)" }}
              className="px-3.5 py-2 rounded-xl text-black text-xs font-bold transition-all shadow-md shadow-orange-500/15 flex items-center gap-1.5 hover:opacity-95 cursor-pointer shrink-0"
              title="Add New Staff Member"
            >
              <UserPlus size={15} />
              <span>Add Staff</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full bg-neutral-200 dark:bg-neutral-800 text-black dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 font-bold shadow-2xs">
              {activeStaff?.name || "Staff"}
            </span>
          </div>
        )}

        {/* Global Month/Year selector */}
        <div className="flex items-center gap-1 bg-muted/20 border border-border/80 p-1 rounded-xl">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg hover:bg-card text-muted hover:text-foreground transition-all"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex gap-1">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-2.5 py-1 bg-card rounded-lg text-xs font-bold text-foreground border border-border/60 cursor-pointer focus:outline-none shadow-2xs"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value} className="bg-card">
                  {m.name}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-2.5 py-1 bg-card rounded-lg text-xs font-bold text-foreground border border-border/60 cursor-pointer focus:outline-none shadow-2xs"
            >
              {years.map((y) => (
                <option key={y} value={y} className="bg-card">
                  {y}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg hover:bg-card text-muted hover:text-foreground transition-all"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ─── STAFF PORTAL VIEW ─── */}
      {!isAdmin && activeStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Check-In / Check-Out Widget */}
          <div className="lg:col-span-1 space-y-6">
            <div className="p-6 rounded-[28px] border border-border/80 bg-card shadow-xs space-y-6 text-center">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted border-b border-border/50 pb-3">
                Today's Work Log
              </h2>
              
              <div className="py-4 space-y-3 flex flex-col items-center">
                <div
                  style={{ background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)" }}
                  className="p-4 text-black rounded-2xl shadow-md shadow-orange-500/20"
                >
                  <Clock size={36} className="animate-pulse" />
                </div>
                
                {todayLog ? (
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-green-500/10 border border-green-500/25 text-green-500">
                      Logged Present
                    </span>
                    <p className="text-[11px] text-muted font-semibold tracking-wide mt-2">
                      Check-In: {new Date(todayLog.checkIn || "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {todayLog.checkOut ? (
                      <p className="text-[11px] text-muted font-semibold tracking-wide">
                        Check-Out: {new Date(todayLog.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    ) : (
                      <p className="text-[11px] text-accent font-extrabold tracking-wide">
                        On Duty (Not Checked Out)
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-bold text-muted uppercase tracking-widest">
                      No Records Logged Today
                    </span>
                    <p className="text-[11px] text-muted/70 mt-1 max-w-[200px] mx-auto leading-relaxed">
                      Please check-in to log your attendance for today.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {!todayLog && (
                  <button
                    onClick={handleQuickCheckIn}
                    style={{ background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)" }}
                    className="w-full py-3 text-black rounded-2xl font-bold text-xs shadow-md shadow-orange-500/15 transition-all active:scale-[0.98] flex items-center justify-center gap-2 hover:opacity-95"
                  >
                    <CheckCircle2 size={18} />
                    <span>Check In for Today</span>
                  </button>
                )}

                {todayLog && !todayLog.checkOut && (
                  <button
                    onClick={handleQuickCheckOut}
                    style={{ background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)" }}
                    className="w-full py-3 text-black rounded-2xl font-bold text-xs shadow-md shadow-orange-500/15 transition-all active:scale-[0.98] flex items-center justify-center gap-2 hover:opacity-95"
                  >
                    <Clock size={18} />
                    <span>Check Out (End Shift)</span>
                  </button>
                )}

                {todayLog && todayLog.checkOut && (
                  <div className="py-2.5 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-600 dark:text-green-400 text-xs font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} />
                    Shift Completed Successfully
                  </div>
                )}
              </div>
            </div>

            {/* User Payout Tracker Widget */}
            <div className="p-6 rounded-[28px] border border-border/80 bg-card shadow-xs space-y-4">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted border-b border-border/50 pb-3 text-center">
                Salary Overview
              </h2>
              {(() => {
                const stats = getUserMonthlyStats(activeStaff._id);
                const baseSalary = activeStaff.baseSalary || 30000;
                const dailyRate = baseSalary / stats.totalWorkingDays;
                const calculatedSalary = baseSalary - (stats.offDays * dailyRate);

                const salaryRecord = salaries.find(sal => {
                  const isCorrectUser = sal.user?._id === activeStaff._id || (sal.user as any) === activeStaff._id;
                  return isCorrectUser && sal.month === selectedMonth && sal.year === selectedYear;
                });

                return (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted">
                      <span>Base Monthly Salary:</span>
                      <span className="text-foreground">Rs. {(salaryRecord ? salaryRecord.baseSalary : baseSalary).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted">
                      <span>Working Days:</span>
                      <span className="text-foreground">{stats.totalWorkingDays} Days</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted border-b border-border/50 pb-2.5">
                      <span>Days Worked:</span>
                      <span className="text-green-500">{(salaryRecord ? salaryRecord.presentDays : stats.presentCredit)} Days</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted">
                      <span>Days Off / Absents:</span>
                      <span className="text-red-500">{(salaryRecord ? salaryRecord.absentDays : stats.offDays)} Days</span>
                    </div>

                    {salaryRecord && (
                      <>
                        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted">
                          <span>Bonus Awarded:</span>
                          <span className="text-green-500">+Rs. {salaryRecord.bonus.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted">
                          <span>Deductions Applied:</span>
                          <span className="text-red-500">-Rs. {salaryRecord.deductions.toLocaleString()}</span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted">
                      <span>Attendance Pct %:</span>
                      <span className="text-accent">{stats.workingDaysPercent.toFixed(1)}%</span>
                    </div>

                    <div className="bg-muted/15 p-4 rounded-2xl border border-border/60 flex justify-between items-center mt-4">
                      <div className="text-left">
                        <p className="text-[10px] text-muted font-extrabold uppercase tracking-widest">
                          {salaryRecord ? "Official Payout" : "Estimated Payout"}
                        </p>
                        <p className="text-lg font-black text-foreground mt-0.5">
                          Rs. {salaryRecord ? salaryRecord.finalSalary.toLocaleString() : Math.max(0, Math.round(calculatedSalary)).toLocaleString()}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-2xs uppercase tracking-wider ${
                        salaryRecord
                          ? salaryRecord.status === "paid"
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          : "bg-card border-border text-muted"
                      }`}>
                        {salaryRecord
                          ? salaryRecord.status === "paid"
                            ? "Paid"
                            : "Pending Approved"
                          : `Estimate • -${stats.offDays} Days`}
                      </span>
                    </div>

                    {salaryRecord?.notes && (
                      <div className="bg-muted/10 p-3 rounded-2xl border border-border/50 text-[11px] text-muted italic">
                        <span className="font-bold uppercase text-[9px] block not-italic tracking-wider text-muted/70 mb-0.5">Payroll Notes:</span>
                        "{salaryRecord.notes}"
                      </div>
                    )}

                    {!salaryRecord && (
                      <p className="text-[10px] text-muted/70 text-center leading-relaxed italic">
                        Official payroll has not been finalized yet for this period. The above is a real-time estimate based on attendance logs.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Monthly Calendar View */}
          <div className="lg:col-span-2 bg-card border border-border/80 rounded-[28px] shadow-xs p-5 sm:p-7 space-y-4">
            <div className="flex justify-between items-center border-b border-border/60 pb-3">
              <h3 className="font-bold text-base font-display">
                Attendance Calendar - {months.find(m => m.value === selectedMonth)?.name} {selectedYear}
              </h3>
              <div className="flex gap-2.5 sm:gap-4 text-[9px] sm:text-[10px] font-bold uppercase text-muted">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Pres</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Half</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Leave</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Abs</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] sm:text-xs text-muted uppercase tracking-widest border-b border-border/60 pb-2">
              <div><span className="hidden sm:inline">Sun</span><span className="sm:hidden">S</span></div>
              <div><span className="hidden sm:inline">Mon</span><span className="sm:hidden">M</span></div>
              <div><span className="hidden sm:inline">Tue</span><span className="sm:hidden">T</span></div>
              <div><span className="hidden sm:inline">Wed</span><span className="sm:hidden">W</span></div>
              <div><span className="hidden sm:inline">Thu</span><span className="sm:hidden">T</span></div>
              <div><span className="hidden sm:inline">Fri</span><span className="sm:hidden">F</span></div>
              <div className="text-red-500"><span className="hidden sm:inline">Sat</span><span className="sm:hidden">S</span></div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {renderCalendar()}
            </div>

            {/* Selected Day Details Card */}
            {renderSelectedDayDetails(activeStaff._id)}
          </div>
        </div>
      )}

      {/* ─── ADMIN MANAGEMENT VIEW ─── */}
      {isAdmin && (
        <div className="space-y-6">

          {/* TAB 1: PAYROLL & STAFF ROSTER */}
          {adminTab === "payroll" && (
            <div className="space-y-6">
              {/* Monthly Overview Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card border border-border/80 p-6 rounded-[28px] shadow-xs flex justify-between items-center transition-all hover:shadow-md">
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted font-bold uppercase tracking-wider">
                      Total Staff Count
                    </p>
                    <p className="text-2xl font-bold font-display text-foreground tracking-tight">
                      {staffList.length} Active Staff
                    </p>
                  </div>
                  <div
                    style={{ background: "linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #1D4ED8 100%)" }}
                    className="p-3 sm:p-3.5 text-white rounded-2xl shadow-md shadow-blue-500/20 shrink-0"
                  >
                    <UserIcon size={24} />
                  </div>
                </div>

                <div className="bg-card border border-border/80 p-6 rounded-[28px] shadow-xs flex justify-between items-center transition-all hover:shadow-md">
                  {(() => {
                    const totalBase = staffList.reduce((acc, s) => acc + (s.baseSalary || 30000), 0);
                    return (
                      <div className="space-y-1">
                        <p className="text-[11px] text-muted font-bold uppercase tracking-wider">
                          Base Monthly Payroll
                        </p>
                        <p className="text-2xl font-bold font-display text-foreground tracking-tight">
                          Rs. {totalBase.toLocaleString()}
                        </p>
                      </div>
                    );
                  })()}
                  <div
                    style={{ background: "linear-gradient(135deg, #34D399 0%, #10B981 50%, #059669 100%)" }}
                    className="p-3 sm:p-3.5 text-white rounded-2xl shadow-md shadow-emerald-500/20 shrink-0"
                  >
                    <DollarSign size={24} />
                  </div>
                </div>

                <div className="bg-card border border-border/80 p-6 rounded-[28px] shadow-xs flex justify-between items-center transition-all hover:shadow-md">
                  {(() => {
                    let totalPayout = 0;
                    staffList.forEach(s => {
                      const stats = getUserMonthlyStats(s._id);
                      const baseSalary = s.baseSalary || 30000;
                      const dailyRate = baseSalary / stats.totalWorkingDays;
                      totalPayout += baseSalary - (stats.offDays * dailyRate);
                    });

                    return (
                      <div className="space-y-1">
                        <p className="text-[11px] text-muted font-bold uppercase tracking-wider">
                          Calculated Payout ({months.find(m => m.value === selectedMonth)?.name})
                        </p>
                        <p className="text-2xl font-bold font-display text-foreground tracking-tight">
                          Rs. {Math.max(0, Math.round(totalPayout)).toLocaleString()}
                        </p>
                      </div>
                    );
                  })()}
                  <div
                    style={{ background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #D97706 100%)" }}
                    className="p-3 sm:p-3.5 text-white rounded-2xl shadow-md shadow-amber-500/20 shrink-0"
                  >
                    <TrendingUp size={24} />
                  </div>
                </div>
              </div>

              {/* Roster & Salary Payout Table */}
              <div className="bg-card border border-border/80 rounded-[28px] shadow-xs overflow-hidden p-6 sm:p-7">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/60 pb-4 mb-4">
                  <h3 className="font-bold text-base font-display text-foreground">
                    Staff Attendance & Salary Calculations
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={openAddUserModal}
                      style={{ background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)" }}
                      className="px-3.5 py-2 text-black rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/15 flex items-center gap-1.5 hover:opacity-95 cursor-pointer shrink-0"
                    >
                      <UserPlus size={14} />
                      <span>Add Staff</span>
                    </button>
                    <button
                      onClick={() => {
                        // Simple simulated export
                        const headers = "Staff Name,Email,Base Salary,Present Days,Absent Days,Working Days %,Calculated Payout\n";
                        const rows = staffList.map(s => {
                          const stats = getUserMonthlyStats(s._id);
                          const baseSalary = s.baseSalary || 30000;
                          const dailyRate = baseSalary / stats.totalWorkingDays;
                          const finalSalary = Math.round(baseSalary - (stats.offDays * dailyRate));
                          return `"${s.name}","${s.email}",${baseSalary},${stats.presentCredit},${stats.offDays},${stats.workingDaysPercent.toFixed(1)}%,${finalSalary}`;
                        }).join("\n");

                        const blob = new Blob([headers + rows], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `Payroll_Report_${selectedMonth}_${selectedYear}.csv`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                      }}
                      className="px-4 py-2 border border-border/80 bg-muted/20 hover:bg-muted/30 text-foreground rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <FileText size={14} />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/10 border-b border-border/70 text-[10px] font-bold uppercase tracking-wider text-muted">
                        <th className="py-3.5 px-4">Staff Member</th>
                        <th className="py-3.5 px-4">Base Salary</th>
                        <th className="py-3.5 px-4 text-center">Working Days</th>
                        <th className="py-3.5 px-4 text-center">Days Worked</th>
                        <th className="py-3.5 px-4 text-center">Days Off</th>
                        <th className="py-3.5 px-4 text-center">Attendance %</th>
                        <th className="py-3.5 px-4 text-right">Calculated Salary</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-xs font-semibold">
                      {staffList.map((s) => {
                        const stats = getUserMonthlyStats(s._id);
                        const baseSalary = s.baseSalary || 30000;
                        const dailyRate = baseSalary / stats.totalWorkingDays;
                        const calculatedSalary = Math.max(0, Math.round(baseSalary - (stats.offDays * dailyRate)));

                        const salaryRecord = salaries.find(sal => {
                          const isCorrectUser = sal.user?._id === s._id || (sal.user as any) === s._id;
                          return isCorrectUser && sal.month === selectedMonth && sal.year === selectedYear;
                        });

                        return (
                          <tr key={s._id} className="hover:bg-muted/10 transition-colors">
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-sm text-foreground">{s.name}</p>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-foreground">
                              Rs. {(salaryRecord ? salaryRecord.baseSalary : baseSalary).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-center text-muted">
                              {stats.totalWorkingDays}
                            </td>
                            <td className="py-3.5 px-4 text-center text-green-500 font-bold">
                              {salaryRecord ? salaryRecord.presentDays : stats.presentCredit}
                            </td>
                            <td className="py-3.5 px-4 text-center text-red-500 font-bold">
                              {salaryRecord ? salaryRecord.absentDays : stats.offDays}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                stats.workingDaysPercent >= 90
                                  ? "bg-green-500/10 text-green-500"
                                  : stats.workingDaysPercent >= 75
                                  ? "bg-orange-500/10 text-orange-500"
                                  : "bg-red-500/10 text-red-500"
                              }`}>
                                {stats.workingDaysPercent.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <p className="text-sm font-black text-foreground">
                                Rs. {salaryRecord ? salaryRecord.finalSalary.toLocaleString() : calculatedSalary.toLocaleString()}
                              </p>
                              <div className="mt-1 flex justify-end">
                                {salaryRecord ? (
                                  salaryRecord.status === "paid" ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-green-500/10 text-green-500 border border-green-500/20">
                                      Paid ({salaryRecord.paymentMethod})
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                      Pending
                                    </span>
                                  )
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-muted/20 text-muted border border-border/60">
                                    Unprocessed
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center justify-end gap-1.5">
                                {salaryRecord ? (
                                  <>
                                    {salaryRecord.status === "pending" && (
                                      <button
                                        onClick={() => {
                                          const method = window.prompt("Enter Payment Method (cash, online_banking, esewa, cheque, other):", "online_banking");
                                          if (method) {
                                            const normMethod = ["cash", "online_banking", "esewa", "cheque", "other"].includes(method) ? method : "other";
                                            handleQuickPaySalary(salaryRecord, normMethod as any);
                                          }
                                        }}
                                        className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-bold uppercase transition-all"
                                      >
                                        Pay
                                      </button>
                                    )}
                                    <button
                                      onClick={() => openEditSalaryModal(salaryRecord)}
                                      className="p-1.5 hover:bg-muted/20 text-accent rounded-xl transition-all"
                                      title="Edit Salary Details"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSalaryRecord(salaryRecord._id)}
                                      className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-xl transition-all"
                                      title="Delete Salary Record"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => openCreateSalaryModal(s)}
                                    className="px-3 py-1.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-[10px] font-bold uppercase transition-all"
                                  >
                                    Generate
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedAdminStaffId(s._id);
                                    setAdminTab("calendar");
                                  }}
                                  className="px-2.5 py-1.5 bg-muted/20 hover:bg-muted/30 text-muted hover:text-foreground rounded-xl text-[10px] font-bold uppercase transition-all"
                                  title="View Detailed Calendar"
                                >
                                  Calendar
                                </button>
                                <button
                                  onClick={() => openEditUserModal(s)}
                                  className="p-1.5 hover:bg-muted/20 text-muted hover:text-foreground rounded-xl transition-all"
                                  title="Edit Staff Member"
                                >
                                  <Edit2 size={13} />
                                </button>
                                {s.email !== "admin@ktmdecor.com" && s.email !== "staff@ktmdecor.com" && s._id !== user?._id && (
                                  <button
                                    onClick={() => openDeleteUserModal(s)}
                                    className="p-1.5 hover:bg-red-500/10 text-red-500/70 hover:text-red-500 rounded-xl transition-all"
                                    title="Remove Staff Member"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Daily Check-In Activity & Times Feed */}
              <div className="bg-card border border-border/80 rounded-[28px] shadow-xs overflow-hidden p-6 sm:p-7 mt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/60 pb-4 mb-4">
                  <div>
                    <h3 className="font-bold text-base font-display text-foreground">Daily Activity & Check-In Feed</h3>
                    <p className="text-[11px] text-muted font-semibold mt-0.5">
                      Verify check-in and check-out timestamps submitted by staff members
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-muted uppercase tracking-wider">Select BS Date:</label>
                    <div className="w-48">
                      <NepaliDatePicker
                        value={activityDate}
                        onChange={(iso) => setActivityDate(iso)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staffList.map((s) => {
                    const log = getLogForUserOnDate(s._id, activityDate);
                    
                    let statusBadge = "Unmarked";
                    let badgeColor = "text-muted bg-muted/10 border-muted/20";
                    
                    if (log) {
                      if (log.status === "present") {
                        statusBadge = "Present";
                        badgeColor = "text-green-500 bg-green-500/10 border-green-500/20";
                      } else if (log.status === "absent") {
                        statusBadge = "Absent";
                        badgeColor = "text-red-500 bg-red-500/10 border-red-500/20";
                      } else if (log.status === "half_day") {
                        statusBadge = "Half Day";
                        badgeColor = "text-orange-500 bg-orange-500/10 border-orange-500/20";
                      } else if (log.status === "leave") {
                        statusBadge = "On Leave";
                        badgeColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
                      }
                    }

                    return (
                      <div key={`activity-${s._id}`} className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all hover:shadow-xs ${log ? "bg-card border-border/80" : "bg-muted/5 border-border/40 opacity-70"}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm text-foreground">{s.name}</h4>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}>
                            {statusBadge}
                          </span>
                        </div>

                        {log ? (
                          <div className="space-y-1.5 text-xs text-muted border-t border-border/50 pt-2 font-semibold">
                            {log.checkIn && (
                              <div className="flex justify-between">
                                <span>Checked In:</span>
                                <span className="font-bold text-foreground">
                                  {new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            )}
                            {log.checkOut ? (
                              <div className="flex justify-between">
                                <span>Checked Out:</span>
                                <span className="font-bold text-foreground">
                                  {new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ) : (log.status === "present" || log.status === "half_day") ? (
                              <div className="flex justify-between">
                                <span>Status:</span>
                                <span className="font-bold text-accent animate-pulse">On Duty</span>
                              </div>
                            ) : null}
                            <div className="flex justify-between border-t border-border/30 pt-1.5 text-[10px] text-muted/80">
                              <span>Entry Logged:</span>
                              <span>
                                {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                              </span>
                            </div>
                            {log.notes && (
                              <p className="text-[10px] text-muted/95 italic bg-muted/10 p-2 rounded-xl border border-border/60 mt-1 shrink-0 truncate">
                                "{log.notes}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-3 text-[11px] text-muted font-medium italic border-t border-border/30 pt-3">
                            No attendance logs recorded for this day.
                          </div>
                        )}

                        {/* Quick edit button for admin */}
                        {log && (
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => {
                                const logDateObj = new Date(log.date);
                                openModal(logDateObj, log, s._id);
                              }}
                              className="text-[10px] font-extrabold uppercase text-accent hover:text-accent-dark transition-colors"
                            >
                              Edit Entry
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Processed Salary Log (History) */}
              <div className="bg-card border border-border/80 rounded-[28px] shadow-xs overflow-hidden p-6 sm:p-7 mt-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/60 pb-4 mb-4">
                  <div>
                    <h3 className="font-bold text-base font-display text-foreground">Processed Salary Logs</h3>
                    <p className="text-[11px] text-muted font-semibold mt-0.5">
                      Search and manage historically processed staff salary records
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-48">
                      <input
                        type="text"
                        value={historySearchQuery}
                        onChange={(e) => setHistorySearchQuery(e.target.value)}
                        className="w-full px-3.5 py-2 border border-border/80 rounded-2xl bg-background/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-xs font-semibold placeholder:text-muted/60"
                        placeholder="Search employee..."
                      />
                    </div>

                    {/* Status filter */}
                    <select
                      value={historyStatusFilter}
                      onChange={(e) => setHistoryStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-border/80 rounded-2xl bg-background/60 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/20"
                    >
                      <option value="all">All Statuses</option>
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                    </select>

                    {/* Month filter */}
                    <select
                      value={historyMonthFilter}
                      onChange={(e) => setHistoryMonthFilter(e.target.value)}
                      className="px-3 py-2 border border-border/80 rounded-2xl bg-background/60 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/20"
                    >
                      <option value="all">All Months</option>
                      {months.map((m) => (
                        <option key={m.value} value={m.value.toString()}>
                          {m.name}
                        </option>
                      ))}
                    </select>

                    {/* Year filter */}
                    <select
                      value={historyYearFilter}
                      onChange={(e) => setHistoryYearFilter(e.target.value)}
                      className="px-3 py-2 border border-border/80 rounded-2xl bg-background/60 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/20"
                    >
                      <option value="all">All Years</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                </div>

                {(() => {
                  const filteredSalaries = salaries.filter((sal) => {
                    const staffName = sal.user?.name || "";
                    const matchesSearch = staffName.toLowerCase().includes(historySearchQuery.toLowerCase());
                    const matchesStatus = historyStatusFilter === "all" || sal.status === historyStatusFilter;
                    const matchesMonth = historyMonthFilter === "all" || sal.month.toString() === historyMonthFilter;
                    const matchesYear = historyYearFilter === "all" || sal.year.toString() === historyYearFilter;
                    return matchesSearch && matchesStatus && matchesMonth && matchesYear;
                  });

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-muted/10 border-b border-border/70 text-[10px] font-bold uppercase tracking-wider text-muted">
                            <th className="py-3 px-3.5">Period</th>
                            <th className="py-3 px-3.5">Employee</th>
                            <th className="py-3 px-3.5 text-right">Base Salary</th>
                            <th className="py-3 px-3.5 text-right">Bonus</th>
                            <th className="py-3 px-3.5 text-right">Deductions</th>
                            <th className="py-3 px-3.5 text-right">Final Amount</th>
                            <th className="py-3 px-3.5 text-center">Status</th>
                            <th className="py-3 px-3.5">Payment Info</th>
                            <th className="py-3 px-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 text-xs font-semibold text-foreground">
                          {filteredSalaries.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-8 text-center text-muted italic">
                                No processed salary records matching filters.
                              </td>
                            </tr>
                          ) : (
                            filteredSalaries.map((sal) => {
                              const monthName = months.find((m) => m.value === sal.month)?.name || `Month ${sal.month}`;
                              return (
                                <tr key={sal._id} className="hover:bg-muted/10 transition-colors">
                                  <td className="py-3 px-3.5 font-bold">
                                    {monthName} {sal.year}
                                  </td>
                                  <td className="py-3 px-3.5">
                                    <p className="font-bold text-foreground">{sal.user?.name || "Staff"}</p>
                                    <p className="text-[10px] text-muted">{sal.user?.email || ""}</p>
                                  </td>
                                  <td className="py-3 px-3.5 text-right">Rs. {sal.baseSalary.toLocaleString()}</td>
                                  <td className="py-3 px-3.5 text-right text-green-500">+Rs. {sal.bonus.toLocaleString()}</td>
                                  <td className="py-3 px-3.5 text-right text-red-500">-Rs. {sal.deductions.toLocaleString()}</td>
                                  <td className="py-3 px-3.5 text-right font-black text-sm text-foreground">
                                    Rs. {sal.finalSalary.toLocaleString()}
                                  </td>
                                  <td className="py-3 px-3.5 text-center">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                      sal.status === "paid"
                                        ? "bg-green-500/10 text-green-500 border border-green-500/20"
                                        : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                    }`}>
                                      {sal.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3.5 text-muted text-[10px]">
                                    {sal.status === "paid" ? (
                                      <>
                                        <p className="font-bold text-foreground uppercase text-[9px] tracking-wider">{sal.paymentMethod?.replace("_", " ")}</p>
                                        <p>{sal.paymentDate ? new Date(sal.paymentDate).toLocaleDateString() : ""}</p>
                                      </>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                  <td className="py-3 px-3.5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => openEditSalaryModal(sal)}
                                        className="p-1.5 hover:bg-muted/20 text-accent rounded-xl transition-all"
                                        title="Edit Salary Logs"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSalaryRecord(sal._id)}
                                        className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-xl transition-all"
                                        title="Delete Salary Log"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB: STAFF DIRECTORY */}
          {adminTab === "directory" && (
            <div className="space-y-6">
              {/* Directory Top Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 sm:p-6 rounded-[28px] border border-border/80 shadow-xs">
                <div className="relative flex-1 w-full max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <input
                    type="text"
                    value={directorySearchQuery}
                    onChange={(e) => setDirectorySearchQuery(e.target.value)}
                    placeholder="Search staff by name or email..."
                    className="w-full pl-10 pr-4 py-2 bg-muted/20 border border-border/60 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  {directorySearchQuery && (
                    <button
                      onClick={() => setDirectorySearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-1"
                      title="Clear search"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-xs text-muted font-medium">
                    Showing{" "}
                    <span className="font-bold text-foreground">
                      {
                        users
                          .filter((u) => u.role === "staff" && u.email !== "staff@ktmdecor.com" && u.email !== "admin@ktmdecor.com")
                          .filter((u) =>
                            !directorySearchQuery
                              ? true
                              : u.name.toLowerCase().includes(directorySearchQuery.toLowerCase()) ||
                                u.email.toLowerCase().includes(directorySearchQuery.toLowerCase())
                          ).length
                      }
                    </span>{" "}
                    of {users.filter((u) => u.role === "staff" && u.email !== "staff@ktmdecor.com" && u.email !== "admin@ktmdecor.com").length} members
                  </span>

                  <button
                    onClick={openAddUserModal}
                    style={{ background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)" }}
                    className="px-4 py-2 rounded-xl text-black text-xs font-bold transition-all shadow-md shadow-orange-500/15 flex items-center gap-1.5 hover:opacity-95 cursor-pointer shrink-0"
                  >
                    <UserPlus size={15} />
                    <span>Add Member</span>
                  </button>
                </div>
              </div>

              {/* Staff Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {users
                  .filter((u) => u.role === "staff" && u.email !== "staff@ktmdecor.com" && u.email !== "admin@ktmdecor.com")
                  .filter((u) =>
                    !directorySearchQuery
                      ? true
                      : u.name.toLowerCase().includes(directorySearchQuery.toLowerCase()) ||
                        u.email.toLowerCase().includes(directorySearchQuery.toLowerCase())
                  )
                  .map((staffMember) => {
                    const stats = getUserMonthlyStats(staffMember._id);
                    const isCurrentUser = user?._id === staffMember._id;
                    const isProtected =
                      isCurrentUser ||
                      staffMember.email === "admin@ktmdecor.com" ||
                      staffMember.email === "staff@ktmdecor.com";

                    // Initials for avatar
                    const initials = staffMember.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <div
                        key={staffMember._id}
                        className="p-5 sm:p-6 rounded-[28px] border border-border/80 bg-card shadow-xs flex flex-col justify-between hover:border-border transition-all duration-200 group"
                      >
                        <div>
                          {/* Header: Avatar, Name, Role, Actions */}
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3.5">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-orange-500/10 border border-accent/30 flex items-center justify-center font-black text-base text-accent shrink-0 shadow-2xs">
                                {initials || "ST"}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-sm text-foreground leading-snug">
                                    {staffMember.name}
                                  </h3>
                                  {isCurrentUser && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent/15 text-accent font-bold">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                      staffMember.role === "admin"
                                        ? "bg-purple-500/10 border-purple-500/30 text-purple-500"
                                        : "bg-blue-500/10 border-blue-500/30 text-blue-500"
                                    }`}
                                  >
                                    {staffMember.role === "admin" ? <Shield size={10} /> : <UserIcon size={10} />}
                                    {staffMember.role}
                                  </span>
                                  <span className="text-xs text-muted truncate max-w-[150px] sm:max-w-[180px]">
                                    {staffMember.email}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Quick edit / delete buttons */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditUserModal(staffMember)}
                                className="p-1.5 rounded-xl hover:bg-muted/20 text-muted hover:text-foreground transition-all"
                                title="Edit Staff Member"
                              >
                                <Edit2 size={14} />
                              </button>
                              {!isProtected && (
                                <button
                                  onClick={() => openDeleteUserModal(staffMember)}
                                  className="p-1.5 rounded-xl hover:bg-red-500/10 text-muted hover:text-red-500 transition-all"
                                  title="Remove Staff Member"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Base Salary & Stats Bar */}
                          <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-muted/15 border border-border/50 mb-4">
                            <div>
                              <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Base Salary</p>
                              <p className="text-xs font-black text-foreground mt-0.5">
                                Rs. {(staffMember.baseSalary || 25000).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted uppercase tracking-wider">
                                {months.find((m) => m.value === selectedMonth)?.name || "Month"} Attendance
                              </p>
                              <p className="text-xs font-black text-foreground mt-0.5">
                                {stats.presentCredit} / {stats.totalWorkingDays} days ({Math.round(stats.workingDaysPercent)}%)
                              </p>
                            </div>
                          </div>

                          {/* Monthly Status Pills */}
                          <div className="flex items-center gap-2 mb-4 text-[11px] font-bold">
                            <span className="px-2 py-0.5 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                              {stats.presentCount} Present
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                              {stats.absentCount} Absent
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              {stats.leaveCount} Leave
                            </span>
                            {stats.halfDayCount > 0 && (
                              <span className="px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                                {stats.halfDayCount} Half-day
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                          <button
                            onClick={() => {
                              setSelectedAdminStaffId(staffMember._id);
                              setAdminTab("calendar");
                            }}
                            className="flex-1 py-2 px-3 rounded-xl border border-border/80 bg-card hover:bg-muted/20 text-xs font-bold text-foreground transition-all flex items-center justify-center gap-1.5"
                          >
                            <Calendar size={13} />
                            <span>Calendar</span>
                          </button>
                          <button
                            onClick={() => openCreateSalaryModal(staffMember)}
                            className="flex-1 py-2 px-3 rounded-xl border border-accent/30 bg-accent/10 hover:bg-accent/20 text-xs font-bold text-accent transition-all flex items-center justify-center gap-1.5"
                          >
                            <DollarSign size={13} />
                            <span>Pay Salary</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED CALENDAR SELECTOR */}
          {adminTab === "calendar" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Staff Selector Left Side */}
              <div className="lg:col-span-1 space-y-4">
                <div className="p-6 rounded-[28px] border border-border/80 bg-card shadow-xs space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-muted border-b border-border/50 pb-2.5">
                    Select Staff Member
                  </h3>
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                    {staffList.map((s) => (
                      <button
                        key={s._id}
                        onClick={() => setSelectedAdminStaffId(s._id)}
                        className={`w-full text-left px-4 py-3 rounded-2xl border text-xs font-bold transition-all flex justify-between items-center ${
                          selectedAdminStaffId === s._id
                            ? "bg-accent/10 border-accent/25 text-accent shadow-2xs"
                            : "border-transparent hover:bg-muted/20 text-muted hover:text-foreground"
                        }`}
                      >
                        <div>
                          <p className="font-bold leading-none">{s.name}</p>
                        </div>
                        <ChevronRight size={14} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Monthly summary for selected user */}
                {selectedStaffUser && (
                  <div className="p-6 rounded-[28px] border border-border/80 bg-card shadow-xs space-y-4">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-muted border-b border-border/50 pb-2.5">
                      {selectedStaffUser.name}'s Summary
                    </h3>
                    {(() => {
                      const stats = getUserMonthlyStats(selectedAdminStaffId);
                      const baseSalary = selectedStaffUser.baseSalary || 30000;
                      const dailyRate = baseSalary / stats.totalWorkingDays;
                      const calculatedSalary = baseSalary - (stats.offDays * dailyRate);

                      return (
                        <div className="space-y-3.5 text-xs">
                          <div className="flex justify-between items-center text-muted">
                            <span>Base Salary:</span>
                            <span className="font-bold text-foreground">Rs. {baseSalary.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-muted">
                            <span>Present Credit:</span>
                            <span className="font-bold text-green-500">{stats.presentCredit} Days</span>
                          </div>
                          <div className="flex justify-between items-center text-muted">
                            <span>Absents/Leaves:</span>
                            <span className="font-bold text-red-500">{stats.offDays} Days</span>
                          </div>
                          <div className="flex justify-between items-center text-muted">
                            <span>Attendance %:</span>
                            <span className="font-bold text-accent">{stats.workingDaysPercent.toFixed(1)}%</span>
                          </div>
                          <div className="bg-muted/15 p-4 rounded-2xl border border-border/60 flex justify-between items-center mt-3">
                            <div className="text-left">
                              <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">
                                Monthly Wage
                              </p>
                              <p className="text-base font-black text-foreground">
                                Rs. {Math.max(0, Math.round(calculatedSalary)).toLocaleString()}
                              </p>
                            </div>
                            <span className="text-[10px] font-extrabold text-red-500 bg-card border border-border px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
                              -{stats.offDays} Days
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Monthly Calendar View Right Side */}
              <div className="lg:col-span-2 bg-card border border-border/80 rounded-[28px] shadow-xs p-6 sm:p-7 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-border/60 pb-3">
                  <h3 className="font-bold text-base font-display text-foreground">
                    Calendar Log - {selectedStaffUser?.name || "Staff"}
                  </h3>
                  <div className="flex gap-2.5 sm:gap-3 text-[9px] font-extrabold uppercase text-muted">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Pres</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Half</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Leave</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Abs</span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] sm:text-xs text-muted uppercase tracking-widest border-b border-border/60 pb-2">
                  <div><span className="hidden sm:inline">Sun</span><span className="sm:hidden">S</span></div>
                  <div><span className="hidden sm:inline">Mon</span><span className="sm:hidden">M</span></div>
                  <div><span className="hidden sm:inline">Tue</span><span className="sm:hidden">T</span></div>
                  <div><span className="hidden sm:inline">Wed</span><span className="sm:hidden">W</span></div>
                  <div><span className="hidden sm:inline">Thu</span><span className="sm:hidden">T</span></div>
                  <div><span className="hidden sm:inline">Fri</span><span className="sm:hidden">F</span></div>
                  <div className="text-red-500"><span className="hidden sm:inline">Sat</span><span className="sm:hidden">S</span></div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {selectedAdminStaffId && renderCalendar()}
                </div>

                {/* Selected Day Details Card */}
                {selectedAdminStaffId && renderSelectedDayDetails(selectedAdminStaffId)}
              </div>
            </div>
          )}

          {/* TAB 3: BULK ATTENDANCE LOGGER */}
          {adminTab === "bulk" && (
            <div className="bg-card border border-border/80 rounded-[28px] shadow-xs p-6 sm:p-8 max-w-4xl mx-auto space-y-6">
              <div className="border-b border-border/60 pb-4">
                <h3 className="font-bold text-lg font-display text-foreground">Bulk Daily Attendance Logger</h3>
                <p className="text-xs text-muted font-medium mt-1">
                  Log attendance for all 9 staff members simultaneously for a single calendar day
                </p>
              </div>

              {bulkSuccessMsg && (
                <div className="p-4 text-xs bg-green-500/10 border border-green-500/20 text-green-500 rounded-2xl font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>{bulkSuccessMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-4 text-xs bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-bold flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 block shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleBulkSubmit} className="space-y-6">
                <div className="max-w-xs space-y-2">
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                    Log Date (BS)
                  </label>
                  <NepaliDatePicker
                    value={bulkDate}
                    onChange={(iso) => setBulkDate(iso)}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-3 text-[10px] font-bold uppercase tracking-wider text-muted border-b border-border/70 pb-2">
                    <span className="col-span-4">Staff Member</span>
                    <span className="col-span-4 text-center">Attendance Status</span>
                    <span className="col-span-4">Notes / Remarks</span>
                  </div>

                  <div className="divide-y divide-border/60 space-y-3.5">
                    {staffList.map((staff) => (
                      <div key={staff._id} className="grid grid-cols-12 gap-3 items-center pt-3">
                        <div className="col-span-4">
                          <p className="text-sm font-bold text-foreground">{staff.name}</p>
                        </div>
                        
                        <div className="col-span-4 flex justify-center">
                          <select
                            value={bulkStatusMap[staff._id] || "present"}
                            onChange={(e) => {
                              const newStatus = e.target.value as "present" | "absent" | "half_day" | "leave";
                              setBulkStatusMap(prev => ({ ...prev, [staff._id]: newStatus }));
                            }}
                            className="px-3 py-2 border border-border/80 rounded-2xl bg-background/60 text-xs font-bold cursor-pointer w-full max-w-[150px] focus:outline-none focus:ring-2 focus:ring-accent/20"
                          >
                            <option value="present">Present</option>
                            <option value="half_day">Half Day</option>
                            <option value="leave">On Leave</option>
                            <option value="absent">Absent</option>
                          </select>
                        </div>

                        <div className="col-span-4">
                          <input
                            type="text"
                            placeholder="Add note (e.g. sick leave, client visit)"
                            value={bulkNotesMap[staff._id] || ""}
                            onChange={(e) => {
                              setBulkNotesMap(prev => ({ ...prev, [staff._id]: e.target.value }));
                            }}
                            className="w-full px-3.5 py-2 border border-border/80 rounded-2xl bg-background/60 focus:outline-none focus:ring-2 focus:ring-accent/20 text-xs font-semibold placeholder:text-muted/60"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border/60">
                  <button
                    type="submit"
                    style={{ background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)" }}
                    className="px-6 py-2.5 text-black rounded-xl font-bold text-xs transition-all shadow-md shadow-orange-500/15 uppercase tracking-wider flex items-center gap-2 hover:opacity-95 cursor-pointer"
                  >
                    <CheckCircle2 size={16} />
                    Submit Bulk Logs
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ─── LOG / EDIT ATTENDANCE MODAL ─── */}
      {showEditModal && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 pt-20 sm:p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-md rounded-[28px] border border-border/80 p-6 sm:p-7 shadow-2xl animate-scale-up max-h-[85vh] overflow-y-auto relative space-y-4">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl hover:bg-muted/20 text-muted hover:text-foreground transition-all"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
              <div
                style={{ background: "linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #1D4ED8 100%)" }}
                className="p-2 text-white rounded-xl shadow-xs shrink-0"
              >
                <Calendar size={18} />
              </div>
              <h2 className="text-base font-bold font-display text-foreground">
                {editingLog ? "Modify Attendance Log" : "New Attendance Entry"}
              </h2>
            </div>

            {errorMsg && (
              <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 block shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveModalLog} className="space-y-4">
              {/* Date (Disabled representation) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                  Log Date (BS)
                </label>
                <input
                  type="text"
                  value={formatNepali(modalDate)}
                  className="w-full px-4 py-2.5 border border-border/80 rounded-2xl bg-muted/20 text-xs font-bold text-muted focus:outline-none select-none"
                  disabled
                />
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                  Status
                </label>
                {isAdmin || !editingLog ? (
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 border border-border/80 rounded-2xl bg-background/60 text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/20"
                    required
                  >
                    <option value="present">Present</option>
                    <option value="half_day">Half Day</option>
                    <option value="leave">On Leave</option>
                    <option value="absent">Absent</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={modalStatus.toUpperCase()}
                    className="w-full px-4 py-2.5 border border-border/80 rounded-2xl bg-muted/20 text-xs font-bold text-muted focus:outline-none select-none"
                    disabled
                  />
                )}
              </div>

              {/* Time Check-In/Out (only applicable if status present or half day) */}
              {(modalStatus === "present" || modalStatus === "half_day") && (() => {
                const isTodayModal = modalDate.toDateString() === new Date().toDateString();
                return (
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                        Check-In Time
                      </label>
                      <input
                        type="time"
                        value={modalCheckIn}
                        onChange={(e) => setModalCheckIn(e.target.value)}
                        className="w-full px-4 py-2 border border-border/80 rounded-2xl bg-background/60 focus:outline-none focus:ring-2 focus:ring-accent/20 text-xs font-semibold disabled:opacity-60"
                        disabled={!isAdmin && !!editingLog}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                        Check-Out Time
                      </label>
                      <input
                        type="time"
                        value={modalCheckOut}
                        onChange={(e) => setModalCheckOut(e.target.value)}
                        className="w-full px-4 py-2 border border-border/80 rounded-2xl bg-background/60 focus:outline-none focus:ring-2 focus:ring-accent/20 text-xs font-semibold disabled:opacity-60"
                        disabled={!isAdmin && !!editingLog && (!isTodayModal || !!editingLog.checkOut)}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                  Log Notes / Remarks
                </label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full h-20 p-3.5 border border-border/80 rounded-2xl bg-background/60 focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none text-xs font-semibold placeholder:text-muted/60 disabled:opacity-60"
                  placeholder="Enter any notes (e.g. checked out early, sick leave description)"
                  disabled={!isAdmin && !!editingLog && (modalDate.toDateString() !== new Date().toDateString())}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center gap-3 pt-3 border-t border-border/60 mt-4">
                {isAdmin && editingLog ? (
                  <button
                    type="button"
                    onClick={handleDeleteLog}
                    className="px-4 py-2 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-xl text-xs font-bold transition-all"
                  >
                    Delete Log
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-border/80 bg-card rounded-xl text-xs font-bold hover:bg-muted/20 transition-all text-muted"
                  >
                    {!isAdmin && !!editingLog && (modalDate.toDateString() !== new Date().toDateString()) ? "Close" : "Cancel"}
                  </button>
                  {(!(!isAdmin && !!editingLog && (modalDate.toDateString() !== new Date().toDateString()))) && (
                    <button
                      type="submit"
                      style={{ background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)" }}
                      className="px-4 py-2 text-black rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/15 hover:opacity-95"
                    >
                      Save Changes
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── PROCESS / EDIT SALARY MODAL ─── */}
      {showSalaryModal && selectedSalaryUser && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 pt-20 sm:p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-md rounded-[28px] border border-border/80 p-6 sm:p-7 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto relative space-y-4">
            <button
              onClick={() => setShowSalaryModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl hover:bg-muted/20 text-muted hover:text-foreground transition-all"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
              <div
                style={{ background: "linear-gradient(135deg, #34D399 0%, #10B981 50%, #059669 100%)" }}
                className="p-2 text-white rounded-xl shadow-xs shrink-0"
              >
                <DollarSign size={18} />
              </div>
              <h2 className="text-base font-bold font-display text-foreground">
                {editingSalaryRecord ? "Edit Processed Salary" : "Process Monthly Salary"}
              </h2>
            </div>

            <div className="bg-muted/15 p-4 rounded-2xl border border-border/60 text-xs font-semibold space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Staff Member</span>
                  <span className="font-bold text-sm text-foreground">{selectedSalaryUser.name}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 font-bold uppercase tracking-wider text-[10px]">
                  {selectedSalaryUser.role}
                </span>
              </div>

              {/* Custom Salary Period (Month & Year) */}
              <div className="pt-2.5 border-t border-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={12} className="text-accent" />
                    <span>Salary Period (Month & Year)</span>
                  </label>
                  <span className="text-xs font-bold text-accent px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20">
                    {months.find((m) => m.value === salaryModalMonth)?.name} ({months.find((m) => m.value === salaryModalMonth)?.nepaliName}) {salaryModalYear} BS
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-muted font-bold uppercase tracking-wider">
                      Select Month (महिना)
                    </label>
                    <select
                      value={salaryModalMonth}
                      onChange={(e) => handleSalaryMonthYearChange(Number(e.target.value), salaryModalYear)}
                      className="w-full px-3 py-2 border border-border/80 rounded-xl bg-card text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer"
                    >
                      {months.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.name} ({m.nepaliName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] text-muted font-bold uppercase tracking-wider">
                      Select Year (साल)
                    </label>
                    <select
                      value={salaryModalYear}
                      onChange={(e) => handleSalaryMonthYearChange(salaryModalMonth, Number(e.target.value))}
                      className="w-full px-3 py-2 border border-border/80 rounded-xl bg-card text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer"
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y} BS
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Existing Salary Warning */}
                {(() => {
                  const existingRecord = !editingSalaryRecord && selectedSalaryUser
                    ? salaries.find((s) => {
                        const userId = s.user?._id || (s.user as any);
                        return userId === selectedSalaryUser._id && s.month === salaryModalMonth && s.year === salaryModalYear;
                      })
                    : null;
                  if (existingRecord) {
                    return (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-semibold flex items-center gap-2 mt-1">
                        <span className="shrink-0 text-sm">⚠️</span>
                        <span>
                          Salary for <strong>{months.find((m) => m.value === salaryModalMonth)?.name} {salaryModalYear}</strong> is already processed ({existingRecord.status.toUpperCase()}, Rs. {existingRecord.finalSalary.toLocaleString()}).
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            {salaryFormError && (
              <div className="p-3 mb-4 text-xs bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 block shrink-0" />
                <span>{salaryFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSalary} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                    Base Salary
                  </label>
                  <input
                    type="number"
                    value={salaryBase}
                    onChange={(e) => setSalaryBase(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-border/80 rounded-2xl bg-background/60 focus:outline-none focus:ring-2 focus:ring-accent/20 text-xs font-semibold"
                    required
                    min={0}
                    disabled={!!editingSalaryRecord}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                    Days Present
                  </label>
                  <input
                    type="number"
                    value={salaryPresentDays}
                    onChange={(e) => setSalaryPresentDays(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-border/80 rounded-2xl bg-background/60 focus:outline-none focus:ring-2 focus:ring-accent/20 text-xs font-semibold"
                    required
                    min={0}
                    disabled={!!editingSalaryRecord}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                    Days Absent / Off
                  </label>
                  <input
                    type="number"
                    value={salaryAbsentDays}
                    onChange={(e) => setSalaryAbsentDays(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-border/80 rounded-2xl bg-background/60 focus:outline-none focus:ring-2 focus:ring-accent/20 text-xs font-semibold"
                    required
                    min={0}
                    disabled={!!editingSalaryRecord}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                    Bonus
                  </label>
                  <input
                    type="number"
                    value={salaryBonus}
                    onChange={(e) => setSalaryBonus(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-border/80 rounded-2xl bg-background/60 focus:outline-none focus:ring-2 focus:ring-accent/20 text-xs font-semibold"
                    min={0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                    Deductions
                  </label>
                  <input
                    type="number"
                    value={salaryDeductions}
                    onChange={(e) => setSalaryDeductions(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-border/80 rounded-2xl bg-background/60 focus:outline-none focus:ring-2 focus:ring-accent/20 text-xs font-semibold"
                    min={0}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                    Final Paid Salary
                  </label>
                  <input
                    type="number"
                    value={salaryFinal}
                    onChange={(e) => setSalaryFinal(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-border/80 rounded-2xl bg-background/60 focus:outline-none focus:ring-2 focus:ring-accent/20 text-xs font-bold text-accent"
                    required
                    min={0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                    Payment Status
                  </label>
                  <select
                    value={salaryStatus}
                    onChange={(e) => setSalaryStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 border border-border/80 rounded-2xl bg-background/60 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>

                {salaryStatus === "paid" && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                      Payment Method
                    </label>
                    <select
                      value={salaryPaymentMethod}
                      onChange={(e) => setSalaryPaymentMethod(e.target.value as any)}
                      className="w-full px-3.5 py-2 border border-border/80 rounded-2xl bg-background/60 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/20"
                    >
                      <option value="cash">Cash</option>
                      <option value="online_banking">Online Banking</option>
                      <option value="esewa">eSewa</option>
                      <option value="cheque">Cheque</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                )}
              </div>

              {salaryStatus === "paid" && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                    Payment Date (BS)
                  </label>
                  <NepaliDatePicker
                    value={salaryPaymentDate}
                    onChange={(iso) => setSalaryPaymentDate(iso)}
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                  Notes / Remarks
                </label>
                <textarea
                  value={salaryNotes}
                  onChange={(e) => setSalaryNotes(e.target.value)}
                  className="w-full h-16 p-3.5 border border-border/80 rounded-2xl bg-background/60 focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none text-xs font-semibold placeholder:text-muted/60"
                  placeholder="Enter details like bonus reason, deductions explanation, check number, etc."
                />
              </div>

              <div className="flex justify-between items-center gap-3 pt-3 border-t border-border/60 mt-4">
                {editingSalaryRecord ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteSalaryRecord(editingSalaryRecord._id)}
                    className="px-4 py-2 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-xl text-xs font-bold transition-all"
                  >
                    Delete
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSalaryModal(false)}
                    className="px-4 py-2 border border-border/80 bg-card rounded-xl text-xs font-bold hover:bg-muted/20 transition-all text-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={salarySubmitting}
                    style={{ background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)" }}
                    className="px-4 py-2 text-black rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/15 hover:opacity-95 disabled:opacity-50 cursor-pointer"
                  >
                    {salarySubmitting ? "Saving..." : "Save Record"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT STAFF MEMBER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border/80 rounded-[32px] max-w-md w-full p-6 sm:p-7 shadow-2xl relative">
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent/20 to-orange-500/10 border border-accent/30 flex items-center justify-center text-accent">
                  {editingUser ? <Edit2 size={18} /> : <UserPlus size={18} />}
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    {editingUser ? "Edit Staff Member" : "Add New Staff Member"}
                  </h3>
                  <p className="text-xs text-muted">
                    {editingUser
                      ? "Update profile details, role, and base salary"
                      : "Create a new staff profile for roster & attendance"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-1.5 rounded-full hover:bg-muted/20 text-muted transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {userFormError && (
              <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{userFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={userFormName}
                  onChange={(e) => setUserFormName(e.target.value)}
                  placeholder="e.g. Ramesh Shrestha"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-muted/20 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={userFormEmail}
                  onChange={(e) => setUserFormEmail(e.target.value)}
                  placeholder="e.g. ramesh@ktmdecor.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-muted/20 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">
                    Role
                  </label>
                  <select
                    value={userFormRole}
                    onChange={(e) => setUserFormRole(e.target.value as "staff" | "admin")}
                    className="w-full px-3 py-2.5 rounded-xl border border-border/80 bg-muted/20 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer"
                  >
                    <option value="staff" className="bg-card">Staff</option>
                    <option value="admin" className="bg-card">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">
                    Base Salary (NPR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={userFormBaseSalary}
                    onChange={(e) => setUserFormBaseSalary(e.target.value)}
                    placeholder="25000"
                    className="w-full px-3 py-2.5 rounded-xl border border-border/80 bg-muted/20 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider flex items-center justify-between">
                  <span>{editingUser ? "Change Password (Optional)" : "Password (Optional)"}</span>
                  {editingUser && <span className="text-[10px] text-muted normal-case font-normal">Leave blank to keep current</span>}
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={14} />
                  <input
                    type="password"
                    value={userFormPassword}
                    onChange={(e) => setUserFormPassword(e.target.value)}
                    placeholder={editingUser ? "••••••••" : "Default: Staff@123"}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/80 bg-muted/20 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
                {!editingUser && (
                  <p className="text-[10px] text-muted mt-1">
                    If left blank, initial password will be set to <span className="font-bold text-foreground">Staff@123</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 border border-border/80 bg-card rounded-xl text-xs font-bold hover:bg-muted/20 transition-all text-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={userFormSubmitting}
                  style={{ background: "linear-gradient(115deg, #F7BA49 0%, #F08B4E 46%, #DE5E56 100%)" }}
                  className="px-5 py-2 text-black rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/15 hover:opacity-95 disabled:opacity-50 cursor-pointer"
                >
                  {userFormSubmitting ? "Saving..." : editingUser ? "Update Staff" : "Add Staff Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE STAFF CONFIRMATION MODAL */}
      {showDeleteUserModal && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-red-500/30 rounded-[32px] max-w-md w-full p-6 sm:p-7 shadow-2xl relative">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Remove Staff Member</h3>
                <p className="text-xs text-muted">This action is permanent and irreversible</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-xs text-foreground/90 leading-relaxed">
                Are you sure you want to remove <span className="font-extrabold text-foreground">{userToDelete.name}</span> (<span className="font-mono text-muted">{userToDelete.email}</span>)?
              </p>
              <div className="p-3 rounded-2xl bg-muted/20 border border-border/60 text-[11px] text-muted space-y-1">
                <p className="flex items-center gap-1.5 font-bold text-foreground">
                  <ShieldCheck size={13} className="text-green-500 shrink-0" />
                  <span>Historical Record Protection</span>
                </p>
                <p>All past attendance records and paid salary history will remain safely preserved in the database for accounting audits.</p>
              </div>
            </div>

            {deleteUserError && (
              <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{deleteUserError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                disabled={deleteUserSubmitting}
                onClick={() => {
                  setShowDeleteUserModal(false);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 border border-border/80 bg-card rounded-xl text-xs font-bold hover:bg-muted/20 transition-all text-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteUserSubmitting}
                onClick={handleConfirmDeleteUser}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-500/20 disabled:opacity-50 cursor-pointer"
              >
                {deleteUserSubmitting ? "Removing..." : "Yes, Remove Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
