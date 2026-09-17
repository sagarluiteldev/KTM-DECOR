import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import User from "../models/User.js";
import Product from "../models/Product.js";
import InventoryItem from "../models/InventoryItem.js";
import Order from "../models/Order.js";
import Sale from "../models/Sale.js";

import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SHARED_STAFF_EMAIL = process.env.SHARED_STAFF_EMAIL || "staff@ktmdecor.com";

// ─── FAST PASSWORD SYNC ────────────────────────────────────────
// Instead of bcrypt.compare() (~400ms per call), we use a fast SHA-256 fingerprint
// of the env password. If the fingerprint matches, the password hasn't changed.
// This saves ~2-4 seconds on cold starts (11 users × 400ms = 4.4s saved).
const getPasswordFingerprint = (password) => {
  if (!password) return "";
  return crypto.createHash("sha256").update(password).digest("hex").slice(0, 16);
};

const syncPasswordIfNeeded = async (user, envPassword) => {
  if (!envPassword) return false;
  
  // Fast check: compare SHA-256 fingerprint instead of bcrypt
  const envFingerprint = getPasswordFingerprint(envPassword);
  if (user.passwordSyncHash === envFingerprint) {
    return false; // Password unchanged, skip expensive bcrypt rehash
  }
  
  // Password changed — update with bcrypt hash (via pre-save hook) + store fingerprint
  user.password = envPassword;
  user.passwordSyncHash = envFingerprint;
  await user.save();
  console.log(`  ↳ Password synced for ${user.email}`);
  return true;
};

export const seedUsers = async () => {
  try {
    // Delete old test users
    await User.deleteMany({ email: { $in: ["rohan@ktmdecor.com", "anjali@ktmdecor.com"] } });

    // Seed Admin
    const adminExists = await User.findOne({ email: "admin@ktmdecor.com" });
    if (!adminExists) {
      await User.create({
        name: "Kishor (Admin)",
        email: "admin@ktmdecor.com",
        password: process.env.SEED_ADMIN_PASSWORD || "adminpassword",
        role: "admin",
      });
      console.log("  ↳ Created admin user: admin@ktmdecor.com");
    } else {
      await syncPasswordIfNeeded(adminExists, process.env.SEED_ADMIN_PASSWORD);
      if (adminExists.name !== "Kishor (Admin)") {
        adminExists.name = "Kishor (Admin)";
        await adminExists.save();
        console.log("  ↳ Updated admin user name to Kishor (Admin)");
      }
    }

    // Seed Shared Staff Login user
    const sharedStaffExists = await User.findOne({ email: SHARED_STAFF_EMAIL });
    if (!sharedStaffExists) {
      await User.create({
        name: "Shared Staff Login",
        email: SHARED_STAFF_EMAIL,
        password: process.env.SEED_STAFF_PASSWORD || "staffpassword",
        role: "staff",
      });
      console.log(`  ↳ Created shared staff user: ${SHARED_STAFF_EMAIL}`);
    } else {
      await syncPasswordIfNeeded(sharedStaffExists, process.env.SEED_STAFF_PASSWORD);
    }

    // Seed 10 Staff Members
    const staffMembers = [
      { name: "Rajesh Shah", email: "rajesh@ktmdecor.com", baseSalary: 28000 },
      { name: "Som Gharti", email: "som@ktmdecor.com", baseSalary: 25000 },
      { name: "Bishnu Adhikari", email: "bishnu@ktmdecor.com", baseSalary: 16000 },
      { name: "Sobilal Chaudhary", email: "sobilal@ktmdecor.com", baseSalary: 18000 },
      { name: "Pradip Magar", email: "pradip@ktmdecor.com", baseSalary: 15500 },
      { name: "Tilaram Magar", email: "tilaram@ktmdecor.com", baseSalary: 15500 },
      { name: "Bishal Pandey", email: "bishal@ktmdecor.com", baseSalary: 12000 },
      { name: "Sugam GC", email: "sugam@ktmdecor.com", baseSalary: 12000 },
      { name: "Sandesh GC", email: "sandesh@ktmdecor.com", baseSalary: 30000 },
      { name: "Kishor GC", email: "kishor@ktmdecor.com", baseSalary: 50000 }
    ];

    const allowedEmails = [
      SHARED_STAFF_EMAIL,
      ...staffMembers.map(s => s.email)
    ];

    for (const staff of staffMembers) {
      const exists = await User.findOne({ email: staff.email });
      if (!exists) {
        await User.create({
          name: staff.name,
          email: staff.email,
          password: process.env.SEED_STAFF_PASSWORD || "staffpassword",
          role: "staff",
          baseSalary: staff.baseSalary
        });
        console.log(`  ↳ Created staff member: ${staff.name}`);
      } else {
        if (exists.baseSalary === undefined || exists.baseSalary === null) {
          exists.baseSalary = staff.baseSalary;
          await exists.save();
        }
        await syncPasswordIfNeeded(exists, process.env.SEED_STAFF_PASSWORD);
      }
    }
  } catch (error) {
    console.error("Error seeding users:", error);
  }
};

