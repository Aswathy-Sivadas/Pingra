import React from 'react'
import { useChatStore } from '../store/useChatStore';
import { XIcon, Trash2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';  
import { useAuthStore } from '../store/useAuthStore';

function ChatHeader() {
    const {selectedUser, setSelectedUser, clearChat} = useChatStore();
    const {onlineUsers} = useAuthStore();
    useEffect(()=>{
        const handleEscKey = (event) =>{
                if(event.key === "Escape") setSelectedUser(null);
            
        }
        window.addEventListener("keydown", handleEscKey);
        return () => {
            window.removeEventListener("keydown", handleEscKey);
        };
    },[setSelectedUser])
  return (
    <div className="flex flex-col bg-slate-800/50 border-b border-slate-700/50 px-6">
      {/* E2EE banner */}
      <div className="flex items-center justify-center gap-1 pt-1.5 pb-1 text-emerald-400/70 text-[11px] border-b border-slate-700/40">
        <ShieldCheck className="w-3 h-3 flex-shrink-0" />
        <span>End-to-end encrypted</span>
      </div>
      <div className="flex justify-between items-center py-2.5">
      <div className="flex items-center space-x-2">
        {/* Back button — mobile only */}
        <button
          className="md:hidden text-slate-400 hover:text-slate-200 transition-colors p-1 -ml-1"
          onClick={() => setSelectedUser(null)}
          aria-label="Back"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className={`avatar ${onlineUsers.includes(selectedUser._id) ? "avatar-online": "avatar-offline"}`}>
            <div className="w-12 rounded-full">
                <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName}/>
            </div>
        </div>
        <div>
            <h3 className='text-slate-200 font-medium'>{selectedUser.fullName}</h3>
            <p className='text-slate-400 text-sm'>{onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          title="Clear chat history"
          onClick={()=>{ if(window.confirm("Delete all messages in this chat?")) clearChat(); }}
          className="text-slate-400 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
        <button title="Close chat" onClick={() => setSelectedUser(null)}>
          <XIcon className="w-5 h-5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer" />
        </button>
      </div>
      </div>
    </div>
  )
}

export default ChatHeader
