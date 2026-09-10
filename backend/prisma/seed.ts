import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = process.env.SEED_OWNER_EMAIL?.toLowerCase().trim();
  const ownerPassword = process.env.SEED_OWNER_PASSWORD;

  if (!ownerEmail || !ownerPassword) {
    console.error(
      "Set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD environment variables before running the seed script.\n" +
        "Example:\n" +
        "  SEED_OWNER_EMAIL=daniel@example.com SEED_OWNER_PASSWORD='YourStrongPassword123' npm run seed\n" +
        "Do not use a default/placeholder password for the Owner account."
    );
    process.exit(1);
  }

  if (ownerPassword.length < 8) {
    console.error("SEED_OWNER_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (existing) {
    console.log("Owner account already exists, skipping seed.");
    return;
  }

  const hashed = await bcrypt.hash(ownerPassword, 12);
  await prisma.user.create({
    data: {
      name: "Daniel",
      email: ownerEmail,
      password: hashed,
      role: "OWNER",
      status: "APPROVED",
    },
  });

  console.log(`Owner account created for ${ownerEmail}.`);
  console.log("Log in with the email and password you set via SEED_OWNER_PASSWORD.");

  // Storefront contact/social/location info + return policy. Upsert so this
  // is safe to re-run — edit these values any time from the admin settings
  // screen instead of re-running the seed.
  await prisma.storeSettings.upsert({
    where: { id: "store" },
    create: {
      id: "store",
      ownerName: "Daniel",
      contactEmail: "danielstore@gmail.com",
      whatsappNumber: "+254707197591",
      whatsappUrl: "https://wa.me/254707197591",
      socialHandle: "@daniels_store",
      facebookUrl: "https://facebook.com/daniels_store",
      instagramUrl: "https://instagram.com/daniels_store",
      xUrl: "https://x.com/daniels_store",
      tiktokUrl: "https://tiktok.com/@daniels_store",
      locationName: "Nairobi, SIMARA Mall, 2nd Floor",
      // PLACEHOLDER — replace with your actual return policy via the admin
      // settings screen before going live.
      returnPolicy:
        "Returns are accepted within 7 days of delivery for items in original, unused condition " +
        "with tags/packaging intact. Contact us via WhatsApp or email to start a return. " +
        "Refunds are processed within 5-7 business days of the returned item being received.",
    },
    update: {},
  });
  console.log("Store settings seeded (contact, social, location, return policy).");

  // Default delivery zones for the shipping calculator. Rates/timelines below
  // are placeholders — adjust them from the admin shipping settings screen
  // to match your actual courier pricing.
  const zones: {
    name: string;
    rate: number;
    freeOverAmount?: number;
    estDeliveryDaysMin: number;
    estDeliveryDaysMax: number;
    sortOrder: number;
  }[] = [
    { name: "Nairobi CBD", rate: 200, freeOverAmount: 5000, estDeliveryDaysMin: 0, estDeliveryDaysMax: 1, sortOrder: 0 },
    { name: "Nairobi Metro", rate: 350, freeOverAmount: 8000, estDeliveryDaysMin: 1, estDeliveryDaysMax: 2, sortOrder: 1 },
    { name: "Rest of Kenya", rate: 600, estDeliveryDaysMin: 2, estDeliveryDaysMax: 5, sortOrder: 2 },
  ];

  for (const zone of zones) {
    await prisma.shippingZone.upsert({
      where: { name: zone.name },
      create: zone,
      update: {},
    });
  }
  console.log("Default shipping zones seeded (Nairobi CBD, Nairobi Metro, Rest of Kenya).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