export const seedProducts = async () => {
  try {
    const productCount = await Product.countDocuments();
    const hasPlaceholder = await Product.findOne({ image: "/images/placeholder.svg" });
    const hasLegacyName = await Product.findOne({ name: /Design #/ });
    const hasLegacyOrPlaceholderImg = await Product.findOne({ image: /^\/images\/(light-boards-nivati|custom-decor-collage|workshop|neon-momo|neon-taso|hero-04|3d-letters-salt|dimensional-ktm|laser-cnc|name-plates|about-hero)\.webp/ });
    const lacksImageUrls = await Product.findOne({ $or: [{ image_urls: { $exists: false } }, { image_urls: { $size: 0 } }] });
    const lacksVariants = await Product.findOne({ $or: [{ variants: { $exists: false } }, { variants: { $size: 0 } }] });
    const countMismatch = productCount !== 12;

    if (productCount === 0 || hasPlaceholder || hasLegacyName || hasLegacyOrPlaceholderImg || lacksImageUrls || lacksVariants || countMismatch) {
      console.log("Legacy, placeholder, incomplete, or outdated products detected. Re-seeding default product catalog (12 premium signs)...");
      await Product.deleteMany({});

      const products = [
        {
          id: "1",
          name: "Premium Custom Wooden Signage",
          category: "Wooden Signage",
          subCategory: "Laser Engraved",
          price: 12000,
          image: "/products/product_1_main.png",
          badge: "Featured",
          description: "Elevate your business front with our Premium Custom Wooden Signage. Meticulously laser-cut and engraved from high-grade timber, this sign features clear brand lines and a weather-resistant clear protective finish.",
          specs: [
            "Hand-selected seasoned premium local hardwood timber base",
            "Precision CNC routers/laser cut logo engraving lines",
            "Deep dual-layer protective marine varnish finish",
            "Heavy-duty metal mounting bracket hardware included",
            "Sustainably sourced and hand-crafted by skilled Nepalese artisans"
          ],
          stockStatus: "In Stock",
          rating: 4.9,
          reviewsCount: 28,
          image_urls: ["/products/product_1_main.png"],
          variants: [
            { option_name: "2x1 feet (2 Sq.Ft.)", price: 4000, compare_at_price: 5200 },
            { option_name: "2x2 feet (4 Sq.Ft.)", price: 8000, compare_at_price: 10400 },
            { option_name: "3x2 feet (6 Sq.Ft.)", price: 12000, compare_at_price: 15600 },
            { option_name: "4x3 feet (12 Sq.Ft.)", price: 24000, compare_at_price: 31200 }
          ]
        },
        {
          id: "2",
          name: "Premium Acrylic Backlit Signage",
          category: "Acrylic Backlit Signage",
          subCategory: "Luxury Showrooms",
          price: 3000,
          image: "/products/product_2_main.png",
          badge: "New",
          description: "Illuminate your brand with our Acrylic Backlit Signage. The perfect combination of premium acrylic and LED backlighting that creates a stunning halo glow, ensuring high visibility and a premium look, day and night.",
          specs: [
            "Premium quality front and backlit cast acrylic faceplate",
            "Uniform LED backlit modules (Warm or White options)",
            "Thickness ranging from 5mm to 10mm as per design requirements",
            "Includes low-voltage 12V power transformer",
            "Designed for office receptions, retail stores, and clinics"
          ],
          stockStatus: "In Stock",
          rating: 4.8,
          reviewsCount: 19,
          image_urls: ["/products/product_2_main.png"],
          variants: [
            { option_name: "2x1 feet (2 Sq.Ft.)", price: 3000, compare_at_price: 3900 },
            { option_name: "2x2 feet (4 Sq.Ft.)", price: 6000, compare_at_price: 7800 },
            { option_name: "3x2 feet (6 Sq.Ft.)", price: 9000, compare_at_price: 11700 },
            { option_name: "4x3 feet (12 Sq.Ft.)", price: 18000, compare_at_price: 23400 }
          ]
        },
        {
          id: "3",
          name: "Premium 2.5D Layered Signage",
          category: "2.5D Signage",
          subCategory: "Corporate Office",
          price: 4000,
          image: "/products/product_3_main.png",
          badge: "Custom",
          description: "Make a lasting impression with our 2.5D Signage - the perfect blend of depth, dimension and style. Layered design creates a rich 3D effect with a premium finish. Ideal for office interiors and showrooms.",
          specs: [
            "High-quality layered acrylic and ACP composite construction",
            "Thickness ranging from 10mm to 25mm for bold dimensional relief",
            "Finish options include matte, glossy, or brushed metallic",
            "Standoff spacers or flush wall mounting brackets included",
            "Perfect for corporate branding, offices, and retail lobbies"
          ],
          stockStatus: "In Stock",
          rating: 4.9,
          reviewsCount: 14,
          image_urls: ["/products/product_3_main.png"],
          variants: [
            { option_name: "2x1 feet (2 Sq.Ft.)", price: 4000, compare_at_price: 5200 },
            { option_name: "2x2 feet (4 Sq.Ft.)", price: 8000, compare_at_price: 10400 },
            { option_name: "3x2 feet (6 Sq.Ft.)", price: 12000, compare_at_price: 15600 },
            { option_name: "4x3 feet (12 Sq.Ft.)", price: 24000, compare_at_price: 31200 }
          ]
        },
        {
          id: "4",
          name: "Double Sided Projecting Light Board",
          category: "Double Sided Round Light Board",
          subCategory: "Retail Storefront",
          price: 5500,
          image: "/products/product_4_main.png",
          badge: "Best Seller",
          description: "Stand out day and night with our double sided round light boards. Perfect for shops, cafes, restaurants, salons and businesses that want maximum visibility from both directions.",
          specs: [
            "Double-sided illumination with dual opal acrylic panels",
            "Heavy-duty rustproof circular iron outer frame casing",
            "High-intensity internal LED modules with uniform diffusion",
            "Low-voltage 12V power supply for high efficiency",
            "IP65 certified fully waterproof and weatherproof seal"
          ],
          stockStatus: "In Stock",
          rating: 4.8,
          reviewsCount: 32,
          image_urls: ["/products/product_4_main.png"],
          variants: [
            { option_name: "18 Inch Diameter", price: 5500, compare_at_price: 7150 },
            { option_name: "24 Inch Diameter", price: 7500, compare_at_price: 9750 }
          ]
        },
        {
          id: "5",
          name: "Custom LED Neon Sign",
          category: "Neon Sign",
          subCategory: "Custom Script",
          price: 3200,
          image: "/products/product_5_main.png",
          badge: "New",
          description: "Brighten your space with our custom LED Neon Signs. Hand-bent from low-voltage silicone flex tubing, these signs are completely silent, safe to touch, and run cold. Ideal for cafes, bedrooms, salons, and backdrop displays.",
          specs: [
            "Low-voltage 12V silicone flex neon tubing (safe to touch)",
            "High-clarity transparent acrylic backing sheet (6mm)",
            "Quiet solid-state power transformer and dimmer switch",
            "Pre-drilled holes for hanging wires or standoff mounts",
            "Over 50,000 hours estimated operational lifespan"
          ],
          stockStatus: "In Stock",
          rating: 4.9,
          reviewsCount: 45,
          image_urls: ["/products/product_5_main.png"],
          variants: [
            { option_name: "2x1 feet (2 Sq.Ft.)", price: 3200, compare_at_price: 4160 },
            { option_name: "2x2 feet (4 Sq.Ft.)", price: 6400, compare_at_price: 8320 },
            { option_name: "3x2 feet (6 Sq.Ft.)", price: 9600, compare_at_price: 12480 },
            { option_name: "4x2 feet (8 Sq.Ft.)", price: 12800, compare_at_price: 16640 }
          ]
        },
        {
          id: "6",
          name: "Modern 2D LED Signboard",
          category: "2D Board",
          subCategory: "Directional & Directory",
          price: 3375,
          image: "/products/product_6_main.png",
          description: "Sleek, stylish, and highly cost-effective, our flat 2D LED signboards feature laser-cut acrylic letters on a matte backing panel. Perfect for interior branding, reception desks, and building directory boards.",
          specs: [
            "Premium flat-cut acrylic letters on a composite panel backing",
            "Front-glowing LED strip inserts for a crisp face glow",
            "Ultra-slim profile design with beveled edges",
            "Standoff wall mounts and anchor brackets included",
            "Custom colors and brand matching options available"
          ],
          stockStatus: "In Stock",
          rating: 4.7,
          reviewsCount: 12,
          image_urls: ["/products/product_6_main.png"],
          variants: [
            { option_name: "Small (1.5x1.5 feet)", price: 3375, compare_at_price: 4300 },
            { option_name: "Medium (2x2 feet)", price: 6000, compare_at_price: 7800 },
            { option_name: "Big (3x3 feet)", price: 9000, compare_at_price: 11700 }
          ]
        },
        {
          id: "7",
          name: "Premium 3D Letter Signage",
          category: "3D Signage",
          subCategory: "Glowing Halo",
          price: 10800,
          image: "/products/product_7_main.png",
          badge: "Custom",
          description: "Give your brand a powerful and professional look with our premium 3D Letter Signage. Crafted with high-grade metal or thick block acrylic returns, these individual letters feature internal front, side, or backlighting for a breathtaking architectural appearance.",
          specs: [
            "Individually fabricated 3D letters from acrylic or aluminum",
            "High-intensity internal IP67 waterproof LED modules (12V)",
            "Front-glowing, side-glowing, or backlit halo light options",
            "Standoff spacers for a beautiful floating shadow depth",
            "Complete template guide for easy wall mounting installation"
          ],
          stockStatus: "In Stock",
          rating: 4.9,
          reviewsCount: 22,
          image_urls: ["/products/product_7_main.png"],
          variants: [
            { option_name: "6 Inch Letters (Set of 10)", price: 10800, compare_at_price: 14000 },
            { option_name: "8 Inch Letters (Set of 10)", price: 14400, compare_at_price: 18700 },
            { option_name: "10 Inch Letters (Set of 10)", price: 18000, compare_at_price: 23400 }
          ]
        },
        {
          id: "8",
          name: "Custom Laser & CNC Products",
          category: "Laser & CNC Products",
          subCategory: "Acrylic Products",
          price: 1200,
          image: "/products/product_8_main.png",
          description: "We design, cut, and engrave a wide range of custom gifts, trophies, keychains, organizers, and home decor items. Using state-of-the-art laser and CNC cutters, we bring your custom illustrations to life on acrylic, wood, MDF, and metals.",
          specs: [
            "High-precision laser cutting and engraving finish",
            "Materials: acrylic, solid wood, MDF, plywood, ACP, and leather",
            "Completely custom layouts based on client artwork files",
            "Premium polished edges and clean engraving lines",
            "Fast fabrication turnaround for bulk orders"
          ],
          stockStatus: "In Stock",
          rating: 4.8,
          reviewsCount: 37,
          image_urls: ["/products/product_8_main.png", "/products/product_8_thumb.png"],
          variants: [
            { option_name: "Acrylic Desk Organizer", price: 1200, compare_at_price: 1560 },
            { option_name: "Wooden Trophy & Award", price: 1500, compare_at_price: 1950 },
            { option_name: "Laser Engraved Nameplate", price: 2000, compare_at_price: 2600 },
            { option_name: "Custom Keychains (Set of 50)", price: 2500, compare_at_price: 3250 }
          ]
        },
        {
          id: "9",
          name: "Bespoke Customized Wall Clock",
          category: "Customized Wall Clock",
          subCategory: "Resin Ocean",
          price: 3000,
          image: "/products/product_9_main.png",
          description: "Add elegance and artistic personality to your walls with our Customized Wall Clocks. Blending natural wood blocks, colored acrylics, and textured epoxy resin waves, each timepiece is hand-detailed by Nepalese artisans and fitted with silent quartz sweeps.",
          specs: [
            "Premium seasoned timber blocks combined with ocean epoxy resin",
            "Silent-sweep quartz movement mechanisms (absolutely tick-free)",
            "Backlit warm LED accent lighting ring (optional)",
            "High-clarity acrylic mandala details or custom wooden cutouts",
            "Available in sizes from 12 inch to 30 inch diameter"
          ],
          stockStatus: "In Stock",
          rating: 4.9,
          reviewsCount: 42,
          image_urls: ["/products/product_9_main.png", "/products/product_9_thumb1.png", "/products/product_9_thumb2.png"],
          variants: [
            { option_name: "12 Inch Wooden Clock", price: 3000, compare_at_price: 3900 },
            { option_name: "12 Inch Acrylic Clock", price: 3500, compare_at_price: 4550 },
            { option_name: "12 Inch Resin Art Clock", price: 4500, compare_at_price: 5850 },
            { option_name: "12 Inch Wood + Resin Clock", price: 5500, compare_at_price: 7150 },
            { option_name: "16 Inch Wood + Resin Clock", price: 8000, compare_at_price: 10400 }
          ]
        },
        {
          id: "10",
          name: "3D Vehicle Number Plate",
          category: "3D Number Plate",
          subCategory: "Luxury Car Plate",
          price: 1200,
          image: "/products/product_10_main.png",
          badge: "New",
          description: "Upgrade your vehicle's aesthetic with our premium 3D Number Plates. Constructed with bold raised acrylic letters on a matte Aluminum Composite Panel (ACP) base, these plates are completely weatherproof, impact resistant, and compliant with standard styling guidelines.",
          specs: [
            "Heavy-duty anti-corrosive ACP backing board (3mm)",
            "Compliant embossed acrylic block digits (3mm thickness)",
            "Waterproof double-sided mounting adhesive (requires no drill holes)",
            "Fade-resistant finish that withstands direct Nepalese sunlight",
            "Available in white base with red letters, or red base with white letters"
          ],
          stockStatus: "In Stock",
          rating: 4.8,
          reviewsCount: 26,
          image_urls: ["/products/product_10_main.png", "/products/product_10_thumb.png"],
          variants: [
            { option_name: "Two Wheeler standard", price: 1200, compare_at_price: 1560 },
            { option_name: "Four Wheeler standard", price: 2500, compare_at_price: 3250 }
          ]
        },
        {
          id: "11",
          name: "Customized Home & Office Nameplate",
          category: "House/Office Nameplate",
          subCategory: "Premium Residential",
          price: 2000,
          image: "/images/name-plates.webp",
          description: "Welcome guests in style with our bespoke customized nameplates. We combine brushed metallic ACP backings with glossy laser-cut acrylic lettering and warm lighting options to create a sophisticated, executive presentation for your home or corporate entrance.",
          specs: [
            "Premium acrylic face panel combined with metallic ACP backing",
            "Laser-cut 3D lettering for elegant depth and visibility",
            "Standoff brass spacers and screws included for firm mounting",
            "Fully weatherproof and fade-resistant for outdoor exposure",
            "Custom religious emblems, family logos, or office designations"
          ],
          stockStatus: "In Stock",
          rating: 4.9,
          reviewsCount: 31,
          image_urls: ["/images/name-plates.webp", "/images/dimensional-ktm.webp", "/images/3d-letters-salt.webp"],
          variants: [
            { option_name: "Standard (12x6 inch)", price: 2000, compare_at_price: 2600 },
            { option_name: "Executive (16x8 inch)", price: 2800, compare_at_price: 3640 },
            { option_name: "Premium (20x10 inch)", price: 3600, compare_at_price: 4680 }
          ]
        },
        {
          id: "12",
          name: "Bespoke Acrylic Table Lamp",
          category: "Acrylic Table Lamp",
          subCategory: "Branded Display Lamp",
          price: 1800,
          image: "/images/hero-04.webp",
          description: "Add a soft ambient glow and a custom touch to your space with our Customized Acrylic Table Lamps. Built with a solid organic beechwood base and a high-clarity laser-etched acrylic plate, these lamps create beautiful line-art illusions, names, or corporate logos.",
          specs: [
            "Precision laser-etched high-clarity 4mm acrylic graphic slide",
            "Solid polished beechwood circular base with built-in LEDs",
            "Multi-mode USB powered warm white illumination with inline switch",
            "Low-voltage operation (under 3.5 Watts total) safe for bedside use",
            "Fully customizable with family names, line drawings, or logo prints"
          ],
          stockStatus: "In Stock",
          rating: 4.8,
          reviewsCount: 24,
          image_urls: ["/images/hero-04.webp", "/images/neon-taso.webp", "/images/neon-momo.webp"],
          variants: [
            { option_name: "Bedside Mini", price: 1800, compare_at_price: 2340 },
            { option_name: "Desk Standard", price: 2430, compare_at_price: 3150 },
            { option_name: "Lounge Premium", price: 3060, compare_at_price: 3980 }
          ]
        }
      ];

      await Product.insertMany(products);
      console.log(`Seeded ${products.length} products into MongoDB successfully.`);
    }
  } catch (error) {
    console.error("Error seeding products:", error);
  }
};

export const seedInventoryItems = async () => {
  try {
    const adminUser = await User.findOne({ role: "admin" }).lean();
    if (!adminUser) {
      console.warn("Skipping inventory seeding: no admin user found.");
      return;
    }

    const pathsToTry = [
      path.join(__dirname, "../inventorySeed.json"),
      path.join(process.cwd(), "dashboard/backend/src/inventorySeed.json"),
      path.join(process.cwd(), "src/inventorySeed.json")
    ];
    let seedFilePath = "";
    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        seedFilePath = p;
        break;
      }
    }

    if (!seedFilePath) {
      console.warn("Skipping inventory seeding: inventorySeed.json not found.");
      return;
    }

    const rawData = fs.readFileSync(seedFilePath, "utf8");
    const seedData = JSON.parse(rawData);

    const existingItems = await InventoryItem.find({}).lean();
    const existingNames = new Set(existingItems.map(item => item.name.toLowerCase().trim()));

    const itemsToInsert = [];
    seedData.forEach((item) => {
      if (item && item.name && item.name.trim() && item.category && item.unit) {
        const normalizedName = item.name.toLowerCase().trim();
        if (!existingNames.has(normalizedName)) {
          itemsToInsert.push({
            ...item,
            createdBy: adminUser._id
          });
          existingNames.add(normalizedName);
        }
      }
    });

    if (itemsToInsert.length > 0) {
      await InventoryItem.insertMany(itemsToInsert);
      console.log(`Seeded ${itemsToInsert.length} new inventory items into MongoDB successfully.`);
    }

    // Duplicate cleanup
    const allItems = await InventoryItem.find({}).lean();
    const grouped = {};
    allItems.forEach(item => {
      const key = item.name.toLowerCase().trim();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    let deletedCount = 0;
    for (const key in grouped) {
      const group = grouped[key];
      if (group.length > 1) {
        group.sort((a, b) => {
          if (b.quantity !== a.quantity) return b.quantity - a.quantity;
          return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
        });

        const idsToDelete = group.slice(1).map(item => item._id);
        await InventoryItem.deleteMany({ _id: { $in: idsToDelete } });
        deletedCount += idsToDelete.length;
      }
    }

    if (deletedCount > 0) {
      console.log(`Self-healing cleanup: Deleted ${deletedCount} duplicate inventory items.`);
    }
  } catch (error) {
    console.error("Error seeding or cleaning inventory items:", error);
  }
};

export const syncExistingApprovedOrders = async () => {
  try {
    const approvedOrders = await Order.find({ approved: true, deleted: { $ne: true } }).lean();
    if (approvedOrders.length === 0) return;

    const orderIds = approvedOrders.map(o => o._id);
    const existingSales = await Sale.find({ orderId: { $in: orderIds } }).select("orderId").lean();
    const existingSaleOrderIds = new Set(existingSales.map(s => s.orderId.toString()));

    const missingSales = [];
    for (const order of approvedOrders) {
      if (!existingSaleOrderIds.has(order._id.toString())) {
        missingSales.push({
          clientName: order.customerName,
          productName: order.productName,
          amount: order.totalPrice,
          date: order.approvedAt || order.updatedAt || new Date(),
          paymentMethod: order.paymentMethod || "cash",
          notes: order.manufacturingNotes || `Automatic sale from approved order: ${order.productName}`,
          createdBy: order.createdBy,
          orderId: order._id
        });
      }
    }

    if (missingSales.length > 0) {
      await Sale.insertMany(missingSales);
      console.log(`Synced database: created ${missingSales.length} missing Sales records for approved orders.`);
    }
  } catch (err) {
    console.error("Error syncing existing approved orders with sales:", err);
  }
};

let seeded = false;
export const runSeeds = async () => {
  if (seeded) return;
  try {
    const metaCollection = mongoose.connection.db.collection("system_metas");
    
    // Ensure unique index on the 'key' field to guarantee atomic constraint lock
    await metaCollection.createIndex({ key: 1 }, { unique: true });

    const seedMeta = await metaCollection.findOne({ key: "seeded_v1" });
    if (seedMeta) {
      seeded = true;
      console.log("Database already seeded (verified by system_metas). Syncing users...");
      await seedUsers();
      return;
    }

    // Try to atomically insert the lock/completion metadata document
    try {
      await metaCollection.insertOne({
        key: "seeded_v1",
        value: true,
        seededAt: new Date(),
        status: "completed"
      });
      
      console.log("Seeding lock acquired. Initializing database seeds...");
      await seedUsers();
      await seedProducts();
      await seedInventoryItems();
      await syncExistingApprovedOrders();
      seeded = true;
      console.log("Database seeded successfully and marked in system_metas.");
    } catch (innerError) {
      // Catch duplicate key error (code 11000) indicating another concurrent process won the race
      if (innerError.code === 11000) {
        seeded = true;
        console.log("Database already seeded (concurrency lock conflict resolved). Syncing users...");
        await seedUsers();
        return;
      }
      throw innerError;
    }
  } catch (error) {
    console.error("Error in runSeeds optimization. Falling back to direct seeding:", error);
    await seedUsers();
    await seedProducts();
    await seedInventoryItems();
    await syncExistingApprovedOrders();
    seeded = true;
  }
};
