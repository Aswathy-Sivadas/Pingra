import {create} from 'zustand';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';
import { useAuthStore } from './useAuthStore';
import { encryptMessage, decryptMessage, encryptImage, decryptImage } from '../lib/crypto';


// helper: decrypt a single message using our key pair + the other user's public key
async function decryptMsg(msg, myKeyPair, otherPublicKey) {
    // decrypt text
    let text = msg.text;
    if (msg.text && msg.iv && myKeyPair && otherPublicKey) {
        try {
            text = await decryptMessage(msg.text, msg.iv, myKeyPair.privateKey, otherPublicKey);
        } catch (err) {
            console.warn("[E2EE] Text decrypt failed:", err.name, err.message, "| iv:", msg.iv?.slice(0, 10), "| pubKey:", otherPublicKey?.slice(0, 20));
            text = "[🔑 Encrypted with old key — unavailable]";
        }
    }
    // decrypt image
    let image = msg.image;
    let imageDecryptFailed = false;
    if (msg.image && msg.imageIv && myKeyPair && otherPublicKey) {
        try {
            image = await decryptImage(msg.image, msg.imageIv, myKeyPair.privateKey, otherPublicKey);
        } catch (err) {
            console.warn("[E2EE] Image decrypt failed:", err.name, err.message);
            image = null;
            imageDecryptFailed = true;
        }
    }
    return { ...msg, text, image, imageDecryptFailed };
}

// helper: decrypt an array of messages
async function decryptMessages(msgs, myKeyPair, selectedUser) {
    if (!myKeyPair || !selectedUser?.publicKey) return msgs;
    return Promise.all(
        msgs.map((msg) => decryptMsg(msg, myKeyPair, selectedUser.publicKey))
    );
}


