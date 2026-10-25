import { connectDB } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { CustomerModel } from "@/models/supporting";

type RegisterInput = { name: string; mobile: string; email: string; password: string };

export async function registerCustomer(input: RegisterInput) {
  await connectDB();
  const existing = await CustomerModel.findOne({ mobile: input.mobile }).select("+passwordHash");
  if (existing?.passwordHash) {
    throw new AppError("This mobile number already has an account. Sign in instead.", 409);
  }
  const passwordHash = await hashPassword(input.password);
  if (existing) {
    existing.name = input.name;
    existing.email = input.email;
    existing.passwordHash = passwordHash;
    await existing.save();
    return existing;
  }
  return CustomerModel.create({
    name: input.name,
    mobile: input.mobile,
    email: input.email,
    passwordHash,
  });
}

export async function loginCustomer(mobile: string, password: string) {
  await connectDB();
  const customer = await CustomerModel.findOne({ mobile }).select("+passwordHash");
  if (!customer?.passwordHash || !(await verifyPassword(customer.passwordHash, password))) {
    throw new AppError("Invalid mobile number or password.", 401);
  }
  return customer;
}

export async function setCustomerPassword(customerId: string, password: string) {
  await connectDB();
  const customer = await CustomerModel.findById(customerId).select("+passwordHash");
  if (!customer) throw new AppError("Account not found.", 404);
  customer.passwordHash = await hashPassword(password);
  await customer.save();
  return customer;
}
