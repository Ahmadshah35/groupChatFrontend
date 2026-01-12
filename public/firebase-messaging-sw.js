// firebase-messaging-sw.js
/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBp-ylR_E-v9WNnW-4FetYwA_hiQ19zhnw",
  authDomain: "groupchat-6947b.firebaseapp.com",
  projectId: "groupchat-6947b",
  storageBucket: "groupchat-6947b.firebasestorage.app",
  messagingSenderId: "43298277263",
  appId: "1:43298277263:web:a3317a2af431ccc93a2dfa",
  measurementId: "G-JX07T3XFJ6"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("🔔 Received background message:", payload);

  const notificationTitle = payload.notification?.title || "New Message";
  const notificationBody = payload.notification?.body || "You have a new message";
  
  // Get data from payload
  const chatId = payload.data?.chatId || payload.notification?.data?.chatId;
  const type = payload.data?.type || payload.notification?.data?.type || "direct";
  
  console.log("📦 Notification data:", { chatId, type });

  const notificationOptions = {
    body: notificationBody,
    icon: "/icon.png",
    badge: "/badge.png",
    data: {
      chatId: chatId,
      type: type,
    },
    requireInteraction: false,
    tag: chatId, // Prevent duplicate notifications
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("👆 Notification clicked:", event);
  console.log("📦 Notification data:", event.notification.data);
  
  event.notification.close();

  const data = event.notification.data || {};
  const chatId = data.chatId;
  const type = data.type || "direct";
  
  console.log("🔍 Opening chat - chatId:", chatId, "type:", type);
  
  // Build URL with chat parameter
  let urlToOpen = "https://chat.apiforapp.link";
  if (chatId) {
    urlToOpen = `https://chat.apiforapp.link/?openChat=${chatId}&type=${type}`;
  }
  
  console.log("🔗 URL to open:", urlToOpen);

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      console.log("🪟 Found", clientList.length, "open windows");
      
      // Check if there's already a window open to the app
      for (const client of clientList) {
        if (client.url.includes("chat.apiforapp.link") && "focus" in client) {
          console.log("✅ Found existing window, focusing and posting message");
          // Focus the window and navigate to the chat
          client.focus();
          client.postMessage({ 
            action: "openChat", 
            chatId: chatId, 
            type: type 
          });
          return Promise.resolve();
        }
      }
      // If no window is open, open a new one
      console.log("🆕 No existing window, opening new one");
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

