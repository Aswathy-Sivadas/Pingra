import React from 'react'
import {useState, useRef} from 'react';
import {LogOutIcon, VolumeOffIcon, Volume2Icon, RefreshCw} from "lucide-react";
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';

const mouseClickSound = new Audio("/sounds/mouse-click.mp3");
function ProfileHeader() {
    const {logout, authUser, updateProfile} = useAuthStore();
    const {isSoundEnabled, toggleSound} = useChatStore();
    const [selectedImg, setSelectedImg] = useState(null);
    const fileInputRef= useRef(null)
    const handleImageUpload = (e)=>{
        const file= e.target.files[0]
        if(!file) return

        const reader = new FileReader();
        reader.readAsDataURL(file)
        reader.onloadend = async()=>{
            const base64Image = reader.result;
            setSelectedImg(base64Image);
            await updateProfile({profilePic: base64Image});
        }
    }
  return(
    <div className="p-6 border-b border-slate-700/50">
      <div className="flex items-center justify-center mb-4">
        <span className="text-lg font-extrabold text-cyan-400 tracking-wide">Pingra</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* AVATAR */}
          <div className="avatar avatar-online">
            <button
              className="size-14 rounded-full overflow-hidden relative group"
              onClick={() => fileInputRef.current.click()}
            >
              <img
                src={selectedImg || authUser.profilePic || "/avatar.png"}
                alt="User image"
                className="size-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-white text-xs">Change</span>
              </div>
            </button>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
            {/* USERNAME & ONLINE TEXT */}
            <div>
                <h3 className="text-slate-200 font-medium text-base max-w-[180px] truncate">
                    {authUser.fullName}
                </h3>
                <p className="text-slate-400 text-xs">Online</p>
            </div>

            </div>
            {/* BUTTONS */}
            <div className="flex gap-4 items-center">
                {/* LOGOUT BTN */}
                <button title="Log out" className="text-slate-400 hover:text-slate-200 transition-colors" onClick={logout}>
                    <LogOutIcon className="size-5" />
                </button>
                {/* SOUND TOGGLE BTN */}
                <button title={isSoundEnabled ? "Mute sounds" : "Unmute sounds"} className="text-slate-400 hover:text-slate-200 transition-colors"
                onClick={()=>{
                    mouseClickSound.currentTime =0;
                    mouseClickSound.play().catch((error)=> console.log("Audio play failed:", error));
                    toggleSound();
                }}
                >
                    {isSoundEnabled?(<Volume2Icon className="size-5"/>):
                    (<VolumeOffIcon className="size-5"/>)}
                </button>
                {/* Temporary: Rotate keys button for testing */}
                <button
                  title="Rotate keys"
                  className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-2"
                  onClick={async ()=>{
                    try {
                      const rotate = useAuthStore.getState().rotateKeys;
                      await rotate();
                      // fetch updated server user via axiosInstance (has correct baseURL)
                      const res = await axiosInstance.get('/auth/check');
                      toast.success('Keys rotated. server keyVersion: ' + (res.data.keyVersion ?? 'unknown'));
                    } catch (err) {
                      console.error('Rotate failed:', err);
                      toast.error('Key rotation failed');
                    }
                  }}
                >
                  <RefreshCw className="size-5" />
                </button>
            </div>
        </div>

    </div>
  )
}

export default ProfileHeader
