import { useContext, useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { io } from "socket.io-client";
import API from "../api/axios";
import { formatDistanceToNow, format } from "date-fns";
import { BsThreeDotsVertical } from "react-icons/bs";
import { IoMdSend } from "react-icons/io";
import { MdGroup, MdPersonAdd } from "react-icons/md";
import { FaUserCircle } from "react-icons/fa";
import CreateGroupModal from "../components/CreateGroupModal";
import NotificationToast from "../components/NotificationToast";

export default function Chat() {
  const { user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [chatType, setChatType] = useState("users");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const selectedChatRef = useRef(selectedChat);
  const messageCounterRef = useRef(0);
  const isLoadingMoreRef = useRef(false);
  const pendingMessagesRef = useRef({}); // Store messages for inactive chats
  const notificationAudioRef = useRef(null);

  // Initialize notification audio
  useEffect(() => {
    notificationAudioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYHGGS87+mgWBALVKXh8bllHAU2jdXwz3csB");
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Keep selectedChatRef in sync with selectedChat
  useEffect(() => {
    selectedChatRef.current = selectedChat;
    
    // Emit chatOpened when selectedChat changes and socket is connected
    if (selectedChat && socketRef.current?.connected) {
      socketRef.current.emit("chatOpened", { 
        chatId: selectedChat._id, 
        isGroup: selectedChat.isGroup || false
      });
    }
    
    // Cleanup: emit chatClosed when chat changes or component unmounts
    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("chatClosed");
      }
    };
  }, [selectedChat]);

  // Scroll to bottom when messages change (but not when loading more)
  useEffect(() => {
    if (!isLoadingMoreRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    
    console.log("🔌 Initializing socket for user:", user._id);
    
    // Initialize socket connection with better fallback
    socketRef.current = io("https://chat.apiforapp.link", {
      path: "/socket.io/",
      transports: ['polling', 'websocket'], // Start with polling, then upgrade
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      forceNew: false,
      withCredentials: true
    });
    
    const socket = socketRef.current;
    
    // Emit join immediately (backup in case connect event doesn't fire)
    console.log("📤 Emitting join for user:", user._id);
    socket.emit("join", user._id);
    
    // Handle connection events
    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
      console.log("🔌 Transport:", socket.io.engine.transport.name);
      console.log("📤 Re-emitting join for user:", user._id);
      socket.emit("join", user._id);
    });
    
    // Log transport upgrades
    socket.io.engine.on("upgrade", (transport) => {
      console.log("⬆️ Transport upgraded to:", transport.name);
    });
    
    socket.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err.message);
      console.log("🔄 Will retry connection...");
    });
    
    socket.on("disconnect", (reason) => {
      console.warn("⚠️ Socket disconnected:", reason);
    });
    
    socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Socket reconnected after", attemptNumber, "attempts");
      socket.emit("join", user._id);
    });
    
    socket.on("onlineUsers", setOnlineUsers);
    
    console.log("🎧 Setting up socket event listeners...");
    
    socket.on("receiveMessage", (msg) => {
      console.log("🔔 Received direct message:", msg);
      const currentChat = selectedChatRef.current;
      
      // Extract IDs from populated objects or use string IDs
      const msgSenderId = msg.senderId?._id || msg.senderId;
      const msgReceiverId = msg.receiverId?._id || msg.receiverId;
      
      // Don't process messages we sent ourselves (we already have them from API response)
      if (msgSenderId === user._id) {
        console.log("⏭️ Skipping own message (already in UI from API response)");
        return;
      }
      
      // Always emit delivery status if we're the receiver
      if (msgReceiverId === user._id) {
        socket.emit("messageDelivered", { messageId: msg._id, userId: user._id });
      }
      
      // Determine the other user in this conversation
      const otherUserId = msgSenderId === user._id ? msgReceiverId : msgSenderId;
      const chatKey = `direct_${otherUserId}`;
      
      console.log("📍 Message - Sender:", msgSenderId, "Receiver:", msgReceiverId);
      console.log("📍 Current user:", user._id);
      console.log("📍 Other user:", otherUserId);
      console.log("📍 Current chat:", currentChat ? currentChat._id : "none");
      
      // If this chat is currently open, add message immediately
      if (currentChat && !currentChat.isGroup && currentChat._id === otherUserId) {
        console.log("✅ Adding message to current direct chat");
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some(m => m._id === msg._id)) {
            console.log("⚠️ Duplicate message, skipping");
            return prev;
          }
          console.log("✅ Message added to state");
          return [...prev, msg];
        });
      } else {
        console.log("💾 Storing message in pending queue for later");
        // Store for later when chat is opened
        if (!pendingMessagesRef.current[chatKey]) {
          pendingMessagesRef.current[chatKey] = [];
        }
        if (!pendingMessagesRef.current[chatKey].some(m => m._id === msg._id)) {
          pendingMessagesRef.current[chatKey].push(msg);
        }
      }
    });
    
    socket.on("receiveGroupMessage", (msg) => {
      console.log("🔔 Received group message:", msg._id, "for group:", msg.groupId);
      console.log("📦 Full message object:", JSON.stringify(msg, null, 2));
      const currentChat = selectedChatRef.current;
      console.log("📱 Current chat:", currentChat ? `${currentChat.name} (${currentChat._id})` : "none");
      
      // Extract sender ID from populated object or use string ID
      const msgSenderId = msg.senderId?._id || msg.senderId;
      
      // Don't process messages we sent ourselves (we already have them from API response)
      if (msgSenderId === user._id) {
        console.log("⏭️ Skipping own message (already in UI from API response)");
        return;
      }
      
      // Always emit delivery status
      socket.emit("messageDelivered", { messageId: msg._id, userId: user._id });
      
      const chatKey = `group_${msg.groupId}`;
      
      // If this chat is currently open, add message immediately
      if (currentChat && currentChat.isGroup && msg.groupId === currentChat._id) {
        console.log("✅ Adding message to current chat");
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some(m => m._id === msg._id)) {
            console.log("⚠️ Duplicate message, skipping");
            return prev;
          }
          console.log("✅ Message added to state");
          return [...prev, msg];
        });
      } else {
        console.log("💾 Storing message in pending queue for later");
        // Store for later when chat is opened
        if (!pendingMessagesRef.current[chatKey]) {
          pendingMessagesRef.current[chatKey] = [];
        }
        if (!pendingMessagesRef.current[chatKey].some(m => m._id === msg._id)) {
          pendingMessagesRef.current[chatKey].push(msg);
        }
      }
    });
    
    socket.on("typing", ({ senderId, isTyping }) => {
      const currentChat = selectedChatRef.current;
      if (currentChat && senderId === currentChat._id) {
        setIsTyping(isTyping);
      }
    });
    
    socket.on("groupTyping", ({ groupId, senderId, senderName, isTyping }) => {
      const currentChat = selectedChatRef.current;
      if (currentChat && currentChat.isGroup && groupId === currentChat._id && senderId !== user._id) {
        setIsTyping(isTyping ? senderName : false);
      }
    });

    // Handle incoming notification
    socket.on("newMessageNotification", (notificationData) => {
      console.log("🔔 Received notification:", notificationData);
      const currentChat = selectedChatRef.current;
      
      // Only show notification if chat is not currently open or window is not focused
      const shouldShowNotification = 
        !currentChat || 
        (notificationData.type === "direct" && currentChat._id !== notificationData.chatId) ||
        (notificationData.type === "group" && currentChat._id !== notificationData.chatId) ||
        document.hidden;
      
      if (shouldShowNotification) {
        // Show in-app notification
        setNotification(notificationData);
        
        // Play notification sound
        if (notificationAudioRef.current) {
          notificationAudioRef.current.play().catch(err => 
            console.log("Audio play failed:", err)
          );
        }
        
        // Show browser notification if permission granted and window not focused
        if (document.hidden && "Notification" in window && Notification.permission === "granted") {
          const title = notificationData.type === "group" 
            ? `${notificationData.groupName}` 
            : notificationData.senderName;
          
          const body = notificationData.type === "group"
            ? `${notificationData.senderName}: ${notificationData.message}`
            : notificationData.message;
          
          const browserNotification = new Notification(title, {
            body: body,
            icon: "/icon.png", // Add your app icon
            badge: "/badge.png",
            tag: notificationData.chatId,
            requireInteraction: false
          });
          
          browserNotification.onclick = () => {
            window.focus();
            browserNotification.close();
            // Optionally open the chat
            if (notificationData.type === "direct") {
              const userToSelect = users.find(u => u._id === notificationData.senderId);
              if (userToSelect) setSelectedChat(userToSelect);
            } else {
              const groupToSelect = groups.find(g => g._id === notificationData.chatId);
              if (groupToSelect) setSelectedChat(groupToSelect);
            }
          };
        }
      }
    });
    
    socket.on("messageStatusUpdate", ({ messageId, status, deliveredTo, readBy }) => {
      setMessages((prev) => prev.map((msg) => (msg._id === messageId ? { ...msg, status, deliveredTo, readBy } : msg)));
    });
    
    socket.on("newUser", (newUser) => {
      console.log("👤 New user registered:", newUser);
      setUsers((prev) => {
        // Check if user already exists
        const exists = prev.some(u => u._id === newUser._id);
        if (exists) return prev;
        return [newUser, ...prev];
      });
    });
    
    socket.on("newGroup", (group) => {
      console.log("🆕 New group created:", group);
      setGroups((prev) => {
        // Check if group already exists
        const exists = prev.some(g => g._id === group._id);
        if (exists) return prev;
        return [group, ...prev];
      });
    });
    
    socket.on("groupUpdated", (group) => {
      setGroups((prev) => prev.map((g) => (g._id === group._id ? group : g)));
    });
    
    socket.on("removedFromGroup", (groupId) => {
      setGroups((prev) => prev.filter((g) => g._id !== groupId));
      const currentChat = selectedChatRef.current;
      if (currentChat && currentChat._id === groupId) {
        setSelectedChat(null);
        setMessages([]);
      }
    });
    
    console.log("✅ All socket listeners attached");

    return () => {
      socket.off("onlineUsers");
      socket.off("receiveMessage");
      socket.off("receiveGroupMessage");
      socket.off("typing");
      socket.off("groupTyping");
      socket.off("messageStatusUpdate");
      socket.off("newUser");
      socket.off("newGroup");
      socket.off("groupUpdated");
      socket.off("removedFromGroup");
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    API.get("/auth/users").then((res) => setUsers(res.data || [])).catch((err) => console.error("Error fetching users:", err));
    API.get("/group").then((res) => setGroups(res.data || [])).catch((err) => console.error("Error fetching groups:", err));
  }, [user]);

  // Handle notification clicks - open chat from URL params or service worker message
  useEffect(() => {
    if (!user || !users.length || !groups.length) {
      console.log("⏳ Waiting for user data to load...", { user: !!user, usersCount: users.length, groupsCount: groups.length });
      return;
    }

    // Handle URL parameters (from notification click)
    const openChatParam = searchParams.get("openChat");
    const typeParam = searchParams.get("type");
    
    if (openChatParam) {
      console.log("📱 Opening chat from notification URL:", openChatParam, typeParam);
      
      if (typeParam === "group") {
        const group = groups.find(g => g._id === openChatParam);
        console.log("🔍 Looking for group:", openChatParam, "Found:", !!group);
        if (group) {
          console.log("✅ Opening group chat:", group.name);
          openChat(group, true);
          // Clear URL params after a short delay to prevent re-triggering
          setTimeout(() => setSearchParams({}), 100);
        } else {
          console.error("❌ Group not found:", openChatParam);
        }
      } else {
        const userToOpen = users.find(u => u._id === openChatParam);
        console.log("🔍 Looking for user:", openChatParam, "Found:", !!userToOpen);
        if (userToOpen) {
          console.log("✅ Opening direct chat with:", userToOpen.name);
          openChat(userToOpen, false);
          // Clear URL params after a short delay to prevent re-triggering
          setTimeout(() => setSearchParams({}), 100);
        } else {
          console.error("❌ User not found:", openChatParam);
        }
      }
    }

    // Handle service worker messages (when app is already open)
    const handleServiceWorkerMessage = (event) => {
      if (event.data?.action === "openChat") {
        const { chatId, type } = event.data;
        console.log("📱 Opening chat from service worker message:", chatId, type);
        
        // Use URL parameters approach for consistency and to handle race conditions
        // This ensures the chat opens even if users/groups aren't loaded yet
        console.log("🔗 Setting search params to trigger chat opening");
        setSearchParams({ openChat: chatId, type: type || "direct" });
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleServiceWorkerMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, users, groups, searchParams]);

  useEffect(() => {
    if (selectedChat && messages.length > 0 && socketRef.current) {
      messages.forEach((msg) => {
        if (msg.senderId !== user._id && msg.status !== "read") {
          socketRef.current.emit("messageRead", { messageId: msg._id, userId: user._id });
        }
      });
    }
  }, [selectedChat, messages, user]);

  const openChat = async (chat, isGroup = false) => {
    setSelectedChat({ ...chat, isGroup });
    setMessages([]);
    setPage(1);
    setLoading(true);
    isLoadingMoreRef.current = false;
    
    const chatKey = isGroup ? `group_${chat._id}` : `direct_${chat._id}`;
    
    try {
      // Load first page immediately
      const res = await API.get(isGroup
        ? `/group/${chat._id}/messages?page=1&limit=50`
        : `/chat/${chat._id}?page=1&limit=50`
      );

      const apiMessages = res.data.messages || [];
      const pendingMessages = pendingMessagesRef.current[chatKey] || [];

      // Merge API + pending, dedupe by _id, then sort by createdAt ASC
      const allMessages = [...apiMessages, ...pendingMessages].reduce((acc, msg) => {
        if (!acc.some((m) => m._id === msg._id)) acc.push(msg);
        return acc;
      }, []);

      allMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      setMessages(allMessages);
      setHasMore(res.data.pagination?.hasMore || false);

      // Clear pending messages for this chat
      delete pendingMessagesRef.current[chatKey];
      
      // Scroll to bottom after loading first page
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
      
      // Preload remaining pages in background (if more pages exist)
      if (res.data.pagination?.hasMore) {
        const totalPages = res.data.pagination.totalPages;
        console.log(`📚 Preloading ${totalPages - 1} additional pages in background...`);
        
        // Load remaining pages without blocking UI
        setTimeout(async () => {
          try {
            for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
              const pageRes = await API.get(isGroup
                ? `/group/${chat._id}/messages?page=${pageNum}&limit=50`
                : `/chat/${chat._id}?page=${pageNum}&limit=50`
              );
              
              const olderMessages = pageRes.data.messages || [];
              
              // Prepend older messages to state
              setMessages(prev => {
                const merged = [...olderMessages, ...prev];
                // Dedupe
                const unique = merged.reduce((acc, msg) => {
                  if (!acc.some(m => m._id === msg._id)) acc.push(msg);
                  return acc;
                }, []);
                return unique;
              });
              
              console.log(`✅ Preloaded page ${pageNum}/${totalPages}`);
            }
            setHasMore(false); // All pages loaded
            console.log(`✅ All ${totalPages} pages preloaded`);
          } catch (preloadErr) {
            console.error("Error preloading messages:", preloadErr);
          }
        }, 500); // Start after 500ms delay
      }
      
    } catch (err) {
      console.error("Error fetching messages:", err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!selectedChat || loading || !hasMore) return;
    
    isLoadingMoreRef.current = true;
    setLoading(true);
    const nextPage = page + 1;
    
    const container = messagesContainerRef.current;
    const previousScrollHeight = container?.scrollHeight || 0;
    
    try {
      if (selectedChat.isGroup) {
        const res = await API.get(`/group/${selectedChat._id}/messages?page=${nextPage}&limit=50`);
        setMessages((prev) => [...res.data.messages, ...prev]); // Prepend older messages
        setHasMore(res.data.pagination?.hasMore || false);
        setPage(nextPage);
      } else {
        const res = await API.get(`/chat/${selectedChat._id}?page=${nextPage}&limit=50`);
        setMessages((prev) => [...res.data.messages, ...prev]); // Prepend older messages
        setHasMore(res.data.pagination?.hasMore || false);
        setPage(nextPage);
      }
      
      // Restore scroll position after messages are loaded
      setTimeout(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - previousScrollHeight;
        }
        isLoadingMoreRef.current = false;
      }, 100);
    } catch (err) {
      console.error("Error loading more messages:", err);
      isLoadingMoreRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  // Handle scroll to load more messages
  const handleScroll = (e) => {
    const element = e.target;
    if (element.scrollTop < 100 && hasMore && !loading) {
      loadMoreMessages();
    }
  };

  const sendMessage = async () => {
    if (!text.trim() || !selectedChat) return;
    
    const messageText = text;
    messageCounterRef.current += 1;
    const tempId = `temp-${messageCounterRef.current}`;
    setText(""); // Clear input immediately for better UX
    stopTyping();
    
    console.log("📤 Sending message:", messageText);
    console.log("📍 Chat type:", selectedChat.isGroup ? "Group" : "Direct");
    console.log("📍 Chat ID:", selectedChat._id);
    
    // Optimistic update - show message immediately
    const optimisticMessage = {
      _id: tempId,
      message: messageText,
      senderId: selectedChat.isGroup ? user._id : user,
      receiverId: selectedChat.isGroup ? null : selectedChat._id,
      groupId: selectedChat.isGroup ? selectedChat._id : null,
      createdAt: new Date().toISOString(),
      status: "sent",
      deliveredTo: [],
      readBy: [],
    };
    
    setMessages((prev) => [...prev, optimisticMessage]);
    
    try {
      if (selectedChat.isGroup) {
        console.log("📡 Sending to /group/message endpoint...");
        const res = await API.post("/group/message", { groupId: selectedChat._id, message: messageText });
        console.log("✅ Message sent successfully:", res.data);
        // Replace optimistic message with real one
        setMessages((prev) => prev.map(msg => msg._id === tempId ? res.data : msg));
      } else {
        console.log("📡 Sending to /chat endpoint...");
        const res = await API.post("/chat", { receiverId: selectedChat._id, message: messageText });
        console.log("✅ Message sent successfully:", res.data);
        // Replace optimistic message with real one
        setMessages((prev) => prev.map(msg => msg._id === tempId ? res.data : msg));
      }
    } catch (err) {
      console.error("❌ Error sending message:", err);
      console.error("❌ Error details:", err.response?.data || err.message);
      console.error("❌ Status code:", err.response?.status);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter(msg => msg._id !== tempId));
      setText(messageText); // Restore text on error
      alert(`Failed to send message: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    if (!typing && socketRef.current) {
      setTyping(true);
      if (selectedChat) {
        if (selectedChat.isGroup) {
          socketRef.current.emit("groupTyping", { groupId: selectedChat._id, senderId: user._id, senderName: user.name, isTyping: true });
        } else {
          socketRef.current.emit("typing", { receiverId: selectedChat._id, senderId: user._id, isTyping: true });
        }
      }
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => stopTyping(), 1000);
  };

  const stopTyping = () => {
    setTyping(false);
    if (selectedChat && socketRef.current) {
      if (selectedChat.isGroup) {
        socketRef.current.emit("groupTyping", { groupId: selectedChat._id, senderId: user._id, senderName: user.name, isTyping: false });
      } else {
        socketRef.current.emit("typing", { receiverId: selectedChat._id, senderId: user._id, isTyping: false });
      }
    }
  };

  const getLastSeen = (lastSeen) => lastSeen ? formatDistanceToNow(new Date(lastSeen), { addSuffix: true }) : "";

  const getProfileImage = (user) => user.profileImage ? `https://chat.apiforapp.link/api/${user.profileImage}` : null;
  // const getProfileImage = (user) => user.profileImage ? `http://localhost:2000/api/${user.profileImage}` : null;

  if (!user) return <div>Loading...</div>;

  // Handle notification click
  const handleNotificationClick = () => {
    if (notification) {
      if (notification.type === "direct") {
        const userToSelect = users.find(u => u._id === notification.senderId);
        if (userToSelect) setSelectedChat(userToSelect);
      } else {
        const groupToSelect = groups.find(g => g._id === notification.chatId);
        if (groupToSelect) setSelectedChat(groupToSelect);
      }
      setNotification(null);
    }
  };

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Notification Toast */}
      {notification && (
        <NotificationToast
          notification={notification}
          onClose={() => setNotification(null)}
          onClick={handleNotificationClick}
        />
      )}

      <div className="w-1/3 bg-white border-r flex flex-col">
        <div className="p-4 bg-green-600 border-b flex items-center justify-between">
          <div className="flex items-center">
            {user?.profileImage ? (
              <img src={getProfileImage(user)} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center text-xl font-bold">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div className="ml-3">
              <div className="font-bold text-white">{user?.name || "Unknown"}</div>
              <div className="text-xs text-green-100">{user?.about || ""}</div>
            </div>
          </div>
          <button onClick={() => setShowCreateGroup(true)} className="text-white hover:bg-green-700 p-2 rounded-full" title="Create Group">
            <MdPersonAdd size={24} />
          </button>
        </div>
        <div className="flex border-b">
          <button onClick={() => setChatType("users")} className={`flex-1 p-3 font-semibold ${chatType === 'users' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            <FaUserCircle className="inline mr-2" /> Chats
          </button>
          <button onClick={() => setChatType("groups")} className={`flex-1 p-3 font-semibold ${chatType === 'groups' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            <MdGroup className="inline mr-2" /> Groups
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chatType === "users" ? (
            users.map((u) => (
              <div key={u._id} onClick={() => openChat(u, false)} className={`flex items-center p-3 cursor-pointer hover:bg-gray-100 border-b ${selectedChat?._id === u._id && !selectedChat?.isGroup ? "bg-green-50" : ""}`}>
                <div className="relative">
                  {u.profileImage ? (
                    <img src={getProfileImage(u)} alt={u.name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-300 text-white flex items-center justify-center text-xl font-bold">
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  {onlineUsers?.includes(u._id) && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <div className="font-semibold">{u.name}</div>
                  <div className="text-xs text-gray-500">
                    {onlineUsers?.includes(u._id) ? "online" : u.lastSeen ? `last seen ${getLastSeen(u.lastSeen)}` : "offline"}
                  </div>
                </div>
              </div>
            ))
          ) : (
            groups.map((g) => (
              <div key={g._id} onClick={() => openChat(g, true)} className={`flex items-center p-3 cursor-pointer hover:bg-gray-100 border-b ${selectedChat?._id === g._id && selectedChat?.isGroup ? "bg-green-50" : ""}`}>
                <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center text-xl font-bold">
                  <MdGroup size={28} />
                </div>
                <div className="ml-3 flex-1">
                  <div className="font-semibold">{g.name}</div>
                  <div className="text-xs text-gray-500">{g.members?.length || 0} members</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-4 bg-green-600 text-white flex items-center justify-between shadow">
              <div className="flex items-center">
                {selectedChat.isGroup ? (
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <MdGroup size={24} />
                  </div>
                ) : selectedChat.profileImage ? (
                  <img src={getProfileImage(selectedChat)} alt={selectedChat.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-lg font-bold">
                    {selectedChat.name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="ml-3">
                  <div className="font-bold">{selectedChat.name}</div>
                  <div className="text-xs text-green-100">
                    {isTyping ? (
                      <span className="italic">{typeof isTyping === "string" ? `${isTyping} typing...` : "typing..."}</span>
                    ) : selectedChat.isGroup ? (
                      `${selectedChat.members?.length || 0} members`
                    ) : onlineUsers?.includes(selectedChat._id) ? (
                      "online"
                    ) : selectedChat.lastSeen ? (
                      `last seen ${getLastSeen(selectedChat.lastSeen)}`
                    ) : (
                      "offline"
                    )}
                  </div>
                </div>
              </div>
              <BsThreeDotsVertical className="cursor-pointer" size={20} />
            </div>
            <div 
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 p-4 overflow-y-auto" 
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4d4d4' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`, backgroundColor: "#e5ddd5" }}
            >
              {loading && page === 1 && (
                <div className="text-center py-4 text-gray-500">Loading messages...</div>
              )}
              {loading && page > 1 && (
                <div className="text-center py-2 text-gray-500 text-sm">Loading older messages...</div>
              )}
              {messages.map((m, idx) => {
                const isSentByMe = m.senderId === user._id || m.senderId?._id === user._id;
                const senderInfo = m.senderId;
                
                return (
                  <div key={idx} className={`mb-2 flex items-end ${isSentByMe ? "justify-end" : "justify-start"}`}>
                    {/* Show profile image for others' messages in group chat */}
                    {selectedChat.isGroup && !isSentByMe && (
                      <div className="mr-2 flex-shrink-0">
                        {senderInfo?.profileImage ? (
                          <img 
                            src={getProfileImage(senderInfo)} 
                            alt={senderInfo?.name} 
                            className="w-8 h-8 rounded-full object-cover"
                            title={senderInfo?.name}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs font-bold">
                            {senderInfo?.name?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow ${isSentByMe ? "bg-green-100" : "bg-white"}`}>
                      {selectedChat.isGroup && !isSentByMe && (
                        <div className="text-xs font-semibold text-green-600 mb-1">{senderInfo?.name || "Unknown"}</div>
                      )}
                      <div className="break-words">{m.message}</div>
                      <div className="text-xs text-gray-500 mt-1 text-right">
                        {m.createdAt ? format(new Date(m.createdAt), 'h:mm a') : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef}></div>
            </div>
            <div className="p-3 flex items-center border-t bg-white">
              <input 
                className="flex-1 border p-3 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500" 
                value={text} 
                onChange={handleTyping} 
                placeholder="Type a message..." 
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }} 
              />
              <button onClick={sendMessage} className="ml-2 bg-green-600 text-white p-3 rounded-full hover:bg-green-700 transition">
                <IoMdSend size={24} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
            <MdGroup size={80} className="mb-4 text-gray-300" />
            <h2 className="text-2xl font-semibold mb-2">WhatsApp Web</h2>
            <p className="text-center px-8">Select a chat to start messaging or create a new group</p>
          </div>
        )}
      </div>
      {showCreateGroup && (
        <CreateGroupModal users={users} onClose={() => setShowCreateGroup(false)} onGroupCreated={(group) => { setGroups((prev) => [group, ...prev]); setShowCreateGroup(false); }} />
      )}
    </div>
  );
}
