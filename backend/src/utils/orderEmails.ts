import { sendEmail } from "./email";
import { formatKES } from "./format";

interface OrderEmailItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface OrderEmailData {
  orderNumber: string;
  totalAmount: number;
  channel: "ONLINE" | "IN_STORE";
  items: OrderEmailItem[];
  customerName?: string;
}

function itemsToHtml(items: OrderEmailItem[]): string {
  return items
    .map(
      (i) =>
        `<tr>
          <td style="padding:6px 0;">${i.productName} × ${i.quantity}</td>
          <td style="padding:6px 0; text-align:right;">${formatKES(i.subtotal)}</td>
        </tr>`
    )
    .join("");
}

// Sent to the customer right after checkout — only fires if they gave an email.
export async function sendOrderConfirmationEmail(to: string, data: OrderEmailData) {
  await sendEmail({
    to,
    subject: `Order confirmed — ${data.orderNumber}`,
    html: `
      <p>Hi ${data.customerName || "there"},</p>
      <p>Thanks for your order! Here's a summary:</p>
      <table style="width:100%; border-collapse:collapse;">
        ${itemsToHtml(data.items)}
        <tr>
          <td style="padding-top:10px; font-weight:bold;">Total</td>
          <td style="padding-top:10px; text-align:right; font-weight:bold;">${formatKES(data.totalAmount)}</td>
        </tr>
      </table>
      <p style="margin-top:16px;">Order number: <strong>${data.orderNumber}</strong></p>
      <p>We'll let you know when it ships.</p>
    `,
  });
}

// Sent to the business owner/managers so they see sales as they happen —
// this is the "monitor business progress" piece from the original brief,
// delivered as a live notification rather than something you have to check
// the dashboard for.
export async function sendNewOrderAlertEmail(to: string[], data: OrderEmailData) {
  if (to.length === 0) return;
  await sendEmail({
    to: to.join(","),
    subject: `New ${data.channel === "IN_STORE" ? "in-store" : "online"} order — ${formatKES(data.totalAmount)}`,
    html: `
      <p>New order received${data.customerName ? ` from ${data.customerName}` : ""}.</p>
      <table style="width:100%; border-collapse:collapse;">
        ${itemsToHtml(data.items)}
        <tr>
          <td style="padding-top:10px; font-weight:bold;">Total</td>
          <td style="padding-top:10px; text-align:right; font-weight:bold;">${formatKES(data.totalAmount)}</td>
        </tr>
      </table>
      <p style="margin-top:16px;">Order number: <strong>${data.orderNumber}</strong></p>
      <p>Channel: ${data.channel === "IN_STORE" ? "In-store (POS)" : "Online storefront"}</p>
    `,
  });
}

// Sent to the customer when staff update the order status (shipped/delivered/cancelled).
export async function sendOrderStatusUpdateEmail(
  to: string,
  data: { orderNumber: string; status: string; customerName?: string }
) {
  const statusMessages: Record<string, string> = {
    PROCESSING: "is now being prepared",
    SHIPPED: "is on its way",
    DELIVERED: "has been delivered",
    CANCELLED: "has been cancelled",
  };
  const message = statusMessages[data.status] || `status changed to ${data.status}`;

  await sendEmail({
    to,
    subject: `Order ${data.orderNumber} update`,
    html: `
      <p>Hi ${data.customerName || "there"},</p>
      <p>Your order <strong>${data.orderNumber}</strong> ${message}.</p>
    `,
  });
}
