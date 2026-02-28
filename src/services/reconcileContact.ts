import { prisma } from "../lib/prisma";

interface IdentifyInput {
  email?: string;
  phoneNumber?: string;
}

export async function reconcileContact({ email, phoneNumber }: IdentifyInput) {
    return await prisma.$transaction(async (tx) => {
        //Find direct matches
        const matches = await tx.contact.findMany({
            where: {
            deletedAt: null,
            OR: [
                ...(email ? [{ email }] : []),
                ...(phoneNumber ? [{ phoneNumber }] : []),
            ],
            },
        });

        // If no matches → create new primary
        if (matches.length === 0) {
            const newContact = await tx.contact.create({
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

        //Collect all root primary IDs
        const rootIds = new Set<number>();

        for (const contact of matches) {
            if (contact.linkPrecedence === "primary") {
            rootIds.add(contact.id);
            } else if (contact.linkedId) {
            rootIds.add(contact.linkedId);
            }
        }

        // Fetch entire cluster
        const cluster = await tx.contact.findMany({
            where: {
            deletedAt: null,
            OR: [
                { id: { in: Array.from(rootIds) } },
                { linkedId: { in: Array.from(rootIds) } },
            ],
            },
            orderBy: {
            createdAt: "asc",
            },
        });

        // Determine true primary (oldest primary)
        const primaries = cluster.filter(c => c.linkPrecedence === "primary");

        const truePrimary = primaries[0]!; // because ordered by createdAt asc

        // Demote other primaries
        for (const primary of primaries) {
            if (primary.id !== truePrimary.id) {
            await tx.contact.update({
                where: { id: primary.id },
                data: {
                linkPrecedence: "secondary",
                linkedId: truePrimary.id,
                },
            });
            }
        }

        //Check if new info needs secondary creation
        const existingEmails = new Set(
            cluster.map(c => c.email).filter(Boolean)
        );

        const existingPhones = new Set(
            cluster.map(c => c.phoneNumber).filter(Boolean)
        );

        const isNewEmail = email && !existingEmails.has(email);
        const isNewPhone = phoneNumber && !existingPhones.has(phoneNumber);

        if (isNewEmail || isNewPhone) {
            await tx.contact.create({
            data: {
                email,
                phoneNumber,
                linkPrecedence: "secondary",
                linkedId: truePrimary.id,
            },
            });
        }

        //Re-fetch final cluster (IMPORTANT)
        const finalContacts = await tx.contact.findMany({
            where: {
            deletedAt: null,
            OR: [
                { id: truePrimary.id },
                { linkedId: truePrimary.id },
            ],
            },
        });

        return {
            primaryId: truePrimary.id,
            emails: [
            ...new Set(finalContacts.map(c => c.email).filter(Boolean)),
            ],
            phoneNumbers: [
            ...new Set(finalContacts.map(c => c.phoneNumber).filter(Boolean)),
            ],
            secondaryIds: finalContacts
            .filter(c => c.linkPrecedence === "secondary")
            .map(c => c.id),
        };
})
}