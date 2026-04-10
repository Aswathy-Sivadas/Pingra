import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { getCachedPublicKey, setCachedPublicKey } from "../lib/redis.js";


export const getAllContacts = async(req, res) => {
    try{
        const loggedInUserId = req.user._id;
        const filteredUsers= await User.find({_id: {$ne: loggedInUserId}}).select("-password");
        res.status(200).json(filteredUsers);
    }catch(error){
        console.log("Error in getAllContacts:", error);
        res.status(500).json({message: "Server error"});
    }
}

export const getMessagesByUserId =  async(req,res)=>{
    try{
        const myId= req.user._id;
        const {id:UserToChatId} =req.params;
        const messages = await Message.find({
            $or: [
                { senderId : myId, receiverId: UserToChatId},
                {senderId: UserToChatId, receiverId: myId},
            ],
        });
        res.status(200).json(messages)
    }catch (error)
    {
        console.log("Error in getMessagesByUserId:", error.message);
        res.status(500).json({message: "Server error"});
    }
}


export const sendMessage= async (req,res)=>{
    try{
        const {text, image, iv, imageIv}=req.body;
        const {id: receiverId} = req.params;
        const senderId = req.user._id;

        if(!text && !image){
            return res.status(400).json({message: "Message cannot be empty"});
        }
        if(senderId.equals(receiverId)){
            return res.status(400).json({message: "Cannot send message to yourself"});
        }
        const receiver = await User.findById(receiverId).select("publicKey");
        if(!receiver){
            return res.status(404).json({message: "Receiver not found"});
        }

        // If receiver has a publicKey and text is present, require it to be encrypted (iv present)
        if(receiver.publicKey && receiver.publicKey.trim() !== "" && text){
            if(!iv || typeof iv !== "string" || iv.trim() === ""){
                return res.status(400).json({message: "Recipient requires encrypted messages (missing iv)"});
            }
            // basic base64 check for ciphertext
            const base64Regex = /^[A-Za-z0-9+/=]+$/;
            if(!base64Regex.test(text)){
                return res.status(400).json({message: "Ciphertext appears invalid"});
            }
        }
        let imageUrl;
        if(image){
            // If image is encrypted (has imageIv), store the blob directly; otherwise upload to cloudinary
            if(imageIv && imageIv.trim() !== ""){
                imageUrl = image; // encrypted data URL stored as-is
            } else {
                const uploadResponse = await cloudinary.uploader.upload(image);
                imageUrl = uploadResponse.secure_url;
            }
        }

        // Persist message to DB and forward to recipient
        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
            iv: iv || "",
            imageIv: imageIv || "",
            isEncrypted: (iv && iv.trim() !== "") || (imageIv && imageIv.trim() !== ""),
        });
        await newMessage.save();

        const receiverSocketId = await getReceiverSocketId(receiverId)
        if(receiverSocketId)
        {
            io.to(receiverSocketId).emit("newMessage", newMessage)
        }
        res.status(201).json(newMessage);
    }catch(error)
    {
        console.log("Error in sendMessage controller:", error);
        res.status(500).json({message: error.message || "Server error"});
}
}



export const getChatPartners = async (req,res)=>{
    try{
        const loggedInUserId = req.user._id;
        // Find the latest message timestamp per chat partner
        const messages = await Message.find({
            $or: [{ senderId: loggedInUserId}, {receiverId: loggedInUserId}]
        }).sort({ createdAt: -1 });

        // Build a map of partnerId -> latest message timestamp (preserving order since messages are sorted desc)
        const latestMap = new Map();
        for (const msg of messages) {
            const partnerId = msg.senderId.toString() === loggedInUserId.toString()
                ? msg.receiverId.toString()
                : msg.senderId.toString();
            if (!latestMap.has(partnerId)) {
                latestMap.set(partnerId, msg.createdAt);
            }
        }

        // Partner IDs already ordered by most recent message (Map preserves insertion order)
        const chatPartnerIds = [...latestMap.keys()];

        const chatPartners = await User.find({_id: {$in:chatPartnerIds}}).select("-password");

        // Re-sort to match the latestMap order (MongoDB $in does not guarantee order)
        const partnerMap = new Map(chatPartners.map(u => [u._id.toString(), u]));
        const sorted = chatPartnerIds.map(id => partnerMap.get(id)).filter(Boolean);

        res.status(200).json(sorted);
    }
    catch(error)
    {
        console.log("error in getchatPartners:", error.message);
        res.status(500).json({error: "Internal server Error"});
    }
}


export const clearChat = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: otherId } = req.params;
        await Message.deleteMany({
            $or: [
                { senderId: myId, receiverId: otherId },
                { senderId: otherId, receiverId: myId },
            ]
        });
        res.status(200).json({ message: "Chat cleared" });
    } catch (error) {
        console.log("Error in clearChat:", error);
        res.status(500).json({ message: "Server error" });
    }
}

export const getkey = async (req, res) => {
    try {
        // 1. Check Redis cache first — fast, no DB hit
        const cached = await getCachedPublicKey(req.params.id);
        if (cached) return res.status(200).json({ publicKey: cached });

        // 2. Cache miss — fetch from MongoDB
        const user = await User.findById(req.params.id).select("publicKey");
        if (!user) return res.status(404).json({ message: "User not found" });

        // 3. Store in Redis for next time (auto-expires in 5 min)
        if (user.publicKey) await setCachedPublicKey(req.params.id, user.publicKey);

        res.status(200).json({ publicKey: user.publicKey });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
}
