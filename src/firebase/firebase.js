import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Your Firebase configuration
// Replace with your actual Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBp-ylR_E-v9WNnW-4FetYwA_hiQ19zhnw",
  authDomain: "groupchat-6947b.firebaseapp.com",
  projectId: "groupchat-6947b",
  storageBucket: "groupchat-6947b.firebasestorage.app",
  messagingSenderId: "43298277263",
  appId: "1:43298277263:web:a3317a2af431ccc93a2dfa",
  measurementId: "G-JX07T3XFJ6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
let messaging = null;

try {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    messaging = getMessaging(app);
  }
} catch (error) {
  console.error("Firebase messaging initialization error:", error);
}

// Request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    if (!messaging) {
      console.log("Messaging not supported");
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission === "granted") {
      console.log("Notification permission granted");
      
      // VAPID key - Get from Firebase Console > Project Settings > Cloud Messaging
      const vapidKey = "BK8FNl0xLs1hvIoxA4Jo7C8ZNg3GNx07Ey-H8tOBe9JQRLhzxnCU3UXS5Nr4nwXNZcYIE0dzpppe5P5CsMfNEBc";
      
      // Skip FCM token if VAPID key not configured yet
      if (vapidKey === "YOUR_VAPID_KEY") {
        console.log("⚠️ VAPID key not configured - Push notifications disabled");
        console.log("Get your VAPID key from: Firebase Console > Project Settings > Cloud Messaging");
        return null;
      }
      
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: vapidKey,
      });
      
      if (token) {
        console.log("FCM Token:", token);
        return token;
      } else {
        console.log("No registration token available");
        return null;
      }
    } else {
      console.log("Notification permission denied");
      return null;
    }
  } catch (error) {
    console.error("Error getting notification permission:", error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) {
      return;
    }
    
    onMessage(messaging, (payload) => {
      console.log("Foreground message received:", payload);
      resolve(payload);
    });
  });

export { messaging };
