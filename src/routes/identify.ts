import { Router } from "express";

const router = Router();

router.post("/", async (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({
      error: "Either email or phoneNumber must be provided",
    });
  }

  // sample response
  return res.status(200).json({
    contact: {
      primaryContatctId: null,
      emails: [],
      phoneNumbers: [],
      secondaryContactIds: [],
    },
  });
});

export default router;