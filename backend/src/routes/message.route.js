import express from 'express';
import { getAllContacts, getMessagesByUserId, sendMessage , getChatPartners, getkey, clearChat} from '../controllers/message.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';
const router = express.Router();
import User from '../models/User.js';
router.use(protectRoute);
router.get("/contacts",getAllContacts);
router.get("/chats", getChatPartners);
router.get("/key/:id", getkey);
router.delete("/clear/:id", clearChat);
router.get("/:id",getMessagesByUserId);
router.post("/send/:id", sendMessage);


export default router;