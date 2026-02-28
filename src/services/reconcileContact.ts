import { prisma } from "../lib/prisma";

interface IdentifyInput {
  email?: string;
  phoneNumber?: string;
}

export async function reconcileContact({ email, phoneNumber }: IdentifyInput) {
  // Find matching contacts
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

    return {
      primaryId: newContact.id,
      emails: email ? [email] : [],
      phoneNumbers: phoneNumber ? [phoneNumber] : [],
      secondaryIds: [],
    };
  }

  // Oldest becomes primary
  const primary = existingContacts[0]!;

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

  // Fetch full group
  const finalContacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        { id: primary.id },
        { linkedId: primary.id },
      ],
    },
  });

  return {
    primaryId: primary.id,
    emails: [
      ...new Set(finalContacts.map((c) => c.email).filter(Boolean)),
    ],
    phoneNumbers: [
      ...new Set(finalContacts.map((c) => c.phoneNumber).filter(Boolean)),
    ],
    secondaryIds: finalContacts
      .filter((c) => c.linkPrecedence === "secondary")
      .map((c) => c.id),
  };
}