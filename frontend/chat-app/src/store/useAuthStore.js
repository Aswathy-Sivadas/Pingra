import {create} from 'zustand';
import { axiosInstance } from '../lib/axios';
import {toast} from "react-hot-toast"
import {io} from "socket.io-client";
import { generateKeyPair, getMyKeyPair, rotateKeyPair, getMyPublicKeyB64 } from '../lib/crypto';


const BASE_URL = import.meta.env.MODE === "development"? "http://localhost:3000" : "/"
export const useAuthStore = create((set,get) =>({
    authUser:null,
    isCheckingAuth: true,
    isSigningUp: false,
    isLoggingIn: false,
    isLoggingOut: false,
    isUpdatingProfile: false,
    socket: null,
    onlineUsers:[],
    myKeyPair: null,
    checkAuth: async()=>{
        try{
            const res= await axiosInstance.get("/auth/check");
            set({authUser: res.data})
            // load E2EE key pair from IndexedDB, regenerate if missing
            let kp = await getMyKeyPair();
            if(!kp) {
                const publicKey = await generateKeyPair();
                kp = await getMyKeyPair();
                await axiosInstance.put("/auth/update-public-key", { publicKey });
            } else {
                // verify local keys match what the server has; re-upload if out of sync
                const localPub = await getMyPublicKeyB64();
                if (localPub && localPub !== res.data.publicKey) {
                    console.log("Key mismatch detected — re-uploading public key");
                    await axiosInstance.put("/auth/update-public-key", { publicKey: localPub });
                }
            }
            if(kp) set({ myKeyPair: kp });
            get().connectSocket()
        }
        catch(error)
        {
            console.log("Error in authCheck:", error);
            set({authUser: null})
        }
        finally{
            set({isCheckingAuth: false})
        }
    },
    signup: async(data)=>{
        set({isSigningUp: true});
        try{
            // generate E2EE key pair and send public key to server
            const publicKey = await generateKeyPair();
            const res= await axiosInstance.post("/auth/signup", { ...data, publicKey });
            set({authUser: res.data});
            const kp = await getMyKeyPair();
            if(kp) set({ myKeyPair: kp });
            toast.success("Account created successfully!")
            get().connectSocket()
        }
        catch(error){
            toast.error(error?.response?.data?.message || "Signup failed")
        }
        finally{
            set({isSigningUp: false})
        }
    },
    login: async(data)=>{
        set({isLoggingIn: true});
        try{
            const res= await axiosInstance.post("/auth/login", data);
            set({authUser: res.data});
            // load E2EE key pair from IndexedDB, regenerate if missing
            let kp = await getMyKeyPair();
            if(!kp) {
                const publicKey = await generateKeyPair();
                kp = await getMyKeyPair();
                // upload new public key to server
                await axiosInstance.put("/auth/update-public-key", { publicKey });
            } else {
                // verify local keys match what the server has; re-upload if out of sync
                const localPub = await getMyPublicKeyB64();
                if (localPub && localPub !== res.data.publicKey) {
                    console.log("Key mismatch detected — re-uploading public key");
                    await axiosInstance.put("/auth/update-public-key", { publicKey: localPub });
                }
            }
            if(kp) set({ myKeyPair: kp });
            toast.success("logged in successfully!");
            get().connectSocket()
        }
        catch(error){
            toast.error(error?.response?.data?.message || "Login failed");
        }
        finally{
            set({isLoggingIn: false});
        }
    },
    logout: async()=>{
        set({isLoggingOut:true});
        try{
            await axiosInstance.post("/auth/logout");
            set({authUser: null});
            toast.success("Logged out successfully!")
            get().disconnectSocket();
        }
        catch(error){
            toast.error(error?.response?.data?.message || "Logout failed");
            console.log("error message:",error.message)
        }
        finally{
            set({isLoggingOut: false})
        }
    },
    updateProfile: async(data)=>{
        set({isUpdatingProfile: true});
        try{
            const res = await axiosInstance.put("/auth/update-profile", data)
            set({authUser: res.data})
            toast.success("Profile updated successfully");
        }catch(error){
            console.log("error in update profile:", error);
            toast.error(error?.response?.data?.message || "Update failed");
        }
        finally{
            set({isUpdatingProfile: false})
        }
    },
    connectSocket: ()=>{
        const {authUser}= get()
        if(!authUser || get().socket?.connected) return

        const socket = io(BASE_URL,{ withCredentials:true //this ensures cookies are sent with connection
            })

        socket.connect()
        set({socket: socket})

        //listen for online users event

        socket.on("getOnlineUsers",(userIds)=>{
            set({onlineUsers: userIds})
        })
    },
    disconnectSocket: ()=>{
        if(get().socket?.connected) get().socket.disconnect();
    },
    rotateKeys: async()=>{
        try {
            const newPublicKey = await rotateKeyPair();
            await axiosInstance.put("/auth/update-public-key", { publicKey: newPublicKey });
            const kp = await getMyKeyPair();
            if(kp) set({ myKeyPair: kp });
            toast.success("Encryption keys rotated successfully! Note: old messages cannot be decrypted with new keys.");
        } catch(error) {
            console.error("Key rotation failed:", error);
            toast.error("Key rotation failed");
        }
    }
}))