import { Server } from "socket.io";
import http from "http";
import express from "express";
import {ENV} from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "./cloudinary.js";
import {
    setUserSocket,
    removeUserSocket,
    getReceiverSocketId,
    getOnlineUserIds,
} from "./redis.js";

const app=express()
const server= http.createServer(app)
const io= new Server(server,{
    cors: {
        origin: [ENV.CLIENT_URL],
        credentials: true,
    },
    maxHttpBufferSize: 10e6, // 10 MB for encrypted image payloads
})

io.use(socketAuthMiddleware)

// getReceiverSocketId is now imported from redis.js (async)
export { getReceiverSocketId };

io.on("connection", async (socket)=>{
    console.log("A user connected", socket.user.fullName);
    const userId=socket.userId
    await setUserSocket(userId, socket.id);
    //io.emit() is used to send events to all connected clients
    const onlineIds = await getOnlineUserIds();
    io.emit("getOnlineUsers", onlineIds);

    //with socket.on we listen for events fro clients
    socket.on("disconnect", async ()=>{
        console.log("A user disconnected", socket.user.fullName);
        await removeUserSocket(userId);
        const onlineIds = await getOnlineUserIds();
        io.emit("getOnlineUsers", onlineIds);
    })

    // Forward messages received over socket to recipient
    socket.on("sendMessage", async (payload) => {
        try {
            // payload: { to, text, image, iv, imageIv }
            const senderId = socket.user._id;
            const receiverId = payload.to;
            const { text, image, iv, imageIv } = payload;

            if (!text && !image) {
                return socket.emit("messageError", { message: "Message cannot be empty" });
            }
            if (senderId.toString() === receiverId) {
                return socket.emit("messageError", { message: "Cannot send message to yourself" });
            }

            const receiver = await User.findById(receiverId).select("publicKey");
            if (!receiver) {
                return socket.emit("messageError", { message: "Receiver not found" });
            }

            // If receiver has a publicKey and text is present, require iv (encrypted payload)
            if (receiver.publicKey && receiver.publicKey.trim() !== "" && text) {
                if (!iv || typeof iv !== "string" || iv.trim() === "") {
                    return socket.emit("messageError", { message: "Recipient requires encrypted messages (missing iv)" });
                }
                const base64Regex = /^[A-Za-z0-9+/=]+$/;
                if (!base64Regex.test(text)) {
                    return socket.emit("messageError", { message: "Ciphertext appears invalid" });
                }
            }

            let imageUrl;
            if (image) {
                if (imageIv && imageIv.trim() !== "") {
                    imageUrl = image;
                } else {
                    const uploadResponse = await cloudinary.uploader.upload(image);
                    imageUrl = uploadResponse.secure_url;
                }
            }

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

            const receiverSocketId = await getReceiverSocketId(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("newMessage", newMessage);
            }

            socket.emit("messageSaved", newMessage);
        } catch (err) {
            console.error("Socket sendMessage error:", err);
            socket.emit("messageError", { message: "Failed to send message" });
        }
    });

});


export {io, app, server};



