import { Router } from "express";
import { reconcileContact } from "../services/reconcileContact";

const router = Router();

router.post("/", async (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({
      error: "Either email or phoneNumber must be provided",
    });
  }

  const result = await reconcileContact({ email, phoneNumber });

  return res.status(200).json({
    contact: {
      primaryContatctId: result.primaryId,
      emails: result.emails,
      phoneNumbers: result.phoneNumbers,
      secondaryContactIds: result.secondaryIds,
    },
  });
});

export default router;