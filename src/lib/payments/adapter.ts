import { paiseToInrString } from "@/lib/money";
import { buildUpiIntent, isValidVpa } from "@/lib/upi";

export type PaymentAttempt = {
  orderNumber: string;
  amountPaise: number;
  currency: "INR";
};

export type MerchantAccount = {
  vpa: string;
  name: string;
};

export type PaymentInstructions = {
  mode: "upi_manual";
  configured: boolean;
  upiUri: string | null;
  merchantName: string | null;
  merchantVpa: string | null;
  amount: string | null;
  transactionReference: string;
  message: string;
};

export interface PaymentAdapter {
  readonly id: "upi_manual";
  createInstructions(attempt: PaymentAttempt, merchant: MerchantAccount): PaymentInstructions;
}

export const manualUpiAdapter: PaymentAdapter = {
  id: "upi_manual",
  createInstructions(attempt, merchant) {
    const reference = attempt.orderNumber;
    const amount = paiseToInrString(attempt.amountPaise);
    if (!merchant.vpa.trim() || !isValidVpa(merchant.vpa)) {
      return {
        mode: "upi_manual",
        configured: false,
        upiUri: null,
        merchantName: merchant.name.trim() || null,
        merchantVpa: null,
        amount,
        transactionReference: reference,
        message: "UPI payment is unavailable until an administrator configures a valid merchant UPI ID.",
      };
    }
    const upiUri = buildUpiIntent({
      pa: merchant.vpa.trim(),
      pn: merchant.name.trim() || "THE VELORA",
      tr: reference,
      tn: `Order ${reference}`,
      am: amount,
    });
    return {
      mode: "upi_manual",
      configured: true,
      upiUri,
      merchantName: merchant.name.trim() || "THE VELORA",
      merchantVpa: merchant.vpa.trim(),
      amount,
      transactionReference: reference,
      message:
        "This opens a payment request in a UPI app. It does not confirm that the money was received. Submit the UTR after you pay, and wait for the store to verify it.",
    };
  },
};
