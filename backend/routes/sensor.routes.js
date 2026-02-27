import express from "express";
import Energy from "../Models/energy.model.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const data = await Energy.create(req.body);
  res.json(data);
});

export default router;