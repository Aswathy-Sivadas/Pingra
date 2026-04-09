import React, { useEffect, useRef, useState } from 'react';
import ChatHeader from './ChatHeader';
import NoChatHistoryPlaceholder from './NoChatHistoryPlaceholder';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import MessageInput from './MessageInput';
import MessagesLoadingSkeleton from './MessagesLoadingSkeleton';

function ChatContainer() {
    const { selectedUser, getMessagesByUserId, messages, isMessagesLoading, subscribeToMessages, unsubscribeFromMessages } = useChatStore();
    const [suggestedText, setSuggestedText] = useState("");
    const { authUser } = useAuthStore();
    const messageEndRef= useRef(null);

    useEffect(() => {
        getMessagesByUserId(selectedUser._id);
        subscribeToMessages();

        //clean up
        return()=> unsubscribeFromMessages();
    }, [selectedUser, getMessagesByUserId])
    useEffect(()=>{
        if(messageEndRef.current)
        {
            messageEndRef.current.scrollIntoView({behaviour:"smooth"});
        }
    },[messages])
    return (
        <div className="flex flex-col h-full">
            <ChatHeader />
            <div className="flex-1 px-6 overflow-y-auto py-8">
                {isMessagesLoading ? (
                    <MessagesLoadingSkeleton/>
                ) : messages.length > 0 ? (
                    <div className="max-w-3xl mx-auto space-y-6">
                        {messages.map(msg => (
                            <div key={msg._id}
                                className={`chat ${msg.senderId === authUser._id
                                    ? "chat-end"
                                    : "chat-start"
                                }`}>
                                <div className={`chat-bubble relative ${msg.senderId === authUser._id
                                    ? "bg-cyan-600 text-white"
                                    : "bg-slate-800 text-slate-200"
                                }`}>
                                    {msg.image && (
                                        <img
                                            src={msg.image}
                                            alt="Shared"
                                            className="rounded-lg h-48 object-cover"
                                        />
                                    )}
                                    {msg.imageDecryptFailed && (
                                        <div className="rounded-lg h-48 w-48 bg-slate-700/50 flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                            <span>[Encrypted image]</span>
                                        </div>
                                    )}
                                    {msg.text && (
                                        <p className="mt-2">{msg.text}</p>
                                    )}
                                    <p className="text-xs mt-1 opacity-75 flex items-center gap-1">
                                        {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <div ref={messageEndRef}/>
                    </div>
                ) : (
                    <NoChatHistoryPlaceholder name={selectedUser.fullName} onSuggestion={setSuggestedText} />
                )}
            </div>

            <MessageInput prefillText={suggestedText} onPrefillConsumed={() => setSuggestedText("")} />
        </div>
    )
}
export default ChatContainer;