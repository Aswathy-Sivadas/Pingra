import React from 'react'
import BorderAnimatedContainer from '../components/BorderAnimatedContainer';
import { useChatStore } from '../store/useChatStore';
import ChatContainer from '../components/ChatContainer';
import NoCoversationPlaceholder from '../components/NoCoversationPlaceholder';
import ContactList from '../components/ContactList';
import ChatList from '../components/ChatList';
import ActiveTabSwitch from '../components/ActiveTabSwitch';
import ProfileHeader from '../components/ProfileHeader';

function ChatPage() {
  const {activeTab, selectedUser} = useChatStore();
  return (
    <div className="relative w-full h-full max-w-6xl md:h-[800px]">
      <BorderAnimatedContainer>
        {/* LEFT SIDE — hidden on mobile when a chat is open */}
        <div className={`
          ${selectedUser ? "hidden md:flex" : "flex"}
          w-full md:w-80 bg-slate-800/50 backdrop-blur-sm flex-col
        `}>
              <ProfileHeader/>
              <ActiveTabSwitch/>

              <div className='flex-1 overflow-y-auto p-4 space-y-2'>
                  {activeTab === "chats"? <ChatList/>: <ContactList/>}
              </div>
        </div>

        {/* RIGHT SIDE — full width on mobile when a chat is open */}
        <div className={`
          ${selectedUser ? "flex" : "hidden md:flex"}
          flex-1 flex-col bg-slate-900/50 backdrop-blur-sm
        `}>
            {selectedUser? <ChatContainer/>: <NoCoversationPlaceholder/>}
        </div>
      </BorderAnimatedContainer>
    </div>
  )
}

export default ChatPage
