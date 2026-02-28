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

  // Find matching contacts safely
  const existingContacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        ...(email ? [{ email }] : []),
        ...(phoneNumber ? [{ phoneNumber }] : []),
      ],
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // If none → create primary
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

  // Oldest contact becomes primary
  const primary = existingContacts[0]!;

  // Collect existing emails & phones
  const existingEmails = new Set(
    existingContacts.map((c) => c.email).filter(Boolean)
  );

  const existingPhones = new Set(
    existingContacts.map((c) => c.phoneNumber).filter(Boolean)
  );

  const isNewEmail = email && !existingEmails.has(email);
  const isNewPhone = phoneNumber && !existingPhones.has(phoneNumber);

  // Create secondary if new info
  if (isNewEmail || isNewPhone) {
    await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkedId: primary.id,
        linkPrecedence: "secondary",
      },
    });
  }

  // Fetch full group (primary + secondaries)
  const finalContacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        { id: primary.id },
        { linkedId: primary.id },
      ],
    },
  });

  const emails = [
    ...new Set(finalContacts.map((c) => c.email).filter(Boolean)),
  ];

  const phoneNumbers = [
    ...new Set(finalContacts.map((c) => c.phoneNumber).filter(Boolean)),
  ];

  const secondaryIds = finalContacts
    .filter((c) => c.linkPrecedence === "secondary")
    .map((c) => c.id);

  return res.status(200).json({
    contact: {
      primaryContatctId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds: secondaryIds,
    },
  });
});

export default router;