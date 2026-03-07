import express from 'express';
const router = express.Router();
router.get("/send", (req, res) => {
    res.json({ message: "Send message endpoint" });
}   );
router.get("/receive", (req, res) => {
    res.json({ message: "Receive message endpoint" });
});

export default router;