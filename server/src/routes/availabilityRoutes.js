const express = require("express");
const router = express.Router();
const availabilityController = require("../controllers/availabilityController");
const requireRole = require("../middlewares/roleMiddleware");

router.get(
  "/mine",
  requireRole("SPECIALIST"),
  availabilityController.getMySlots,
);
router.post("/", requireRole("SPECIALIST"), availabilityController.createSlot);
router.delete(
  "/:id",
  requireRole("SPECIALIST"),
  availabilityController.deleteSlot,
);

router.get("/:specialistId", availabilityController.getAvailableSlots);

module.exports = router;
