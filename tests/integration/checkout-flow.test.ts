import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { hashPassword } from "@/lib/auth/password";
import { createAdminSession } from "@/lib/auth/session";
import { POST as verifyPaymentRoute } from "@/app/api/admin/payment-verification/route";
import { POST as ordersRoute } from "@/app/api/orders/route";
import { POST as claimRoute } from "@/app/api/payment-claims/route";
import { connectDB, resetConnectionCacheForTests } from "@/lib/db/mongoose";
import { ProductModel } from "@/models/product";
import { UserModel } from "@/models/user";
import { OrderModel } from "@/models/order";
import { assertTestDatabase } from "@/lib/security/request";

let memory: MongoMemoryServer;

async function clearDatabase() {
  assertTestDatabase();
  const collections = await mongoose.connection.db?.collections();
  for (const collection of collections ?? []) await collection.deleteMany({});
}

beforeAll(async () => {
  memory = await MongoMemoryServer.create();
  process.env.MONGODB_URI = memory.getUri();
  process.env.MONGODB_DB_NAME = "thevelora_test";
  process.env.AUTH_SECRET = "test-secret-should-be-at-least-32-characters";
  process.env.APP_URL = "http://localhost:3000";
  process.env.MERCHANT_UPI_ID = "merchant@okaxis";
  process.env.MERCHANT_UPI_NAME = "THE VELORA";
  resetConnectionCacheForTests();
  await connectDB();
});

afterAll(async () => {
  await mongoose.disconnect();
  resetConnectionCacheForTests();
  await memory.stop();
});

describe("checkout and payment verification", () => {
  it("creates one pending order, blocks oversell, and requires an authorized verifier", async () => {
    await clearDatabase();
    const product = await ProductModel.create({
      name: "Test silk saree",
      slug: "test-silk-saree",
      sku: "TEST-SILK",
      allSkus: ["TEST-SILK"],
      pricePaise: 150000,
      stockQuantity: 1,
      lowStockThreshold: 0,
      isPublished: true,
      isArchived: false,
      variants: [],
    });
    const body = {
      fullName: "Asha Menon",
      mobile: "9876543210",
      email: "asha@example.com",
      addressLine: "12 Residency Road",
      landmark: "",
      city: "Bengaluru",
      state: "Karnataka",
      pinCode: "560001",
      notes: "",
      items: [{ productId: String(product._id), variantSku: null, quantity: 1 }],
      couponCode: "",
      idempotencyKey: "checkout-key-0001",
    };
    const request = () => new Request("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const first = await ordersRoute(request());
    const second = await ordersRoute(request());
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const firstBody = await first.json();
    const secondBody = await second.json();
    expect(secondBody.order.orderNumber).toBe(firstBody.order.orderNumber);
    expect(firstBody.order.paymentStatus).toBe("pending");
    expect(firstBody.order.orderStatus).toBe("awaiting_payment");
    expect(firstBody.order.instructions.upiUri).toContain("upi://pay?");
    const stock = await ProductModel.findById(product._id);
    expect(stock?.stockQuantity).toBe(0);

    const rival = await ordersRoute(new Request("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify({ ...body, idempotencyKey: "checkout-key-0002", mobile: "9876543211" }),
    }));
    expect(rival.status).toBe(409);

    const claim = await claimRoute(new Request("http://localhost:3000/api/payment-claims", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: JSON.stringify({ publicToken: firstBody.order.publicToken, utr: "UTR123456", note: "Paid from my UPI app" }),
    }));
    expect(claim.status).toBe(200);

    const manager = await UserModel.create({ name: "Orders", email: "orders@example.com", passwordHash: await hashPassword("a-long-password"), role: "order_manager", status: "active" });
    const productManager = await UserModel.create({ name: "Products", email: "products@example.com", passwordHash: await hashPassword("a-long-password"), role: "product_manager", status: "active" });
    const order = await OrderModel.findOne({ orderNumber: firstBody.order.orderNumber });
    const allowed = await createAdminSession({ id: String(manager._id), role: "order_manager" });
    const denied = await createAdminSession({ id: String(productManager._id), role: "product_manager" });
    const deniedResponse = await verifyPaymentRoute(new Request("http://localhost:3000/api/admin/payment-verification", {
      method: "POST",
      headers: { origin: "http://localhost:3000", cookie: `velora_admin_session=${encodeURIComponent(denied.token)}`, "x-csrf-token": denied.csrfToken, "content-type": "application/json" },
      body: JSON.stringify({ orderId: String(order?._id), action: "verify", note: "seen in bank" }),
    }));
    expect(deniedResponse.status).toBe(403);
    const verified = await verifyPaymentRoute(new Request("http://localhost:3000/api/admin/payment-verification", {
      method: "POST",
      headers: { origin: "http://localhost:3000", cookie: `velora_admin_session=${encodeURIComponent(allowed.token)}`, "x-csrf-token": allowed.csrfToken, "content-type": "application/json" },
      body: JSON.stringify({ orderId: String(order?._id), action: "verify", note: "matched the merchant statement" }),
    }));
    expect(verified.status).toBe(200);
    const paid = await OrderModel.findById(order?._id);
    expect(paid?.paymentStatus).toBe("paid");
    expect(paid?.orderStatus).toBe("processing");
    expect(paid?.salesCounted).toBe(true);
    const again = await verifyPaymentRoute(new Request("http://localhost:3000/api/admin/payment-verification", {
      method: "POST",
      headers: { origin: "http://localhost:3000", cookie: `velora_admin_session=${encodeURIComponent(allowed.token)}`, "x-csrf-token": allowed.csrfToken, "content-type": "application/json" },
      body: JSON.stringify({ orderId: String(order?._id), action: "verify", note: "retry" }),
    }));
    expect(again.status).toBe(409);
    const sold = await ProductModel.findById(product._id);
    expect(sold?.salesCount).toBe(1);
    expect(sold?.stockQuantity).toBe(0);
  });
});
