import { z } from "zod";

// Generic validation middleware
export const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }
    next(error);
  }
};

// MongoID regex validator
const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
const mongoIdSchema = z.string().regex(mongoIdRegex, { message: "Invalid ID format" });

// Login Schema
export const loginSchema = z.object({
  email: z.string({ required_error: "Email is required" })
    .email({ message: "Invalid email address" }),
  password: z.string({ required_error: "Password is required" })
    .min(6, { message: "Password must be at least 6 characters" }),
});

// Register Schema
export const registerSchema = z.object({
  name: z.string({ required_error: "Name is required" })
    .min(2, { message: "Name must be at least 2 characters" }),
  email: z.string({ required_error: "Email is required" })
    .email({ message: "Invalid email address" }),
  password: z.string({ required_error: "Password is required" })
    .min(6, { message: "Password must be at least 6 characters" }),
  role: z.enum(["admin", "staff"], { required_error: "Role is required" }),
});

// Create Task Schema
export const createTaskSchema = z.object({
  title: z.string({ required_error: "Title is required" })
    .min(1, { message: "Title cannot be empty" })
    .max(100, { message: "Title cannot exceed 100 characters" }),
  description: z.string().optional().default(""),
  assignee: mongoIdSchema,
  dueDate: z.string({ required_error: "Due date is required" })
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }),
  priority: z.enum(["low", "medium", "high"], { required_error: "Priority is required" }),
  totalCost: z.number().nonnegative({ message: "Total cost must be non-negative" }).optional().default(0),
  prepaidCost: z.number().nonnegative({ message: "Prepaid cost must be non-negative" }).optional().default(0),
});

// Update Task Schema (Partial of createTaskSchema, but allows status modification)
export const updateTaskSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  assignee: mongoIdSchema.optional(),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  totalCost: z.number().nonnegative().optional(),
  prepaidCost: z.number().nonnegative().optional(),
});

// Create/Update Field Note Schema
export const fieldNoteSchema = z.object({
  title: z.string({ required_error: "Title is required" })
    .min(1, { message: "Title cannot be empty" }),
  description: z.string().optional().default(""),
  district: z.string({ required_error: "District is required" })
    .min(1, { message: "District cannot be empty" }),
  location: z.string({ required_error: "Location is required" })
    .min(1, { message: "Location cannot be empty" }),
  fittingSpotImageUrl: z.string().url({ message: "Invalid image URL" }).or(z.literal("")).optional().default(""),
  email: z.string().email({ message: "Invalid email" }).or(z.literal("")).optional().default(""),
});

// Create/Update Attendance Schema
export const attendanceSchema = z.object({
  user: mongoIdSchema.optional(),
  date: z.string({ required_error: "Date is required" })
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }),
  status: z.enum(["present", "absent", "half_day", "leave"], { required_error: "Status is required" }),
  checkIn: z.string().refine((val) => !val || !isNaN(Date.parse(val)), { message: "Invalid checkIn timestamp" }).nullable().optional(),
  checkOut: z.string().refine((val) => !val || !isNaN(Date.parse(val)), { message: "Invalid checkOut timestamp" }).nullable().optional(),
  notes: z.string().optional().default(""),
});

// Update Attendance Schema
export const updateAttendanceSchema = z.object({
  user: mongoIdSchema.optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }).optional(),
  status: z.enum(["present", "absent", "half_day", "leave"]).optional(),
  checkIn: z.string().refine((val) => !val || !isNaN(Date.parse(val)), { message: "Invalid checkIn timestamp" }).nullable().optional(),
  checkOut: z.string().refine((val) => !val || !isNaN(Date.parse(val)), { message: "Invalid checkOut timestamp" }).nullable().optional(),
  notes: z.string().optional(),
});

// Create Salary Schema
export const createSalarySchema = z.object({
  user: mongoIdSchema,
  month: z.number({ required_error: "Month is required" }).min(1).max(12),
  year: z.number({ required_error: "Year is required" }),
  baseSalary: z.number({ required_error: "Base salary is required" }).nonnegative(),
  presentDays: z.number({ required_error: "Present days are required" }).nonnegative(),
  absentDays: z.number({ required_error: "Absent days are required" }).nonnegative(),
  bonus: z.number().nonnegative().optional().default(0),
  deductions: z.number().nonnegative().optional().default(0),
  calculatedSalary: z.number({ required_error: "Calculated salary is required" }).nonnegative(),
  finalSalary: z.number({ required_error: "Final salary is required" }).nonnegative(),
  status: z.enum(["pending", "paid"]).optional().default("pending"),
  paymentDate: z.string().refine((val) => !val || !isNaN(Date.parse(val)), { message: "Invalid payment date" }).nullable().optional(),
  paymentMethod: z.enum(["cash", "online_banking", "esewa", "cheque", "other"]).nullable().optional(),
  notes: z.string().optional().default(""),
});

// Update Salary Schema
export const updateSalarySchema = z.object({
  month: z.number().min(1).max(12).optional(),
  year: z.number().optional(),
  bonus: z.number().nonnegative().optional(),
  deductions: z.number().nonnegative().optional(),
  finalSalary: z.number().nonnegative().optional(),
  status: z.enum(["pending", "paid"]).optional(),
  paymentDate: z.string().refine((val) => !val || !isNaN(Date.parse(val)), { message: "Invalid payment date" }).nullable().optional(),
  paymentMethod: z.enum(["cash", "online_banking", "esewa", "cheque", "other"]).nullable().optional(),
  notes: z.string().optional(),
});

