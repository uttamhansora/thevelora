import { loadLocalEnv } from "./load-env";
import { connectDB } from "../src/lib/db/mongoose";
import { hashPassword } from "../src/lib/auth/password";
import { UserModel } from "../src/models/user";

loadLocalEnv();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const password = process.env.ADMIN_INITIAL_PASSWORD ?? "";
  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD before running the administrator seed. No default password is built in.");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("ADMIN_INITIAL_PASSWORD must be at least 12 characters.");
    process.exit(1);
  }
  await connectDB();
  const existing = await UserModel.findOne({ email });
  if (existing) {
    console.log("An administrator with that email already exists. No changes were made.");
    process.exit(0);
  }
  await UserModel.create({
    name: "Store administrator",
    email,
    passwordHash: await hashPassword(password),
    role: "super_admin",
    status: "active",
  });
  console.log("Initial administrator created. Remove ADMIN_INITIAL_PASSWORD from the environment after use.");
  process.exit(0);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Seed failed";
  console.error(message.replace(/mongodb(\+srv)?:\/\/\S+/gi, "mongodb://[redacted]"));
  process.exit(1);
});
