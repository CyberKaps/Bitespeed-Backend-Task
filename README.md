
# 🧠 Bitespeed Backend Task — Identity Reconciliation Service

This service implements an identity reconciliation system that consolidates customer contact information based on shared email addresses and phone numbers.

Built with:

- **Bun**
- **Express**
- **Prisma ORM**
- **PostgreSQL**

---

# 🚀 Setup Instructions

## 1️⃣ Install Dependencies

```bash
bun install
```

## 2️⃣ Configure Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/database"
```

## 3️⃣ Run Database Migrations

```bash
bunx prisma migrate dev
```

## 4️⃣ Start the Server

```bash
bun run index.ts
```

Server runs at:

http://localhost:3000

---

# 📡 API

## POST `/identify`

### Request Body

```json
{
	"email": "string (optional)",
	"phoneNumber": "string (optional)"
}
```

At least one field must be provided.

### Response Format

```json
{
	"contact": {
		"primaryContactId": number,
		"emails": string[],
		"phoneNumbers": string[],
		"secondaryContactIds": number[]
	}
}
```

---

# 🏗 How It Works

The system maintains a `Contact` table where:

- Each identity cluster has exactly one **primary contact**
- All other related records are marked as **secondary**
- Secondary records reference the primary using `linkedId`
- The **oldest contact** (by `createdAt`) is always chosen as the true primary

---

# 🔄 Identity Reconciliation Logic

When `/identify` is called:

1. Find contacts matching the provided email or phone number.
2. Collect all related primary IDs.
3. Fetch the entire contact cluster.
4. Determine the oldest primary contact.
5. Demote other primaries (if any).
6. Create a new secondary if new information is introduced.
7. Return the fully consolidated identity.

All operations are executed inside a **database transaction** to guarantee:

- Atomicity
- Data consistency
- Protection against race conditions
- Safe cluster merging

---

# 🗄 Database Schema

```prisma
model Contact {
	id             Int       @id @default(autoincrement())
	phoneNumber    String?
	email          String?
	linkedId       Int?
	linkPrecedence String
	createdAt      DateTime  @default(now())
	updatedAt      DateTime  @updatedAt
	deletedAt      DateTime?

	linkedContact  Contact?  @relation("ContactLink", fields: [linkedId], references: [id])
	secondaryLinks Contact[] @relation("ContactLink")
}
```

---

# 🛡 Design Decisions

- Oldest contact always becomes primary (deterministic rule)
- No duplicate emails or phone numbers in response
- Cluster merging handled transactionally
- Business logic separated into service layer
- Re-fetching final cluster ensures response consistency

---

# 🧪 Edge Cases Handled

- Duplicate requests
- Concurrent identity merges
- Multiple primary resolution
- Partial data overlaps
- New identity creation
- Reconciliation across multiple clusters

---

# 📦 Tech Stack

- **Runtime:** Bun v1.3.9
- **Framework:** Express
- **ORM:** Prisma
- **Database:** PostgreSQL
