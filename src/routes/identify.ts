import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.post("/", async (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({
      error: "Either email or phoneNumber must be provided",
    });
  }

  // Find matching contacts
  const existingContacts = await prisma.contact.findMany({
    where: {
      OR: [
        email ? { email } : undefined,
        phoneNumber ? { phoneNumber } : undefined,
      ].filter(Boolean) as any,
      deletedAt: null,
    },
  });

  // If no match → create primary
  if (existingContacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: "primary",
      },
    });

    return res.status(200).json({
      contact: {
        primaryContatctId: newContact.id,
        emails: email ? [email] : [],
        phoneNumbers: phoneNumber ? [phoneNumber] : [],
        secondaryContactIds: [],
      },
    });
  }

  // For now just return first match (we refine later)
  const primary = existingContacts[0]!;

  return res.status(200).json({
    contact: {
      primaryContatctId: primary.id,
      emails: primary.email ? [primary.email] : [],
      phoneNumbers: primary.phoneNumber ? [primary.phoneNumber] : [],
      secondaryContactIds: [],
    },
  });
});

export default router;