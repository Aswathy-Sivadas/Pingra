import {create} from 'zustand';
import { axiosInstance } from '../lib/axios';

export const useChatStore = create((set, get)=>({
    allContacts: [],
    chats: [],
    messages: [],
    activeTab: "chats",
    selectedUSer: null,
    isUserloading: false,
    isMessagesLoading: false,
    isSoundEnabled: localStorage.getItem("isSoundEnabled")=== true,

    toggleSound: ()=>{
        localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
        set({isSoundEnabled: !get().isSoundEnabled});

    },
    setActiveTab: (tab)=> set({activeTab: tab}),
    setSelectedUser: (selectedUser)=> set({selectedUser}),
    getAllContacts: async()=>{
        set({isUserloading: true})
        try{
        const res= await axiosInstance.get("/messages/getAllContacts");
        set({allContacts: res.data})}
        catch(error){toast.error(error.response.data.message)}
        finally{
            set({isUserloading: false})
        }

    },
    getMyChatPartners: async()=>{
        set({ isUserloading: true});
        try{
            const res= axiosInstance.get("/messages/getChatPartners");
            set({chats:res.data});
        }
        catch(error)
        {
            toast.error(error.response.data.message);
        }
        finally{
            set({isUserloading: false});
        }
    }

}))