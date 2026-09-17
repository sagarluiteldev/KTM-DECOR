import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import { rateLimit } from "express-rate-limit";
import pkgNepaliDate from "nepali-date-converter";
const NepaliDate = pkgNepaliDate.default || pkgNepaliDate;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config & Services & Middlewares
import { connectDB } from "./config/db.js";
import { triggerPusher } from "./config/pusher.js";
import { logActivity } from "./services/activityLogger.js";
import { runSeeds, seedUsers } from "./services/seedService.js";
import { buildStatementWorkbook, getStatementData } from "./services/exportService.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { initCache, cacheGet, cacheSet, cacheDeletePattern } from "./services/cacheService.js";

// Initialize cache connection
initCache().catch((err) => console.error("Failed to initialize cache service:", err.message));

// Models
import User from "./models/User.js";
import Task from "./models/Task.js";
import Notification from "./models/Notification.js";
import FieldNote from "./models/FieldNote.js";
import ActivityLog from "./models/ActivityLog.js";
import Product from "./models/Product.js";
import Order from "./models/Order.js";
import Sale from "./models/Sale.js";
import Expense from "./models/Expense.js";
import Purchase from "./models/Purchase.js";
import InventoryItem from "./models/InventoryItem.js";
import Quotation from "./models/Quotation.js";
import QuickNote from "./models/QuickNote.js";
import MonthlyStatement from "./models/MonthlyStatement.js";
import Attendance from "./models/Attendance.js";
import Salary from "./models/Salary.js";

// Middleware
import { protect, admin } from "./middleware/auth.js";
import {
  validate,
  loginSchema,
  registerSchema,
  createTaskSchema,
  updateTaskSchema,
  fieldNoteSchema,
  attendanceSchema,
  updateAttendanceSchema,
  createSalarySchema,
  updateSalarySchema
} from "./middleware/validation.js";

dotenv.config();

const SHARED_STAFF_EMAIL = process.env.SHARED_STAFF_EMAIL || "staff@ktmdecor.com";

const app = express();

// Apply Helmet for security headers (customized for API service)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Apply Mongo Sanitize to prevent NoSQL injection
app.use(mongoSanitize());

// Define global rate limiter (100 requests per minute)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests from this IP, please try again later." }
});

// Define auth login rate limiter (5 attempts per 15 minutes)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts from this IP, please try again after 15 minutes." }
});

// Apply global rate limiter to all requests
app.use(globalLimiter);

// Configure CORS (support local dev + vercel subdomains and previews)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "https://ktmdecor.com",
  "https://www.ktmdecor.com",
  "https://admin.ktmdecor.com",
  "https://ktmdecor.vercel.app",
  "https://decorktm.com",
  "https://www.decorktm.com",
  "https://admin.decorktm.com"
];

if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim()));
}

// Regex to allow any local dev host (localhost, 127.0.0.1, 0.0.0.0, LAN IPs) on any port
const localDevRegex = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;
const vercelRegex = /^https:\/\/([a-zA-Z0-9_-]+\.)?vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const isExplicitlyAllowed = allowedOrigins.includes(origin);
      const isLocalDev = localDevRegex.test(origin);
      const isVercel = vercelRegex.test(origin);

      if (isExplicitlyAllowed || isLocalDev || isVercel) {
        callback(null, true);
      } else {
        console.warn(`[CORS Blocked] Origin "${origin}" is not in the allowed origins list.`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Middleware to invalidate cache on domain database mutations
app.use((req, res, next) => {
  const writeMethods = ["POST", "PUT", "PATCH", "DELETE"];
  const isDataMutation = writeMethods.includes(req.method) && 
    req.originalUrl.startsWith("/api/") &&
    !req.originalUrl.startsWith("/api/auth/") &&
    !req.originalUrl.startsWith("/api/chat") &&
    !req.originalUrl.startsWith("/api/activity/log");

  if (isDataMutation) {
    const originalJson = res.json;
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheDeletePattern("bootstrap:*").catch((err) => {
          console.error("Cache invalidation failed in middleware:", err.message);
        });
      }
      return originalJson.call(this, body);
    };
  }
  next();
});

// Connection to MongoDB
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/ktm_decor_dashboard";

// Sync manual registry order to Sales ledger immediately upon creation or update (Product price only - excluding delivery and fitting)
async function syncOrderSale(order, userId) {
  try {
    if (!order.deleted) {
      // Check if sale already exists
      const existingSale = await Sale.findOne({ orderId: order._id });
      // Total sales reflects product price only (excludes delivery & installation charges as requested)
      const productPrice = Number(order.price) || 0;
      // Use the order collected date entered during order entry, falling back to createdAt or current time
      const orderDateToUse = order.orderDate || order.createdAt || new Date();

      if (!existingSale) {
        const sale = new Sale({
          clientName: order.customerName,
          productName: order.productName,
          amount: productPrice,
          date: orderDateToUse,
          paymentMethod: order.paymentMethod || "cash",
          notes: order.manufacturingNotes || `Automatic sale from order: ${order.productName}`,
          createdBy: userId || order.createdBy,
          orderId: order._id
        });
        await sale.save();
        
        const populatedSale = await Sale.findById(sale._id).populate("createdBy", "name role").populate("orderId");
        triggerPusher("sale_created", populatedSale);
        await logActivity(userId || order.createdBy, "Sale Logged", `Logged sale from order for "${order.productName}" (Rs. ${productPrice.toLocaleString()})`);
      } else {
        existingSale.clientName = order.customerName;
        existingSale.productName = order.productName;
        existingSale.amount = productPrice;
        existingSale.date = orderDateToUse;
        existingSale.paymentMethod = order.paymentMethod || "cash";
        existingSale.notes = order.manufacturingNotes || `Automatic sale from order: ${order.productName}`;
        await existingSale.save();
        
        const populatedSale = await Sale.findById(existingSale._id).populate("createdBy", "name role").populate("orderId");
        triggerPusher("sale_created", populatedSale);
        await logActivity(userId || order.createdBy, "Sale Updated", `Updated sale details from order for "${order.productName}" (Rs. ${productPrice.toLocaleString()})`);
      }
    } else {
      // If deleted, remove any corresponding sale
      const existingSale = await Sale.findOne({ orderId: order._id });
      if (existingSale) {
        await Sale.findByIdAndDelete(existingSale._id);
        triggerPusher("sale_deleted", existingSale._id.toString());
        await logActivity(userId || order.createdBy, "Sale Deleted", `Deleted sale log for "${order.productName}" due to order deletion`);
      }
    }
  } catch (err) {
    console.error("Error syncing order to sale:", err);
  }
}

// Backfill and synchronize existing non-deleted orders into Sales with product price only and order collected date
async function backfillOrderSales() {
  try {
    const orders = await Order.find({ deleted: { $ne: true } });
    for (const order of orders) {
      const productPrice = Number(order.price) || 0;
      const orderDateToUse = order.orderDate || order.createdAt || new Date();
      const existingSale = await Sale.findOne({ orderId: order._id });
      if (!existingSale) {
        await Sale.create({
          clientName: order.customerName,
          productName: order.productName,
          amount: productPrice,
          date: orderDateToUse,
          paymentMethod: order.paymentMethod || "cash",
          notes: order.manufacturingNotes || `Automatic sale from order: ${order.productName}`,
          createdBy: order.createdBy,
          orderId: order._id
        });
      } else {
        let changed = false;
        if (existingSale.amount !== productPrice) {
          existingSale.amount = productPrice;
          changed = true;
        }
        if (orderDateToUse && (!existingSale.date || new Date(existingSale.date).getTime() !== new Date(orderDateToUse).getTime())) {
          existingSale.date = orderDateToUse;
          changed = true;
        }
        if (changed) {
          await existingSale.save();
        }
      }
    }
  } catch (err) {
    console.error("Error backfilling order sales:", err);
  }
}

// Diagnostic endpoint to check configuration status
app.get("/api/auth/status", protect, admin, async (req, res) => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };

  const envKeys = Object.keys(process.env).filter(key => 
    key.includes("MONGO") || 
    key.includes("URI") || 
    key.includes("URL") || 
    key.includes("SECRET") || 
    key.includes("PASSWORD") || 
    key.includes("PORT") ||
    key.includes("VITE")
  );

  const maskString = (str) => {
    if (!str) return "none";
    if (str.length <= 30) return str;
    return str.substring(0, 15) + "..." + str.substring(str.length - 15);
  };

  let connectError = null;
  try {
    await connectDB();
  } catch (err) {
    connectError = err.message;
  }

  const dbState = mongoose.connection?.readyState;

  const status = {
    dbConnected: dbState === 1,
    dbState: states[dbState] || "unknown",
    connectError,
    envKeysAvailable: envKeys,
    envAdminPasswordDefined: !!process.env.SEED_ADMIN_PASSWORD,
    envStaffPasswordDefined: !!process.env.SEED_STAFF_PASSWORD,
    envMongoUriDefined: !!process.env.MONGO_URI,
    envMongoUriMasked: maskString(process.env.MONGO_URI),
    envJwtSecretDefined: !!process.env.JWT_SECRET,
  };

  if (dbState !== 1) {
    return res.json(status);
  }

  let seedError = null;
  let userCount = 0;
  let adminUserFound = null;
  let inventoryCount = 0;
  let runSeedSuccess = false;

  try {
    userCount = await User.countDocuments();
    inventoryCount = await InventoryItem.countDocuments();
    adminUserFound = await User.findOne({ role: "admin" });

    const pathsToTry = [
      path.join(__dirname, "inventorySeed.json"),
      path.join(process.cwd(), "dashboard/backend/src/inventorySeed.json"),
      path.join(process.cwd(), "src/inventorySeed.json")
    ];
    let resolvedPath = "";
    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        resolvedPath = p;
        break;
      }
    }

    if (resolvedPath && adminUserFound && inventoryCount === 0) {
      const rawData = fs.readFileSync(resolvedPath, "utf8");
      const seedData = JSON.parse(rawData);
      // Filter out invalid items (e.g. missing name, category, or unit) to protect validation schema
      const itemsToInsert = seedData
        .filter((item) => item && item.name && item.name.trim() && item.category && item.unit)
        .map((item) => ({
          ...item,
          createdBy: adminUserFound._id,
        }));
      if (itemsToInsert.length > 0) {
        await InventoryItem.insertMany(itemsToInsert);
      }
      inventoryCount = await InventoryItem.countDocuments();
      runSeedSuccess = true;
    }
  } catch (error) {
    seedError = error.message;
  }

  res.json({
    ...status,
    userCount,
    adminUserFound: !!adminUserFound,
    adminEmail: adminUserFound ? adminUserFound.email : "none",
    inventoryCount,
    seedError,
    runSeedSuccess
  });
});

