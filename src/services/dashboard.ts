import { connectDB } from "@/lib/db/mongoose";
import { OrderModel } from "@/models/order";
import { ProductModel } from "@/models/product";

export async function getDashboard() {
  await connectDB();
  const [orderStats, productCount, lowStock, recentOrders, recentClaims, bestSellers] = await Promise.all([
    OrderModel.aggregate<{
      totalOrders: number;
      pendingVerification: number;
      paidOrders: number;
      paidRevenuePaise: number;
      pendingPaymentPaise: number;
      cancelledOrders: number;
      refundedPaise: number;
      grossPaise: number;
    }>([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          pendingVerification: {
            $sum: { $cond: [{ $in: ["$paymentStatus", ["pending", "claim_submitted"]] }, 1, 0] },
          },
          paidOrders: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] } },
          paidRevenuePaise: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalPaise", 0] } },
          pendingPaymentPaise: {
            $sum: { $cond: [{ $in: ["$paymentStatus", ["pending", "claim_submitted"]] }, "$totalPaise", 0] },
          },
          cancelledOrders: { $sum: { $cond: [{ $eq: ["$orderStatus", "cancelled"] }, 1, 0] } },
          refundedPaise: { $sum: { $cond: [{ $eq: ["$paymentStatus", "refunded"] }, "$totalPaise", 0] } },
          grossPaise: { $sum: "$totalPaise" },
        },
      },
    ]),
    ProductModel.countDocuments({ isArchived: false }),
    ProductModel.countDocuments({
      isArchived: false,
      $or: [
        { variants: { $size: 0 }, $expr: { $lte: ["$stockQuantity", "$lowStockThreshold"] } },
        { "variants.stockQuantity": { $lte: 2 } },
      ],
    }),
    OrderModel.find().sort({ createdAt: -1 }).limit(8).select("orderNumber customer.name totalPaise paymentStatus orderStatus createdAt").lean(),
    OrderModel.find({ paymentStatus: "claim_submitted" }).sort({ updatedAt: -1 }).limit(8).select("orderNumber paymentReference totalPaise customer.name createdAt").lean(),
    OrderModel.aggregate<{ _id: string; name: string; quantity: number; revenuePaise: number }>([
      { $match: { paymentStatus: "paid" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.name" },
          quantity: { $sum: "$items.quantity" },
          revenuePaise: { $sum: "$items.lineTotalPaise" },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const stats = orderStats[0] ?? {
    totalOrders: 0,
    pendingVerification: 0,
    paidOrders: 0,
    paidRevenuePaise: 0,
    pendingPaymentPaise: 0,
    cancelledOrders: 0,
    refundedPaise: 0,
    grossPaise: 0,
  };
  return { stats, productCount, lowStock, recentOrders, recentClaims, bestSellers };
}