export const useChatStore = create((set, get)=>({
    allContacts: [],
    chats: [],
    messages: [],
    activeTab: "chats",
    selectedUser: null,
    isUserLoading: false,
    isMessagesLoading: false,
    isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled"))=== true,

    toggleSound: ()=>{
        localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
        set({isSoundEnabled: !get().isSoundEnabled});

    },
    setActiveTab: (tab)=> set({activeTab: tab}),
    setSelectedUser: (selectedUser)=> set({selectedUser}),
    getAllContacts: async()=>{
        set({isUserloading: true})
        try{
        const res= await axiosInstance.get("/messages/contacts");
        set({allContacts: res.data})}
        catch(error){toast.error(error.response.data.message)}
        finally{
            set({isUserloading: false})
        }

    },
    getMyChatPartners: async()=>{
        set({ isUserLoading: true});
        try{
            const res= await axiosInstance.get("/messages/chats");
            set({chats:res.data});
        }
        catch(error)
        {
            toast.error(error.response.data.message);
        }
        finally{
            set({isUserLoading: false});
        }
    },
    getMessagesByUserId: async(userId)=>{
        set({isMessagesLoading: true});
        try{
            const res= await axiosInstance.get(`/messages/${userId}`)
            const {myKeyPair} = useAuthStore.getState();
            let {selectedUser} = get();

            // fetch fresh public key for decryption (don't set selectedUser to avoid re-render loop)
            try {
                const keyRes = await axiosInstance.get(`/messages/key/${userId}`);
                if (keyRes.data.publicKey) {
                    selectedUser = { ...selectedUser, publicKey: keyRes.data.publicKey };
                }
            // eslint-disable-next-line no-empty
            } catch {}

            const decrypted = await decryptMessages(res.data, myKeyPair, selectedUser);
            set({messages: decrypted})
        }
        catch(error){
            toast.error(error?.response?.data?.message || "Something went wrong")
        }
        finally{
            set({isMessagesLoading: false})
        }
    },
    sendMessage: async(messageData)=>{
        const {selectedUser, messages}= get();
        const {authUser, myKeyPair}=useAuthStore.getState();

        // fetch recipient's public key — always fetch fresh to avoid stale key issues
        let recipientPubKey;
        try {
            const keyRes = await axiosInstance.get(`/messages/key/${selectedUser._id}`);
            recipientPubKey = keyRes.data.publicKey;
        } catch (err) {
            console.error("Failed to fetch recipient public key:", err);
            recipientPubKey = selectedUser.publicKey;
        }

        // encrypt text — require encryption, do not fall back to plaintext
        let encryptedData = { ...messageData };
        if (!myKeyPair) {
            console.error("E2EE send blocked — own key pair is missing");
            toast.error("Cannot send: your encryption keys are missing. Try logging out and back in.");
            return;
        }
        if (!recipientPubKey) {
            console.error("E2EE send blocked — recipient has no public key");
            toast.error("Cannot send: recipient hasn't set up encryption yet. They need to log in again.");
            return;
        }
        if (messageData.text) {
            const { ciphertext, iv } = await encryptMessage(
                messageData.text,
                myKeyPair.privateKey,
                recipientPubKey
            );
            encryptedData = { ...encryptedData, text: ciphertext, iv };
        }
        if (messageData.image) {
            const { encryptedImage, imageIv } = await encryptImage(
                messageData.image,
                myKeyPair.privateKey,
                recipientPubKey
            );
            encryptedData = { ...encryptedData, image: encryptedImage, imageIv };
        }

        const tempId= `temp-${Date.now()}`;
        const optimisticMessage ={
            _id: tempId,
            senderId: authUser._id,
            receiverId: selectedUser._id,
            text: messageData.text, // show plaintext locally
            image: messageData.image,
            createdAt: new Date().toISOString(),
            isOptimistic: true,
        };
        set({messages: [...messages,optimisticMessage]})
        try{
            const res= await axiosInstance.post(`/messages/send/${selectedUser._id}`, encryptedData)
            // replace optimistic msg with server response (decrypted)
            const decrypted = await decryptMsg(res.data, myKeyPair, recipientPubKey);
            set({messages: messages.concat(decrypted)})

            // Bubble the selected user to the top of the chat list
            const { chats } = get();
            const exists = chats.find(c => c._id === selectedUser._id);
            if (exists) {
                set({ chats: [exists, ...chats.filter(c => c._id !== selectedUser._id)] });
            }
        }
        catch(error){
            set({messages: messages})
            toast.error(error.response?.data?.message || "Something went wrong!")
        }
    },
    subscribeToMessages:()=>{
        const {selectedUser, isSoundEnabled} = get();
        const notificationSound = new Audio("/notification.mp3");
        if(!selectedUser) return;
        const socket = useAuthStore.getState().socket;
        if(!socket) return;

        socket.on("newMessage", async (newMessage)=>{
            const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id || newMessage.receiverId === selectedUser._id;
            if(!isMessageSentFromSelectedUser) return;

            // fetch fresh public key of the other user before decrypting
            const {myKeyPair} = useAuthStore.getState();
            let otherPubKey = selectedUser.publicKey;
            try {
                const keyRes = await axiosInstance.get(`/messages/key/${selectedUser._id}`);
                if (keyRes.data.publicKey) otherPubKey = keyRes.data.publicKey;
            // eslint-disable-next-line no-empty
            } catch {}

            let decrypted = newMessage;
            if (myKeyPair && otherPubKey) {
                decrypted = await decryptMsg(newMessage, myKeyPair, otherPubKey, useAuthStore.getState().authUser._id);
            }

            const currentMessages= get().messages;
            set({messages: [...currentMessages, decrypted]})

            // Bubble the sender to the top of the chat list
            const { chats } = get();
            const senderId = newMessage.senderId;
            const senderChat = chats.find(c => c._id === senderId);
            if (senderChat) {
                set({ chats: [senderChat, ...chats.filter(c => c._id !== senderId)] });
            }

            if(isSoundEnabled)
            {
                notificationSound.currentTime=0;
                notificationSound.play().catch(e=>{ console.log("Audio play failed:", e); });
            }
        })
    },
    unsubscribeFromMessages:()=>{ 
        const socket = useAuthStore.getState().socket;
        if(!socket) return;
        socket.off("newMessage");
    },
    clearChat: async()=>{
        const {selectedUser} = get();
        if(!selectedUser) return;
        try {
            await axiosInstance.delete(`/messages/clear/${selectedUser._id}`);
            // Remove from chat list immediately and deselect the user
            const { chats } = get();
            set({
                messages: [],
                chats: chats.filter(c => c._id !== selectedUser._id),
                selectedUser: null,
            });
            toast.success("Chat history cleared");
        } catch(error) {
            toast.error(error?.response?.data?.message || "Failed to clear chat");
        }
    }

}))