// ─── SERVERLESS CONNECTION MIDDLEWARE ───────────────────────────
// Only ensures DB connection. Seeds are decoupled to run once, not per-request.
let seedsTriggered = false;
app.use(async (req, res, next) => {
  try {
    await connectDB();
    // Trigger seeds once after first connection, but don't block the request
    if (!seedsTriggered) {
      seedsTriggered = true;
      // Fire-and-forget: seeds run in background, not blocking the response
      runSeeds().catch((err) => {
        seedsTriggered = false; // Allow retry on next request
        console.error("Background seed initialization error:", err);
      });
    }
    next();
  } catch (err) {
    console.error("Database middleware connection error:", err);
    res.status(500).json({ 
      message: "Database connection failed",
      error: err.message 
    });
  }
});

// ─── DASHBOARD BOOTSTRAP ENDPOINT ─────────────────────────────
// Trigger Vercel rebuild to apply deleted VITE_API_URL env variable
app.get("/api/bootstrap", protect, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userEmail = req.user.email;
    const userId = req.user._id.toString();
    const cacheKey = `bootstrap:${userId}`;

    // Try to retrieve data from cache
    const cachedData = await cacheGet(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // ─── PRE-FETCH: Single staff user query, reused for tasks + notifications ───
    let staffUserIds = null;
    if (userRole !== "admin" && userEmail === SHARED_STAFF_EMAIL) {
      const staffUsers = await User.find({ role: "staff" }).select("_id").lean();
      staffUserIds = staffUsers.map((u) => u._id);
    }

    // 1. Build tasks query
    let taskQuery = { deleted: { $ne: true } };
    if (userRole !== "admin") {
      if (staffUserIds) {
        taskQuery = { assignee: { $in: [userId, ...staffUserIds] }, deleted: { $ne: true } };
      } else {
        taskQuery = { assignee: userId, deleted: { $ne: true } };
      }
    }

    // 2. Build notifications query (reuses staffUserIds — no duplicate query)
    let notifQuery = {};
    if (staffUserIds) {
      notifQuery = {
        $or: [
          { recipient: userId },
          { recipient: { $in: staffUserIds } },
          { recipient: null }
        ]
      };
    } else {
      notifQuery = {
        $or: [{ recipient: userId }, { recipient: null }]
      };
    }

    // 3. Define parallel database queries with limits for serverless performance
    const promises = {
      tasks: Task.find(taskQuery)
        .populate("assignee", "name email role")
        .populate("createdBy", "name role")
        .sort({ pinned: -1, createdAt: -1 })
        .limit(200)
        .lean(),
      users: User.find({}).select("name email role baseSalary").lean(),
      notifications: Notification.find(notifQuery).sort({ createdAt: -1 }).limit(100).lean(),
      campaigns: FieldNote.find({ deleted: { $ne: true } })
        .populate("createdBy", "name role")
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
      activities: ActivityLog.find({})
        .populate("user", "name email role")
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      products: Product.find({}).sort({ createdAt: -1 }).limit(100).lean(),
      orders: Order.find({ deleted: { $ne: true } })
        .populate("createdBy", "name role")
        .populate("assignee", "name email role")
        .sort({ createdAt: -1 })
        .limit(300)
        .lean(),
      inventoryItems: InventoryItem.find({})
        .populate("createdBy", "name role")
        .sort({ name: 1 })
        .lean(),
      quickNotes: QuickNote.find({})
        .populate("createdBy", "name role")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
    };

    // 4. Inject admin-only data (with limits)
    if (userRole === "admin") {
      promises.sales = Sale.find({}).populate("createdBy", "name role").populate("orderId", "customerName price totalPrice deliveryPrice installationPrice stage status orderDate").sort({ date: -1 }).limit(500).lean();
      promises.expenses = Expense.find({}).populate("createdBy", "name role").sort({ date: -1 }).limit(500).lean();
      promises.purchases = Purchase.find({}).populate("createdBy", "name role").sort({ date: -1 }).limit(300).lean();
      promises.quotations = Quotation.find({}).populate("createdBy", "name role").sort({ date: -1 }).limit(200).lean();
      
      promises.binTasks = Task.find({ deleted: true }).populate("assignee", "name email role").populate("createdBy", "name role").limit(100).lean();
      promises.binCampaigns = FieldNote.find({ deleted: true }).populate("createdBy", "name role").limit(100).lean();
      promises.binOrders = Order.find({ deleted: true }).populate("assignee", "name email role").populate("createdBy", "name role").limit(100).lean();
    }

    // 4b. Inject salaries based on permission
    if (userRole === "admin" || userEmail === SHARED_STAFF_EMAIL) {
      promises.salaries = Salary.find({})
        .populate("user", "name email role baseSalary")
        .sort({ year: -1, month: -1 })
        .limit(300)
        .lean();
    } else {
      promises.salaries = Salary.find({ user: userId })
        .populate("user", "name email role baseSalary")
        .sort({ year: -1, month: -1 })
        .limit(50)
        .lean();
    }

    // 5. Query all collections concurrently
    const keys = Object.keys(promises);
    const results = await Promise.all(Object.values(promises));
    
    // 6. Map results to keys
    const payload = {};
    keys.forEach((key, index) => {
      payload[key] = results[index];
    });

    // Store result in cache (TTL = 1 hour / 3600 seconds)
    await cacheSet(cacheKey, payload, 3600);

    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── AUTH ENDPOINTS ─────────────────────────────────────────


// Login endpoint
app.post("/api/auth/login", loginLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  try {
    const normalizedEmail = email ? email.toLowerCase().trim() : "";
    const user = await User.findOne({ email: normalizedEmail });
    if (user && (await user.comparePassword(password))) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Endpoint to seed staff members in production (waits for completion, safe for serverless)
app.get("/api/auth/seed-staff", async (req, res) => {
  try {
    console.log("Production trigger: seeding staff users...");
    await seedUsers();
    res.json({ message: "Staff members successfully seeded!" });
  } catch (error) {
    console.error("Staff seeding failed:", error);
    res.status(500).json({ message: "Seeding failed", error: error.message });
  }
});

// Endpoint to check live database status and counts in production
app.get("/api/auth/diagnostic-db", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const stats = {};
    for (const col of collections) {
      stats[col.name] = await db.collection(col.name).countDocuments();
    }
    res.json({
      connected: mongoose.connection.readyState === 1,
      dbName: mongoose.connection.name,
      host: mongoose.connection.host,
      collectionCounts: stats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to list all databases on the Atlas cluster
app.get("/api/auth/list-atlas-dbs", async (req, res) => {
  try {
    const adminDb = mongoose.connection.db.admin();
    const dbsInfo = await adminDb.listDatabases();
    res.json({
      activeDatabase: mongoose.connection.name,
      databases: dbsInfo.databases
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register user (Admin only)
app.post("/api/auth/register", protect, admin, validate(registerSchema), async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({ name, email, password, role });
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current profile
app.get("/api/auth/me", protect, async (req, res) => {
  res.json(req.user);
});

// Get all staff members (for task assignees selection)
app.get("/api/auth/users", protect, async (req, res) => {
  try {
    const users = await User.find({}).select("name email role baseSalary").lean();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── TASKS ENDPOINTS ─────────────────────────────────────────

// Get all tasks (Admin sees all, Staff sees their own)
app.get("/api/tasks", protect, async (req, res) => {
  try {
    let query = { deleted: { $ne: true } };
    if (req.user.role !== "admin") {
      if (req.user.email === SHARED_STAFF_EMAIL) {
        // Shared staff login: can view all staff-assigned tasks
        const staffUsers = await User.find({ role: "staff" }).select("_id").lean();
        const staffIds = staffUsers.map((u) => u._id);
        query = { assignee: { $in: [req.user._id, ...staffIds] }, deleted: { $ne: true } };
      } else {
        query = { assignee: req.user._id, deleted: { $ne: true } };
      }
    }
    const tasks = await Task.find(query)
      .populate("assignee", "name email role")
      .populate("createdBy", "name role")
      .sort({ pinned: -1, createdAt: -1 })
      .lean();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create task (Admin only)
app.post("/api/tasks", protect, admin, validate(createTaskSchema), async (req, res) => {
  const { title, description, assignee, dueDate, priority, totalCost, prepaidCost } = req.body;
  try {
    const computedTotal = Number(totalCost) || 0;
    const computedPrepaid = Number(prepaidCost) || 0;
    const remainingCost = computedTotal - computedPrepaid;

    const task = await Task.create({
      title,
      description,
      assignee,
      dueDate,
      priority,
      totalCost: computedTotal,
      prepaidCost: computedPrepaid,
      remainingCost,
      createdBy: req.user._id,
    });

    const [populatedTask, notif] = await Promise.all([
      Task.findById(task._id)
        .populate("assignee", "name email role")
        .populate("createdBy", "name role")
        .lean(),
      Notification.create({
        type: "task_assigned",
        message: `New task assigned to you: "${title}" by ${req.user.name}`,
        recipient: assignee,
      })
    ]);

    // Broadcast task creation via Pusher
    triggerPusher("task_created", populatedTask);
    triggerPusher("receive_notification", notif);

    logActivity(req.user, "Task Created", `Assigned "${title}" to ${populatedTask?.assignee?.name || "staff"}`);

    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update task (Admin can change everything, Staff can only change status of their tasks)
app.put("/api/tasks/:id", protect, validate(updateTaskSchema), async (req, res) => {
  const { title, description, assignee, dueDate, priority, status, totalCost, prepaidCost } = req.body;
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Role verification
    if (req.user.role !== "admin") {
      if (req.user.email === SHARED_STAFF_EMAIL) {
        // Shared staff login: verify the assignee is indeed a staff member
        const taskAssignee = await User.findById(task.assignee);
        if (!taskAssignee || taskAssignee.role !== "staff") {
          return res.status(403).json({ message: "Not authorized to modify this task" });
        }
      } else if (task.assignee.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized to modify this task" });
      }
    }

    let previousStatus = task.status;

    if (req.user.role === "admin") {
      task.title = title || task.title;
      task.description = description !== undefined ? description : task.description;
      task.assignee = assignee || task.assignee;
      task.dueDate = dueDate || task.dueDate;
      task.priority = priority || task.priority;
      task.status = status || task.status;
      if (totalCost !== undefined) task.totalCost = Number(totalCost) || 0;
      if (prepaidCost !== undefined) task.prepaidCost = Number(prepaidCost) || 0;
      task.remainingCost = (task.totalCost || 0) - (task.prepaidCost || 0);
    } else {
      // Staff can only modify the status
      task.status = status || task.status;
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignee", "name email role")
      .populate("createdBy", "name role");

    // Real-time synchronization to everyone
    triggerPusher("task_updated", populatedTask);

    // If status changed to done, notify the creator (admin)
    if (previousStatus !== "done" && task.status === "done") {
      const creatorNotif = await Notification.create({
        type: "task_assigned",
        message: `Task completed by ${req.user.name}: "${task.title}"`,
        recipient: task.createdBy,
      });
      triggerPusher("receive_notification", creatorNotif);
    }

    await logActivity(
      req.user._id,
      "Task Updated",
      `Changed status of "${task.title}" to "${task.status.toUpperCase()}"`
    );

    res.json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle Task Pinning (Admin only)
app.put("/api/tasks/:id/pin", protect, admin, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.pinned = !task.pinned;
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignee", "name email")
      .populate("createdBy", "name");

    // Broadcast pinned event via Pusher
    triggerPusher("task_pinned", populatedTask);

    await logActivity(
      req.user._id,
      task.pinned ? "Task Pinned" : "Task Unpinned",
      `"${task.title}" has been ${task.pinned ? "pinned to top" : "unpinned"}`
    );

    res.json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete task (Admin only)
app.delete("/api/tasks/:id", protect, admin, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.deleted = true;
    task.deletedAt = new Date();
    await task.save();
    triggerPusher("task_deleted", req.params.id);
    triggerPusher("bin_updated", {});

    await logActivity(req.user._id, "Task Deleted", `Moved task "${task.title}" to Bin`);
    res.json({ message: "Task moved to trash bin" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── NOTIFICATION ENDPOINTS ──────────────────────────────────

// Get user notifications
app.get("/api/notifications", protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.email === SHARED_STAFF_EMAIL) {
      const staffUsers = await User.find({ role: "staff" }).select("_id").lean();
      const staffIds = staffUsers.map((u) => u._id);
      query = {
        $or: [
          { recipient: req.user._id },
          { recipient: { $in: staffIds } },
          { recipient: null }
        ]
      };
    } else {
      query = {
        $or: [{ recipient: req.user._id }, { recipient: null }]
      };
    }
    const notifs = await Notification.find(query).sort({ createdAt: -1 }).lean();
    res.json(notifs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark notifications as read
app.put("/api/notifications/read", protect, async (req, res) => {
  const { assigneeId } = req.body;
  try {
    // For direct notifications
    if (req.user.email === SHARED_STAFF_EMAIL && assigneeId) {
      // Mark read only for the active staff persona
      await Notification.updateMany({ recipient: assigneeId, read: false }, { read: true });
    } else {
      await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    }

    // For global system announcements, add user/persona ID to readBy array
    const readerId = (req.user.email === SHARED_STAFF_EMAIL && assigneeId) ? assigneeId : req.user._id;
    await Notification.updateMany(
      { recipient: null, readBy: { $ne: readerId } },
      { $addToSet: { readBy: readerId } }
    );

    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Post a system announcement (Admin only)
app.post("/api/notifications/announcement", protect, admin, async (req, res) => {
  const { message } = req.body;
  try {
    const announcement = await Notification.create({
      type: "system_announcement",
      message,
      recipient: null,
    });

    // Broadcast globally to all connected users via Pusher
    triggerPusher("receive_notification", announcement);

    await logActivity(req.user._id, "Announcement Published", `Broadcaster: "${message}"`);
    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── FIELD NOTES ENDPOINTS ────────────────────────────────────

// Get all field notes
app.get("/api/campaigns", protect, async (req, res) => {
  try {
    const fieldNotes = await FieldNote.find({ deleted: { $ne: true } })
      .populate("createdBy", "name role")
      .sort({ createdAt: -1 })
      .lean();
    res.json(fieldNotes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create field note (Staff only!)
app.post("/api/campaigns", protect, validate(fieldNoteSchema), async (req, res) => {
  const { title, description, district, location, fittingSpotImageUrl, email } = req.body;
  try {
    // Only staff, not admins
    if (req.user.role === "admin") {
      return res.status(403).json({ message: "Only staff members can create field notes." });
    }

    const fieldNote = await FieldNote.create({
      title,
      description,
      district,
      location,
      fittingSpotImageUrl: fittingSpotImageUrl || "",
      email: email || "",
      createdBy: req.user._id,
    });

    const populatedFieldNote = {
      ...fieldNote.toObject(),
      createdBy: { _id: req.user._id, name: req.user.name, role: req.user.role }
    };

    triggerPusher("campaign_updated", populatedFieldNote);

    // Create and broadcast global notification asynchronously
    Notification.create({
      type: "new_field_note",
      message: `New field note: "${title}" by ${req.user.name} (District: ${district})`,
      recipient: null,
    }).then((globalFieldNoteNotif) => {
      triggerPusher("receive_notification", globalFieldNoteNotif);
    }).catch(() => null);

    logActivity(req.user, "Field Note Created", `Created field note "${title}" in ${district}, ${location}`);
    res.status(201).json(populatedFieldNote);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update field note (Admins or the owner staff member)
app.put("/api/campaigns/:id", protect, validate(fieldNoteSchema), async (req, res) => {
  const { title, description, district, location, fittingSpotImageUrl, email } = req.body;
  try {
    const fieldNote = await FieldNote.findById(req.params.id);
    if (!fieldNote) {
      return res.status(404).json({ message: "Field note not found" });
    }

    if (req.user.role !== "admin" && fieldNote.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to modify this field note" });
    }

    fieldNote.title = title || fieldNote.title;
    fieldNote.description = description || fieldNote.description;
    fieldNote.district = district || fieldNote.district;
    fieldNote.location = location || fieldNote.location;
    if (fittingSpotImageUrl !== undefined) fieldNote.fittingSpotImageUrl = fittingSpotImageUrl;
    if (email !== undefined) fieldNote.email = email;

    await fieldNote.save();

    const populatedFieldNote = await FieldNote.findById(fieldNote._id).populate("createdBy", "name role");

    triggerPusher("campaign_updated", populatedFieldNote);

    await logActivity(
      req.user._id,
      "Field Note Updated",
      `Updated field note "${fieldNote.title}"`
    );

    res.json(populatedFieldNote);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete field note (Admin only, soft-deletes)
app.delete("/api/campaigns/:id", protect, admin, async (req, res) => {
  try {
    const fieldNote = await FieldNote.findById(req.params.id);
    if (!fieldNote) {
      return res.status(404).json({ message: "Field note not found" });
    }

    fieldNote.deleted = true;
    fieldNote.deletedAt = new Date();
    await fieldNote.save();

    triggerPusher("campaign_deleted", req.params.id);
    triggerPusher("bin_updated", {});

    await logActivity(req.user._id, "Field Note Deleted", `Moved field note "${fieldNote.title}" to Bin`);
    res.json({ message: "Field note moved to trash bin" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── TRASH BIN ENDPOINTS ──────────────────────────────────────

// Get all soft-deleted records (Admin only)
app.get("/api/bin", protect, admin, async (req, res) => {
  try {
    const deletedTasks = await Task.find({ deleted: true })
      .populate("assignee", "name email role")
      .populate("createdBy", "name role")
      .lean();
      
    const deletedCampaigns = await FieldNote.find({ deleted: true })
      .populate("createdBy", "name role")
      .lean();

    const deletedOrders = await Order.find({ deleted: true })
      .populate("assignee", "name email role")
      .populate("createdBy", "name role")
      .lean();

    res.json({
      tasks: deletedTasks,
      campaigns: deletedCampaigns,
      orders: deletedOrders
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Restore soft-deleted record (Admin only)
app.put("/api/bin/:type/:id/restore", protect, admin, async (req, res) => {
  const { type, id } = req.params;
  try {
    if (type === "task") {
      const task = await Task.findById(id);
      if (!task) return res.status(404).json({ message: "Task not found" });
      task.deleted = false;
      task.deletedAt = undefined;
      await task.save();

      const populatedTask = await Task.findById(task._id)
        .populate("assignee", "name email role")
        .populate("createdBy", "name role");

      triggerPusher("task_created", populatedTask);
      triggerPusher("bin_updated", {});
      await logActivity(req.user._id, "Task Restored", `Restored task "${task.title}"`);
      return res.json(populatedTask);
    } else if (type === "campaign" || type === "field-note") {
      const fieldNote = await FieldNote.findById(id);
      if (!fieldNote) return res.status(404).json({ message: "Field note not found" });
      fieldNote.deleted = false;
      fieldNote.deletedAt = undefined;
      await fieldNote.save();

      const populatedFieldNote = await FieldNote.findById(fieldNote._id)
        .populate("createdBy", "name role");

      triggerPusher("campaign_updated", populatedFieldNote);
      triggerPusher("bin_updated", {});
      await logActivity(req.user._id, "Field Note Restored", `Restored field note "${fieldNote.title}"`);
      return res.json(populatedFieldNote);
    } else if (type === "order") {
      const order = await Order.findById(id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      order.deleted = false;
      order.deletedAt = undefined;
      await order.save();
      await syncOrderSale(order, req.user._id);

      const populatedOrder = await Order.findById(order._id)
        .populate("createdBy", "name role")
        .populate("assignee", "name email role");

      triggerPusher("order_created", populatedOrder);
      triggerPusher("bin_updated", {});
      await logActivity(req.user._id, "Order Restored", `Restored order for "${order.productName}"`);
      return res.json(populatedOrder);
    }
    res.status(400).json({ message: "Invalid record type" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Permanently delete record immediately (Admin only)
app.delete("/api/bin/:type/:id/force", protect, admin, async (req, res) => {
  const { type, id } = req.params;
  try {
    if (type === "task") {
      const task = await Task.findById(id);
      if (!task) return res.status(404).json({ message: "Task not found" });
      await task.deleteOne();
      triggerPusher("bin_updated", {});
      await logActivity(req.user._id, "Task Perm Deleted", `Permanently deleted task "${task.title}"`);
      return res.json({ message: "Task permanently deleted" });
    } else if (type === "campaign" || type === "field-note") {
      const fieldNote = await FieldNote.findById(id);
      if (!fieldNote) return res.status(404).json({ message: "Field note not found" });
      await fieldNote.deleteOne();
      triggerPusher("bin_updated", {});
      await logActivity(req.user._id, "Field Note Perm Deleted", `Permanently deleted field note "${fieldNote.title}"`);
      return res.json({ message: "Field note permanently deleted" });
    } else if (type === "order") {
      const order = await Order.findById(id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      await Sale.findOneAndDelete({ orderId: id });
      await order.deleteOne();
      triggerPusher("bin_updated", {});
      triggerPusher("sale_deleted", id);
      await logActivity(req.user._id, "Order Perm Deleted", `Permanently deleted order for "${order.productName}"`);
      return res.json({ message: "Order permanently deleted" });
    }
    res.status(400).json({ message: "Invalid record type" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PRODUCT CATALOG CRUD ENDPOINTS ───────────────────────────────────

// Get all products (Public)
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 }).lean();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single product by ID (Public)
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id }).lean();
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Next.js ISR Revalidation Webhook Trigger
async function triggerNextRevalidation(tag = "products", productId = null) {
  const frontendUrl =
    process.env.FRONTEND_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://www.decorktm.com"
      : "http://localhost:3000");
  const secret = process.env.REVALIDATION_SECRET || "ktm_decor_reval_secure_key_2026";
  try {
    const res = await fetch(`${frontendUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ secret, tag, id: productId }),
    });
    if (!res.ok) {
      console.warn(`[ISR Revalidation] Next.js returned status ${res.status}`);
    } else {
      console.log(`[ISR Revalidation] Successfully triggered tag revalidation: ${tag} (ID: ${productId || "all"})`);
    }
  } catch (err) {
    console.warn(`[ISR Revalidation] Could not notify Next.js revalidation at ${frontendUrl}:`, err.message);
  }
}

// Create product (Admin only)
app.post("/api/products", protect, admin, async (req, res) => {
  const {
    name,
    category,
    subCategory,
    price,
    image,
    badge,
    description,
    specs,
    stockStatus,
    image_urls,
  } = req.body;

  try {
    // Generate a unique ID (incremental or timestamp)
    const latestProd = await Product.findOne({}).sort({ createdAt: -1 });
    let newId = "1";
    if (latestProd && !isNaN(parseInt(latestProd.id))) {
      newId = (parseInt(latestProd.id) + 1).toString();
    } else {
      newId = Date.now().toString();
    }

    const product = await Product.create({
      id: newId,
      name,
      category,
      subCategory,
      price: Number(price),
      image,
      badge,
      description,
      specs: Array.isArray(specs) ? specs : [],
      stockStatus: stockStatus || "In Stock",
      image_urls: Array.isArray(image_urls) ? image_urls : [],
    });

    triggerPusher("product_created", product);
    triggerNextRevalidation("products", product.id);
    await logActivity(req.user._id, "Product Created", `Created catalog product "${product.name}"`);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update product (Admin only)
app.put("/api/products/:id", protect, admin, async (req, res) => {
  const {
    name,
    category,
    subCategory,
    price,
    image,
    badge,
    description,
    specs,
    stockStatus,
    image_urls,
  } = req.body;

  try {
    const product = await Product.findOne({ id: req.params.id });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.name = name !== undefined ? name : product.name;
    product.category = category !== undefined ? category : product.category;
    product.subCategory = subCategory !== undefined ? subCategory : product.subCategory;
    product.price = price !== undefined ? Number(price) : product.price;
    product.image = image !== undefined ? image : product.image;
    product.badge = badge !== undefined ? badge : product.badge;
    product.description = description !== undefined ? description : product.description;
    product.specs = specs !== undefined ? (Array.isArray(specs) ? specs : []) : product.specs;
    product.stockStatus = stockStatus !== undefined ? stockStatus : product.stockStatus;
    product.image_urls = image_urls !== undefined ? (Array.isArray(image_urls) ? image_urls : []) : product.image_urls;

    await product.save();

    triggerPusher("product_updated", product);
    triggerNextRevalidation("products", product.id);
    await logActivity(req.user._id, "Product Updated", `Updated catalog product "${product.name}"`);
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete product (Admin only)
app.delete("/api/products/:id", protect, admin, async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await product.deleteOne();

    triggerPusher("product_deleted", req.params.id);
    triggerNextRevalidation("products", req.params.id);
    await logActivity(req.user._id, "Product Deleted", `Deleted catalog product "${product.name}"`);
    res.json({ message: "Product deleted from catalog" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── ORDERS ENDPOINTS ──────────────────────────────────────────

// Get all orders (non-deleted, sorted by creation date descending)
app.get("/api/orders", protect, async (req, res) => {
  try {
    const orders = await Order.find({ deleted: { $ne: true } })
      .populate("createdBy", "name role")
      .populate("assignee", "name email role")
      .sort({ createdAt: -1 })
      .lean();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create manual order (Admin only)
app.post("/api/orders", protect, admin, async (req, res) => {
  const {
    productName,
    size,
    price,
    deliveryPrice,
    installationPrice,
    advancePayment,
    color,
    productImageUrl,
    productImages,
    locationImageUrl,
    locationImages,
    customerName,
    customerContact,
    customerEmail,
    customerAddress,
    orderFrom,
    paymentMethod,
    manufacturingNotes,
    orderDate,
    deliveryDate,
    assignee,
  } = req.body;

  try {
    const pImgs = Array.isArray(productImages) ? productImages.slice(0, 6) : (productImageUrl ? [productImageUrl] : []);
    const lImgs = Array.isArray(locationImages) ? locationImages.slice(0, 4) : (locationImageUrl ? [locationImageUrl] : []);

    const order = await Order.create({
      productName,
      size,
      price: Number(price) || 0,
      deliveryPrice: Number(deliveryPrice) || 0,
      installationPrice: Number(installationPrice) || 0,
      advancePayment: Number(advancePayment) || 0,
      color,
      productImages: pImgs,
      productImageUrl: pImgs[0] || productImageUrl || "",
      locationImages: lImgs,
      locationImageUrl: lImgs[0] || locationImageUrl || "",
      customerName,
      customerContact,
      customerEmail: customerEmail || "",
      customerAddress,
      orderFrom,
      paymentMethod,
      manufacturingNotes: manufacturingNotes || "",
      orderDate: orderDate || new Date(),
      deliveryDate: deliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      assignee: assignee || null,
      createdBy: req.user._id,
    });

    const populatedOrder = await Order.findById(order._id)
      .populate("createdBy", "name role")
      .populate("assignee", "name email role");

    await syncOrderSale(populatedOrder, req.user._id);

    triggerPusher("order_created", populatedOrder);
    await logActivity(req.user._id, "Order Created", `Posted manual order for "${productName}" (Rs. ${populatedOrder.totalPrice.toLocaleString()})`);

    // Create and broadcast notification if assignee is set
    if (order.assignee) {
      const notif = await Notification.create({
        type: "order_assigned",
        message: `New order assigned to you: "${order.productName}" by ${req.user.name}`,
        recipient: order.assignee,
      });
      triggerPusher("receive_notification", notif);
    }

    // Create and broadcast global notification for new order
    const globalOrderNotif = await Notification.create({
      type: "new_order",
      message: `New order: "${productName}" (Client: ${customerName}) created by ${req.user.name}`,
      recipient: null,
    });
    triggerPusher("receive_notification", globalOrderNotif);

    res.status(201).json(populatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update order details (Admin only)
app.put("/api/orders/:id", protect, admin, async (req, res) => {
  const {
    productName,
    size,
    price,
    deliveryPrice,
    installationPrice,
    advancePayment,
    color,
    productImageUrl,
    productImages,
    locationImageUrl,
    locationImages,
    customerName,
    customerContact,
    customerEmail,
    customerAddress,
    orderFrom,
    paymentMethod,
    manufacturingNotes,
    orderDate,
    deliveryDate,
    assignee,
  } = req.body;

  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const oldAssignee = order.assignee ? order.assignee.toString() : null;

    order.productName = productName || order.productName;
    order.size = size || order.size;
    if (price !== undefined) order.price = Number(price) || 0;
    if (deliveryPrice !== undefined) order.deliveryPrice = Number(deliveryPrice) || 0;
    if (installationPrice !== undefined) order.installationPrice = Number(installationPrice) || 0;
    if (advancePayment !== undefined) order.advancePayment = Number(advancePayment) || 0;
    order.color = color || order.color;

    if (productImages !== undefined) {
      order.productImages = Array.isArray(productImages) ? productImages.slice(0, 6) : [];
      order.productImageUrl = order.productImages[0] || "";
    } else if (productImageUrl !== undefined) {
      order.productImageUrl = productImageUrl;
      if (productImageUrl) order.productImages = [productImageUrl];
    }

    if (locationImages !== undefined) {
      order.locationImages = Array.isArray(locationImages) ? locationImages.slice(0, 4) : [];
      order.locationImageUrl = order.locationImages[0] || "";
    } else if (locationImageUrl !== undefined) {
      order.locationImageUrl = locationImageUrl;
      if (locationImageUrl) order.locationImages = [locationImageUrl];
    }
    order.customerName = customerName || order.customerName;
    order.customerContact = customerContact || order.customerContact;
    order.customerEmail = customerEmail !== undefined ? customerEmail : order.customerEmail;
    order.customerAddress = customerAddress || order.customerAddress;
    if (orderDate) order.orderDate = orderDate;
    order.deliveryDate = deliveryDate || order.deliveryDate;
    if (assignee !== undefined) order.assignee = assignee || null;
    order.orderFrom = orderFrom || order.orderFrom;
    order.paymentMethod = paymentMethod || order.paymentMethod;
    if (manufacturingNotes !== undefined) order.manufacturingNotes = manufacturingNotes;

    await order.save();
    await syncOrderSale(order, req.user._id);

    // Send notification if assignee changed and is not null
    const newAssigneeStr = order.assignee ? order.assignee.toString() : null;
    if (newAssigneeStr && newAssigneeStr !== oldAssignee) {
      const notif = await Notification.create({
        type: "order_assigned",
        message: `New order assigned to you: "${order.productName}" by ${req.user.name}`,
        recipient: order.assignee,
      });
      triggerPusher("receive_notification", notif);
    }

    const populatedOrder = await Order.findById(order._id)
      .populate("createdBy", "name role")
      .populate("assignee", "name email role");

    triggerPusher("order_updated", populatedOrder);
    await logActivity(req.user._id, "Order Updated", `Modified details of order for "${order.productName}"`);

    res.json(populatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update order stage/progress (Admin & Staff)
app.put("/api/orders/:id/progress", protect, async (req, res) => {
  const { stage, assignee } = req.body;

  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const oldAssignee = order.assignee ? order.assignee.toString() : null;

    const previousStage = order.stage;
    if (stage) order.stage = stage;
    if (assignee !== undefined) order.assignee = assignee || null;

    // If explicitly moves it to delivered or paid, approve it
    if (stage === "delivered" || stage === "paid") {
      order.approved = true;
      if (!order.approvedAt) order.approvedAt = new Date();
    } else if (stage) {
      // If moving back, unapprove
      order.approved = false;
      order.approvedAt = undefined;
    }

    await order.save();
    await syncOrderSale(order, req.user._id);

    // Send notification if assignee changed and is not null
    const newAssigneeStr = order.assignee ? order.assignee.toString() : null;
    if (newAssigneeStr && newAssigneeStr !== oldAssignee) {
      const notif = await Notification.create({
        type: "order_assigned",
        message: `New order assigned to you: "${order.productName}" by ${req.user.name}`,
        recipient: order.assignee,
      });
      triggerPusher("receive_notification", notif);
    }

    const populatedOrder = await Order.findById(order._id)
      .populate("createdBy", "name role")
      .populate("assignee", "name email role");

    triggerPusher("order_updated", populatedOrder);
    
    let logMsg = `Updated order "${order.productName}"`;
    if (stage && previousStage !== stage) {
      logMsg = `Moved "${order.productName}" from ${previousStage.toUpperCase()} to ${stage.toUpperCase()}`;
    }
    await logActivity(
      req.user._id,
      "Order Progress Updated",
      logMsg
    );

    res.json(populatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve order (Admin only)
app.put("/api/orders/:id/approve", protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.stage = "delivered";
    order.approved = true;
    order.approvedAt = new Date();

    await order.save();
    await syncOrderSale(order, req.user._id);

    const populatedOrder = await Order.findById(order._id)
      .populate("createdBy", "name role")
      .populate("assignee", "name email role");

    triggerPusher("order_updated", populatedOrder);
    await logActivity(req.user._id, "Order Approved", `Approved order for "${order.productName}". Product revenue Rs. ${(Number(order.price) || 0).toLocaleString()} added to Sales.`);

    res.json(populatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete order (Admin only, soft-delete)
app.delete("/api/orders/:id", protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.deleted = true;
    order.deletedAt = new Date();
    order.approved = false; // remove sale association
    await order.save();
    await syncOrderSale(order, req.user._id);

    triggerPusher("order_deleted", req.params.id);
    triggerPusher("bin_updated", {});
    await logActivity(req.user._id, "Order Deleted", `Deleted order for "${order.productName}"`);

    res.json({ message: "Order soft-deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// SALES ROUTES
// ==========================================
app.get("/api/sales", protect, admin, async (req, res) => {
  try {
    const sales = await Sale.find({}).populate("createdBy", "name role").populate("orderId").sort({ date: -1 }).lean();
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/sales", protect, admin, async (req, res) => {
  const { clientName, productName, amount, date, paymentMethod, notes } = req.body;
  try {
    const sale = new Sale({
      clientName,
      productName,
      amount: Number(amount) || 0,
      date: date || new Date(),
      paymentMethod,
      notes,
      createdBy: req.user._id,
    });
    await sale.save();

    const populatedSale = {
      ...sale.toObject(),
      createdBy: { _id: req.user._id, name: req.user.name, role: req.user.role }
    };
    triggerPusher("sale_created", populatedSale);
    logActivity(req.user, "Sale Logged", `Logged direct sale to "${clientName}" for "${productName}" (Rs. ${Number(amount).toLocaleString()})`);

    res.status(201).json(populatedSale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/sales/:id", protect, admin, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: "Sale not found" });
    await Sale.findByIdAndDelete(req.params.id);
    triggerPusher("sale_deleted", req.params.id);
    logActivity(req.user, "Sale Deleted", `Deleted sale log for "${sale.productName}"`);
    res.json({ message: "Sale deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin route to resynchronize all order sales in MongoDB with base product prices (excluding delivery and fitting)
app.post("/api/admin/resync-sales", protect, admin, async (req, res) => {
  try {
    const orders = await Order.find({});
    let updatedCount = 0;
    let createdCount = 0;
    let deletedCount = 0;

    for (const order of orders) {
      if (order.deleted) {
        const deletedSale = await Sale.findOneAndDelete({ orderId: order._id });
        if (deletedSale) deletedCount++;
      } else {
        const productPrice = Number(order.price) || 0;
        const orderDateToUse = order.orderDate || order.createdAt || new Date();
        const existingSale = await Sale.findOne({ orderId: order._id });

        if (!existingSale) {
          await Sale.create({
            clientName: order.customerName,
            productName: order.productName,
            amount: productPrice,
            date: orderDateToUse,
            paymentMethod: order.paymentMethod || "cash",
            notes: order.manufacturingNotes || `Automatic sale from order: ${order.productName}`,
            createdBy: order.createdBy,
            orderId: order._id
          });
          createdCount++;
        } else {
          let needsSave = false;
          if (existingSale.amount !== productPrice) {
            existingSale.amount = productPrice;
            needsSave = true;
          }
          if (orderDateToUse && (!existingSale.date || new Date(existingSale.date).getTime() !== new Date(orderDateToUse).getTime())) {
            existingSale.date = orderDateToUse;
            needsSave = true;
          }
          if (needsSave) {
            await existingSale.save();
            updatedCount++;
          }
        }
      }
    }

    // Immediately flush Redis cache for all users
    await cacheDeletePattern("bootstrap:*");

    const refreshedSales = await Sale.find({})
      .populate("createdBy", "name role")
      .populate("orderId", "customerName price totalPrice deliveryPrice installationPrice stage status orderDate")
      .sort({ date: -1 })
      .lean();

    res.json({
      message: `Successfully synchronized sales ledger: ${updatedCount} updated, ${createdCount} created, ${deletedCount} removed.`,
      updatedCount,
      createdCount,
      deletedCount,
      sales: refreshedSales
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Also support GET for convenient browser execution by admin
app.get("/api/admin/resync-sales", protect, admin, async (req, res) => {
  try {
    const orders = await Order.find({});
    let updatedCount = 0;
    let createdCount = 0;
    let deletedCount = 0;

    for (const order of orders) {
      if (order.deleted) {
        const deletedSale = await Sale.findOneAndDelete({ orderId: order._id });
        if (deletedSale) deletedCount++;
      } else {
        const productPrice = Number(order.price) || 0;
        const orderDateToUse = order.orderDate || order.createdAt || new Date();
        const existingSale = await Sale.findOne({ orderId: order._id });

        if (!existingSale) {
          await Sale.create({
            clientName: order.customerName,
            productName: order.productName,
            amount: productPrice,
            date: orderDateToUse,
            paymentMethod: order.paymentMethod || "cash",
            notes: order.manufacturingNotes || `Automatic sale from order: ${order.productName}`,
            createdBy: order.createdBy,
            orderId: order._id
          });
          createdCount++;
        } else {
          let needsSave = false;
          if (existingSale.amount !== productPrice) {
            existingSale.amount = productPrice;
            needsSave = true;
          }
          if (orderDateToUse && (!existingSale.date || new Date(existingSale.date).getTime() !== new Date(orderDateToUse).getTime())) {
            existingSale.date = orderDateToUse;
            needsSave = true;
          }
          if (needsSave) {
            await existingSale.save();
            updatedCount++;
          }
        }
      }
    }

    await cacheDeletePattern("bootstrap:*");

    const refreshedSales = await Sale.find({})
      .populate("createdBy", "name role")
      .populate("orderId", "customerName price totalPrice deliveryPrice installationPrice stage status orderDate")
      .sort({ date: -1 })
      .lean();

    res.json({
      message: `Successfully synchronized sales ledger: ${updatedCount} updated, ${createdCount} created, ${deletedCount} removed.`,
      updatedCount,
      createdCount,
      deletedCount,
      sales: refreshedSales
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// EXPENSES ROUTES
// ==========================================
app.get("/api/expenses", protect, admin, async (req, res) => {
  try {
    const expenses = await Expense.find({}).populate("createdBy", "name role").sort({ date: -1 }).lean();
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/expenses", protect, admin, async (req, res) => {
  const { title, category, amount, date, description } = req.body;
  try {
    const expense = new Expense({
      title,
      category,
      amount: Number(amount) || 0,
      date: date || new Date(),
      description,
      createdBy: req.user._id,
    });
    await expense.save();

    const populatedExpense = {
      ...expense.toObject(),
      createdBy: { _id: req.user._id, name: req.user.name, role: req.user.role }
    };
    triggerPusher("expense_created", populatedExpense);
    logActivity(req.user, "Expense Logged", `Logged expense "${title}" (Rs. ${Number(amount).toLocaleString()})`);

    res.status(201).json(populatedExpense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/expenses/:id", protect, admin, async (req, res) => {
  const { title, category, amount, date, description } = req.body;
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    if (title !== undefined) expense.title = title;
    if (category !== undefined) expense.category = category;
    if (amount !== undefined) expense.amount = Number(amount) || 0;
    if (date !== undefined) expense.date = date;
    if (description !== undefined) expense.description = description;

    await expense.save();

    const populatedExpense = {
      ...expense.toObject(),
      createdBy: { _id: req.user._id, name: req.user.name, role: req.user.role }
    };
    triggerPusher("expense_updated", populatedExpense);
    logActivity(req.user, "Expense Updated", `Updated expense log "${expense.title}" (Rs. ${expense.amount.toLocaleString()})`);

    res.json(populatedExpense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/expenses/:id", protect, admin, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    await Expense.findByIdAndDelete(req.params.id);
    triggerPusher("expense_deleted", req.params.id);
    logActivity(req.user, "Expense Deleted", `Deleted expense log for "${expense.title}"`);
    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// PURCHASE ROUTES
// ==========================================
app.get("/api/purchases", protect, admin, async (req, res) => {
  try {
    const purchases = await Purchase.find({}).populate("createdBy", "name role").sort({ date: -1 }).lean();
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/purchases", protect, admin, async (req, res) => {
  const { supplier, itemDetails, amount, date, status, items } = req.body;
  try {
    const purchase = new Purchase({
      supplier,
      itemDetails,
      amount: Number(amount) || 0,
      date: date || new Date(),
      status: status || "pending",
      items: items || [],
      createdBy: req.user._id,
    });
    await purchase.save();

    const populatedPurchase = {
      ...purchase.toObject(),
      createdBy: { _id: req.user._id, name: req.user.name, role: req.user.role }
    };
    triggerPusher("purchase_created", populatedPurchase);
    logActivity(req.user, "Purchase Logged", `Logged purchase from "${supplier}" (Rs. ${Number(amount).toLocaleString()})`);

    res.status(201).json(populatedPurchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/purchases/:id", protect, admin, async (req, res) => {
  const { supplier, itemDetails, amount, date, status, items } = req.body;
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: "Purchase not found" });
    
    if (supplier !== undefined) purchase.supplier = supplier;
    if (itemDetails !== undefined) purchase.itemDetails = itemDetails;
    if (amount !== undefined) purchase.amount = Number(amount) || 0;
    if (date !== undefined) purchase.date = date;
    if (status !== undefined) purchase.status = status;
    if (items !== undefined) purchase.items = items;
    
    await purchase.save();

    const populatedPurchase = {
      ...purchase.toObject(),
      createdBy: { _id: req.user._id, name: req.user.name, role: req.user.role }
    };
    triggerPusher("purchase_updated", populatedPurchase);
    logActivity(req.user, "Purchase Updated", `Updated purchase details for "${purchase.supplier}" (Rs. ${purchase.amount.toLocaleString()})`);

    res.json(populatedPurchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/purchases/:id", protect, admin, async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: "Purchase not found" });
    await Purchase.findByIdAndDelete(req.params.id);
    triggerPusher("purchase_deleted", req.params.id);
    logActivity(req.user, "Purchase Deleted", `Deleted purchase from "${purchase.supplier}"`);
    res.json({ message: "Purchase deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// INVENTORY ROUTES
// ==========================================
app.get("/api/inventory", protect, async (req, res) => {
  try {
    const items = await InventoryItem.find({}).populate("createdBy", "name role").sort({ name: 1 }).lean();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/inventory", protect, admin, async (req, res) => {
  const { name, category, quantity, unit, alertLevel } = req.body;
  try {
    const item = new InventoryItem({
      name,
      category,
      quantity: Number(quantity) || 0,
      unit,
      alertLevel: Number(alertLevel) || 5,
      createdBy: req.user._id,
    });
    await item.save();

    const populatedItem = {
      ...item.toObject(),
      createdBy: { _id: req.user._id, name: req.user.name, role: req.user.role }
    };
    triggerPusher("inventory_created", populatedItem);
    logActivity(req.user, "Inventory Item Added", `Added inventory item "${name}" (${quantity} ${unit})`);

    res.status(201).json(populatedItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/inventory/:id", protect, admin, async (req, res) => {
  const { name, category, quantity, unit, alertLevel } = req.body;
  try {
    const item = await InventoryItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Inventory item not found" });

    if (name !== undefined) item.name = name;
    if (category !== undefined) item.category = category;
    if (quantity !== undefined) item.quantity = Number(quantity);
    if (unit !== undefined) item.unit = unit;
    if (alertLevel !== undefined) item.alertLevel = Number(alertLevel);

    await item.save();

    const populatedItem = await InventoryItem.findById(item._id).populate("createdBy", "name role");
    triggerPusher("inventory_updated", populatedItem);

    res.json(populatedItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/inventory/:id", protect, admin, async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Inventory item not found" });
    await InventoryItem.findByIdAndDelete(req.params.id);
    triggerPusher("inventory_deleted", req.params.id);
    await logActivity(req.user._id, "Inventory Item Deleted", `Deleted inventory item "${item.name}"`);
    res.json({ message: "Inventory item deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// QUOTATION ROUTES
// ==========================================
app.get("/api/quotations", protect, admin, async (req, res) => {
  try {
    const quotations = await Quotation.find({}).populate("createdBy", "name role").sort({ date: -1 }).lean();
    res.json(quotations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/quotations", protect, admin, async (req, res) => {
  try {
    const { clientName, clientEmail, clientContact, projectName, items, discount, tax, grandTotal, status, date, voucherNo, voucherDate, amountInWords, remarks } = req.body || {};
    const quotation = new Quotation({
      clientName,
      clientEmail,
      clientContact,
      projectName,
      items,
      discount: Number(discount) || 0,
      tax: Number(tax) || 0,
      grandTotal: Number(grandTotal) || 0,
      status: status || "draft",
      date: date || new Date(),
      voucherNo,
      voucherDate,
      amountInWords,
      remarks,
      createdBy: req.user._id,
    });
    await quotation.save();

    const populatedQuotation = await Quotation.findById(quotation._id).populate("createdBy", "name role");
    triggerPusher("quotation_created", populatedQuotation);
    await logActivity(req.user._id, "Quotation Created", `Generated quotation for "${clientName}" on project "${projectName}" (Total: Rs. ${Number(grandTotal).toLocaleString()})`);

    res.status(201).json(populatedQuotation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/quotations/:id", protect, admin, async (req, res) => {
  try {
    const { status, clientName, clientEmail, clientContact, projectName, voucherNo, voucherDate, items, discount, tax, amountInWords, remarks, grandTotal } = req.body || {};
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });

    if (clientName !== undefined) quotation.clientName = clientName;
    if (clientEmail !== undefined) quotation.clientEmail = clientEmail;
    if (clientContact !== undefined) quotation.clientContact = clientContact;
    if (projectName !== undefined) quotation.projectName = projectName;
    if (voucherNo !== undefined) quotation.voucherNo = voucherNo;
    if (voucherDate !== undefined) quotation.voucherDate = voucherDate;
    if (items !== undefined) quotation.items = items;
    if (discount !== undefined) quotation.discount = discount;
    if (tax !== undefined) quotation.tax = tax;
    if (amountInWords !== undefined) quotation.amountInWords = amountInWords;
    if (remarks !== undefined) quotation.remarks = remarks;
    if (grandTotal !== undefined) quotation.grandTotal = grandTotal;
    if (status !== undefined) quotation.status = status;

    await quotation.save();

    const populatedQuotation = await Quotation.findById(quotation._id).populate("createdBy", "name role");
    triggerPusher("quotation_updated", populatedQuotation);
    await logActivity(req.user._id, "Quotation Updated", `Updated quotation details for "${quotation.clientName}" on project "${quotation.projectName}"`);

    res.json(populatedQuotation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/quotations/:id", protect, admin, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    await Quotation.findByIdAndDelete(req.params.id);
    triggerPusher("quotation_deleted", req.params.id);
    await logActivity(req.user._id, "Quotation Deleted", `Deleted quotation for "${quotation.clientName}"`);
    res.json({ message: "Quotation deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get chronological activity log
app.get("/api/activities", protect, async (req, res) => {
  try {
    const activities = await ActivityLog.find({})
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Quick-Notes support
app.get("/api/notes", protect, async (req, res) => {
  try {
    const notes = await QuickNote.find({}).populate("createdBy", "name role").sort({ createdAt: -1 }).lean();
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/notes", protect, async (req, res) => {
  const { text } = req.body;
  try {
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Note text is required" });
    }
    const note = new QuickNote({
      text: text.trim(),
      createdBy: req.user._id,
    });
    await note.save();

    const populatedNote = await QuickNote.findById(note._id).populate("createdBy", "name role");

    // Broadcast to everyone via Pusher!
    triggerPusher("note_created", populatedNote);

    // Create and broadcast global notification for new note
    const globalNoteNotif = await Notification.create({
      type: "new_quick_note",
      message: `New note: "${text.trim()}" by ${req.user.name}`,
      recipient: null,
    });
    triggerPusher("receive_notification", globalNoteNotif);

    res.status(201).json(populatedNote);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/notes/:id", protect, async (req, res) => {
  try {
    const note = await QuickNote.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    // Authorization: Admin can delete any note, staff can only delete notes they created.
    if (req.user.role !== "admin" && note.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this note" });
    }

    await QuickNote.deleteOne({ _id: req.params.id });

    // Broadcast delete event via Pusher!
    triggerPusher("note_deleted", req.params.id);

    res.json({ message: "Note deleted successfully", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Nepali calendar month names
const NEPALI_MONTH_NAMES = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
];

// Helper to format Nepali month and year label
function getNepaliMonthLabel(month, year) {
  const mIdx = parseInt(month, 10) - 1;
  const mName = NEPALI_MONTH_NAMES[mIdx] || `Month ${month}`;
  return `${mName} ${year} BS`;
}

// Helper to get previous Nepali month and year (1-based month, BS year)
function getPreviousNepaliMonthAndYear(offsetMonths = 1) {
  const nd = new NepaliDate();
  let mIdx = nd.getMonth(); // 0 to 11
  let year = nd.getYear();

  for (let i = 0; i < offsetMonths; i++) {
    if (mIdx === 0) {
      mIdx = 11;
      year -= 1;
    } else {
      mIdx -= 1;
    }
  }
  return { month: mIdx + 1, year };
}

// Helper to generate CSV text content for a statement type, month, and year using dry exportService
async function generateStatementCSVText(type, month, year) {
  const { workbook } = await buildStatementWorkbook(type, month, year);
  const csvBuffer = await workbook.csv.writeBuffer();
  return csvBuffer.toString("utf-8");
}

// Function to generate and save missing statements for past completed Nepali months (BS)
async function generateMissingNepaliMonthStatements(monthsBack = 4) {
  const types = ["sales", "expenses", "purchases", "all"];

  // Clean up any obsolete statements generated for Gregorian calendar periods (year < 2070)
  try {
    await MonthlyStatement.deleteMany({ year: { $lt: 2070 } });
  } catch (cleanErr) {
    console.warn("Could not clean old Gregorian statements:", cleanErr.message);
  }

  for (let offset = 1; offset <= monthsBack; offset++) {
    const { month, year } = getPreviousNepaliMonthAndYear(offset);
    const monthLabel = NEPALI_MONTH_NAMES[month - 1];

    for (const type of types) {
      const exists = await MonthlyStatement.findOne({ month, year, type });
      if (!exists) {
        try {
          const csvText = await generateStatementCSVText(type, month, year);
          const prefix = type === "all" ? "combined" : type;
          const filename = `${prefix}_statement_${monthLabel}_${year}_BS.csv`;
          
          await MonthlyStatement.create({
            month,
            year,
            type,
            filename,
            content: csvText
          });
          console.log(`Auto-generated Nepali BS monthly statement: ${filename}`);
        } catch (err) {
          console.error(`Error generating auto Nepali monthly statement for ${type} (${monthLabel} ${year} BS):`, err);
        }
      }
    }
  }
}

// Cron job endpoint to trigger statement generation stateless-ly (triggered by Vercel Cron or external scheduler)
app.get("/api/cron/generate-statements", async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  const isVercelCron = req.headers["x-vercel-cron"] === "1";
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isVercelCron) {
    return res.status(401).json({ message: "Unauthorized cron trigger" });
  }

  try {
    await generateMissingNepaliMonthStatements(4);
    res.json({ message: "Nepali monthly statements checked and generated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get structured statement data for interactive/printable PDF preview modal (Admin only)
app.get("/api/export/statement-data", protect, admin, async (req, res) => {
  const currentBsYear = new NepaliDate().getYear().toString();
  const { type = "all", month = "all", year = currentBsYear } = req.query;

  try {
    const data = await getStatementData(type, month, year);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get structured statement data for an archive by ID (Admin only)
app.get("/api/export/archive-data/:id", protect, admin, async (req, res) => {
  try {
    const statement = await MonthlyStatement.findById(req.params.id);
    if (!statement) {
      return res.status(404).json({ message: "Statement archive not found" });
    }
    const data = await getStatementData(statement.type, statement.month.toString(), statement.year.toString());
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export monthly or all-time statements (Admin only) - Beautifully formatted with ExcelJS
app.get("/api/export/statement", protect, admin, async (req, res) => {
  const currentBsYear = new NepaliDate().getYear().toString();
  const { type = "all", month = "all", year = currentBsYear } = req.query;

  try {
    const { workbook, periodLabel } = await buildStatementWorkbook(type, month, year);
    
    let filename;
    if (type === "all") {
      filename = `combined_statement_${periodLabel}.csv`;
    } else {
      filename = `${type}_statement_${periodLabel}.csv`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    await workbook.csv.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all archived monthly statements (Admin only)
app.get("/api/export/archives", protect, admin, async (req, res) => {
  try {
    // Lazy check: trigger auto-generator for past completed Nepali months if missing
    await generateMissingNepaliMonthStatements(4);
    
    // Fetch statement metadata, strictly for BS years, excluding content field
    const archives = await MonthlyStatement.find({ year: { $gte: 2070 } })
      .select("-content")
      .sort({ year: -1, month: -1, type: 1 });
      
    res.json(archives);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Download specific monthly statement archive by ID (Admin only)
app.get("/api/export/archive/:id", protect, admin, async (req, res) => {
  try {
    const statement = await MonthlyStatement.findById(req.params.id);
    if (!statement) {
      return res.status(404).json({ message: "Statement archive not found" });
    }
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${statement.filename}`);
    res.send(statement.content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export inventory data as CSV (Any authenticated staff/admin can download) - Updated to ExcelJS
app.get("/api/export/inventory", protect, async (req, res) => {
  try {
    const items = await InventoryItem.find({}).sort({ name: 1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Inventory");

    sheet.columns = [
      { header: "S.N.", key: "sn", width: 8 },
      { header: "Item Name", key: "name", width: 25 },
      { header: "Category", key: "category", width: 18 },
      { header: "Quantity", key: "quantity", width: 12 },
      { header: "Unit", key: "unit", width: 10 },
      { header: "Alert Level", key: "alertLevel", width: 12 },
      { header: "Status", key: "status", width: 15 },
      { header: "Last Updated", key: "lastUpdated", width: 15 }
    ];

    items.forEach((item, idx) => {
      sheet.addRow({
        sn: idx + 1,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        alertLevel: item.alertLevel,
        status: item.quantity === 0 ? "OUT OF STOCK" : item.quantity <= item.alertLevel ? "LOW STOCK" : "IN STOCK",
        lastUpdated: new Date(item.updatedAt).toLocaleDateString()
      });
    });

    const filename = `Inventory_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    await workbook.csv.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── ATTENDANCE ENDPOINTS ──────────────────────────────────────

// Get attendance logs
app.get("/api/attendance", protect, async (req, res) => {
  const { userId, month, year } = req.query;
  try {
    let query = {};

    // Determine target user
    let targetUserId = req.user._id;
    if (req.user.role === "admin" || req.user.email === SHARED_STAFF_EMAIL) {
      if (userId) {
        targetUserId = new mongoose.Types.ObjectId(userId);
      } else if (req.user.role !== "admin") {
        return res.status(400).json({ message: "userId is required for staff persona query" });
      } else {
        // Admin querying without userId: fetch all attendance
        targetUserId = null;
      }
    } else {
      // Direct staff role is forced to their own ID
      targetUserId = req.user._id;
    }

    if (targetUserId) {
      query.user = targetUserId;
    }

    // Filter by month/year if provided
    if (month && year) {
      const parsedMonth = parseInt(month, 10);
      const parsedYear = parseInt(year, 10);

      if (parsedYear >= 2070 && parsedYear <= 2100) {
        // Nepali Bikram Sambat (BS) month range
        try {
          const bsStart = new NepaliDate(parsedYear, parsedMonth - 1, 1).toJsDate();
          bsStart.setHours(0, 0, 0, 0);

          const nextMonth = parsedMonth === 12 ? 1 : parsedMonth + 1;
          const nextYear = parsedMonth === 12 ? parsedYear + 1 : parsedYear;
          const bsEnd = new NepaliDate(nextYear, nextMonth - 1, 1).toJsDate();
          bsEnd.setHours(0, 0, 0, 0);

          query.date = { $gte: bsStart, $lt: bsEnd };
        } catch {
          const startDate = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1));
          const endDate = new Date(Date.UTC(parsedYear, parsedMonth, 1));
          query.date = { $gte: startDate, $lt: endDate };
        }
      } else {
        const startDate = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1));
        const endDate = new Date(Date.UTC(parsedYear, parsedMonth, 1));
        query.date = { $gte: startDate, $lt: endDate };
      }
    }

    const logs = await Attendance.find(query)
      .populate("user", "name email role baseSalary")
      .sort({ date: 1 })
      .lean();
      
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create or update daily attendance log
app.post("/api/attendance", protect, validate(attendanceSchema), async (req, res) => {
  const { user: reqUser, date: reqDate, status, checkIn, checkOut, notes } = req.body;
  try {
    let targetUserId = req.user._id;

    // Authorization check: only admin or shared-staff can log attendance for others
    if (reqUser && reqUser !== req.user._id.toString()) {
      if (req.user.role === "admin" || req.user.email === SHARED_STAFF_EMAIL) {
        targetUserId = new mongoose.Types.ObjectId(reqUser);
      } else {
        return res.status(403).json({ message: "Not authorized to log attendance for other users" });
      }
    }

    // Normalize date to midnight UTC
    const normalizedDate = new Date(reqDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    // Check if record already exists for this user and date
    let attendance = await Attendance.findOne({ user: targetUserId, date: normalizedDate });

    if (attendance) {
      // Update existing record
      attendance.status = status || attendance.status;
      if (req.body.hasOwnProperty("checkIn")) {
        attendance.checkIn = checkIn ? new Date(checkIn) : undefined;
      }
      if (req.body.hasOwnProperty("checkOut")) {
        attendance.checkOut = checkOut ? new Date(checkOut) : undefined;
      }
      attendance.notes = notes !== undefined ? notes : attendance.notes;
      await attendance.save();
    } else {
      // Create new record
      attendance = new Attendance({
        user: targetUserId,
        date: normalizedDate,
        status,
        checkIn: checkIn ? new Date(checkIn) : undefined,
        checkOut: checkOut ? new Date(checkOut) : undefined,
        notes,
      });
      await attendance.save();
    }

    const populatedAttendance = await Attendance.findById(attendance._id).populate(
      "user",
      "name email role baseSalary"
    );

    // Sync in real-time
    triggerPusher("attendance_updated", populatedAttendance);

    // Log Activity
    const dateStr = normalizedDate.toLocaleDateString();
    await logActivity(
      req.user._id,
      "Attendance Logged",
      `Logged attendance for ${populatedAttendance.user?.name || "Staff"} on ${dateStr} as ${status.toUpperCase()}`
    );

    res.status(201).json(populatedAttendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update attendance record (Admin only)
app.put("/api/attendance/:id", protect, admin, validate(updateAttendanceSchema), async (req, res) => {
  const { status, checkIn, checkOut, notes } = req.body;
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    attendance.status = status || attendance.status;
    if (req.body.hasOwnProperty("checkIn")) {
      attendance.checkIn = checkIn ? new Date(checkIn) : undefined;
    }
    if (req.body.hasOwnProperty("checkOut")) {
      attendance.checkOut = checkOut ? new Date(checkOut) : undefined;
    }
    attendance.notes = notes !== undefined ? notes : attendance.notes;

    await attendance.save();

    const populatedAttendance = await Attendance.findById(attendance._id).populate(
      "user",
      "name email role baseSalary"
    );

    // Sync in real-time
    triggerPusher("attendance_updated", populatedAttendance);

    // Log Activity
    const dateStr = new Date(attendance.date).toLocaleDateString();
    await logActivity(
      req.user._id,
      "Attendance Updated",
      `Updated attendance for ${populatedAttendance.user?.name || "Staff"} on ${dateStr} to ${status.toUpperCase()}`
    );

    res.json(populatedAttendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete attendance record (Admin only)
app.delete("/api/attendance/:id", protect, admin, async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id).populate("user", "name");
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    await Attendance.findByIdAndDelete(req.params.id);

    // Sync in real-time
    triggerPusher("attendance_deleted", req.params.id);

    // Log Activity
    const dateStr = new Date(attendance.date).toLocaleDateString();
    await logActivity(
      req.user._id,
      "Attendance Deleted",
      `Deleted attendance record for ${attendance.user?.name || "Staff"} on ${dateStr}`
    );

    res.json({ message: "Attendance record deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── SALARY ENDPOINTS ──────────────────────────────────────────

// Get salary records
app.get("/api/salaries", protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== "admin" && req.user.email !== SHARED_STAFF_EMAIL) {
      query = { user: req.user._id };
    }
    const salaries = await Salary.find(query)
      .populate("user", "name email role baseSalary")
      .populate("createdBy", "name role")
      .sort({ year: -1, month: -1 })
      .lean();
    res.json(salaries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Process/Create a salary record (Admin only)
app.post("/api/salaries", protect, admin, validate(createSalarySchema), async (req, res) => {
  const {
    user,
    month,
    year,
    baseSalary,
    presentDays,
    absentDays,
    bonus,
    deductions,
    calculatedSalary,
    finalSalary,
    status,
    paymentDate,
    paymentMethod,
    notes,
  } = req.body;

  try {
    // Check if salary record already exists
    const exists = await Salary.findOne({ user, month, year });
    if (exists) {
      return res.status(400).json({ message: "Salary record already processed for this staff member in the specified month." });
    }

    const staffUser = await User.findById(user);
    if (!staffUser) {
      return res.status(404).json({ message: "Staff user not found" });
    }

    let newExpense = null;
    if (status === "paid") {
      const monthLabel = getNepaliMonthLabel(month, year);
      newExpense = new Expense({
        title: `Salary Payment - ${staffUser.name} (${monthLabel})`,
        category: "salary",
        amount: finalSalary,
        date: paymentDate ? new Date(paymentDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        description: `Salary payment for ${staffUser.name} (${monthLabel}). Present: ${presentDays} days, Absent: ${absentDays} days. Note: ${notes || "None"}`,
        createdBy: req.user._id,
      });
      await newExpense.save();
      triggerPusher("expense_created", newExpense);
    }

    const salary = new Salary({
      user,
      month,
      year,
      baseSalary,
      presentDays,
      absentDays,
      bonus,
      deductions,
      calculatedSalary,
      finalSalary,
      status,
      paymentDate: status === "paid" ? (paymentDate ? new Date(paymentDate) : new Date()) : undefined,
      paymentMethod: status === "paid" ? paymentMethod : undefined,
      notes,
      linkedExpense: newExpense ? newExpense._id : undefined,
      createdBy: req.user._id,
    });

    await salary.save();

    const populatedSalary = await Salary.findById(salary._id)
      .populate("user", "name email role baseSalary")
      .populate("createdBy", "name role");

    // Sync in real-time
    triggerPusher("salary_created", populatedSalary);

    // Log Activity
    const monthLabel = getNepaliMonthLabel(month, year);
    await logActivity(
      req.user._id,
      "Salary Generated",
      `Generated ${status.toUpperCase()} salary of Rs. ${finalSalary.toLocaleString()} for ${staffUser.name} for ${monthLabel}`
    );

    res.status(201).json(populatedSalary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a salary record (Admin only)
app.put("/api/salaries/:id", protect, admin, validate(updateSalarySchema), async (req, res) => {
  const { bonus, deductions, finalSalary, status, paymentDate, paymentMethod, notes } = req.body;
  try {
    const salary = await Salary.findById(req.params.id);
    if (!salary) {
      return res.status(404).json({ message: "Salary record not found" });
    }

    const staffUser = await User.findById(salary.user);
    if (!staffUser) {
      return res.status(404).json({ message: "Staff user not found" });
    }

    const oldStatus = salary.status;
    const oldExpenseId = salary.linkedExpense;

    // Update core fields
    if (bonus !== undefined) salary.bonus = bonus;
    if (deductions !== undefined) salary.deductions = deductions;
    if (finalSalary !== undefined) salary.finalSalary = finalSalary;
    if (status !== undefined) salary.status = status;
    if (notes !== undefined) salary.notes = notes;

    const monthLabel = getNepaliMonthLabel(salary.month, salary.year);

    let newExpenseId = oldExpenseId;

    if (salary.status === "paid") {
      salary.paymentDate = paymentDate ? new Date(paymentDate) : (salary.paymentDate || new Date());
      if (paymentMethod) salary.paymentMethod = paymentMethod;

      const expenseDate = salary.paymentDate.toISOString().split("T")[0];
      const expenseTitle = `Salary Payment - ${staffUser.name} (${monthLabel})`;
      const expenseDesc = `Salary payment for ${staffUser.name} (${monthLabel}). Present: ${salary.presentDays} days, Absent: ${salary.absentDays} days. Note: ${salary.notes || "None"}`;

      if (oldStatus === "pending") {
        // Transition from pending to paid: Create new expense
        const newExpense = new Expense({
          title: expenseTitle,
          category: "salary",
          amount: salary.finalSalary,
          date: expenseDate,
          description: expenseDesc,
          createdBy: req.user._id,
        });
        await newExpense.save();
        newExpenseId = newExpense._id;
        triggerPusher("expense_created", newExpense);
      } else if (oldExpenseId) {
        // Stay paid, update existing expense
        const existingExpense = await Expense.findById(oldExpenseId);
        if (existingExpense) {
          existingExpense.amount = salary.finalSalary;
          existingExpense.date = expenseDate;
          existingExpense.description = expenseDesc;
          existingExpense.title = expenseTitle;
          await existingExpense.save();
          triggerPusher("expense_updated", existingExpense);
        }
      }
    } else {
      // Status is pending
      salary.paymentDate = undefined;
      salary.paymentMethod = undefined;
      newExpenseId = undefined;

      if (oldStatus === "paid" && oldExpenseId) {
        // Transition from paid to pending: Delete old expense
        await Expense.findByIdAndDelete(oldExpenseId);
        newExpenseId = undefined;
        triggerPusher("expense_deleted", oldExpenseId);
      }
    }

    salary.linkedExpense = newExpenseId;
    await salary.save();

    const populatedSalary = await Salary.findById(salary._id)
      .populate("user", "name email role baseSalary")
      .populate("createdBy", "name role");

    // Sync in real-time
    triggerPusher("salary_updated", populatedSalary);

    // Log Activity
    await logActivity(
      req.user._id,
      "Salary Updated",
      `Updated salary details for ${staffUser.name} for ${monthLabel} (Status: ${salary.status.toUpperCase()})`
    );

    res.json(populatedSalary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a salary record (Admin only)
app.delete("/api/salaries/:id", protect, admin, async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.id);
    if (!salary) {
      return res.status(404).json({ message: "Salary record not found" });
    }

    const staffUser = await User.findById(salary.user);
    const monthLabel = getNepaliMonthLabel(salary.month, salary.year);

    if (salary.linkedExpense) {
      await Expense.findByIdAndDelete(salary.linkedExpense);
      triggerPusher("expense_deleted", salary.linkedExpense);
    }

    await Salary.findByIdAndDelete(req.params.id);

    // Sync in real-time
    triggerPusher("salary_deleted", req.params.id);

    // Log Activity
    await logActivity(
      req.user._id,
      "Salary Deleted",
      `Deleted salary record for ${staffUser?.name || "Staff"} for ${monthLabel}`
    );

    res.json({ message: "Salary record deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Conditionally start Express server locally (not in serverless environment)
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  connectDB()
    .then(() => {
      runSeeds()
        .then(() => backfillOrderSales())
        .then(() => {
          app.listen(PORT, () => {
            console.log(`Local Express Server running on port ${PORT}`);
          });
        });
    })
    .catch((err) => {
      console.error("Failed to start local database/server:", err);
    });
}

// For long-running instances: check and generate missing statements every 24 hours
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  setInterval(() => {
    if (mongoose.connection?.readyState === 1) {
      generateMissingNepaliMonthStatements(4).catch((err) => {
        console.error("Interval auto statement generation error:", err);
      });
    }
  }, 24 * 60 * 60 * 1000);
}

// Global error handling middleware
app.use(errorHandler);

export default app;
