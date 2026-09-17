import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../config/db.js";
import Order from "../models/Order.js";
import Sale from "../models/Sale.js";

async function run() {
  try {
    await connectDB();
    console.log("Connected to database successfully.");

    const orders = await Order.find({ deleted: { $ne: true } });
    console.log(`Found ${orders.length} active orders.`);

    let updatedCount = 0;
    let unchangedCount = 0;

    for (const order of orders) {
      const orderDateToUse = order.orderDate || order.createdAt;
      if (!orderDateToUse) continue;

      const sale = await Sale.findOne({ orderId: order._id });
      if (sale) {
        const currentDate = sale.date ? new Date(sale.date).toISOString().split("T")[0] : null;
        const targetDate = new Date(orderDateToUse).toISOString().split("T")[0];

        if (currentDate !== targetDate) {
          console.log(`Updating sale for "${order.productName}" (Order ID: ${order._id}): ${currentDate} -> ${targetDate}`);
          sale.date = orderDateToUse;
          await sale.save();
          updatedCount++;
        } else {
          unchangedCount++;
        }
      }
    }

    console.log(`Finished syncing sales dates: ${updatedCount} updated, ${unchangedCount} already matched.`);
  } catch (err) {
    console.error("Error during sales date synchronization:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database.");
  }
}

run();
