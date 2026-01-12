import { useEffect } from "react";
import { IoClose } from "react-icons/io5";
import { FaUserCircle } from "react-icons/fa";
import { MdGroup } from "react-icons/md";

export default function NotificationToast({ notification, onClose, onClick }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto close after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!notification) return null;

  const isGroup = notification.type === "group";

  return (
    <div
      className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 shadow-2xl rounded-lg p-4 min-w-[320px] max-w-[400px] animate-slideIn cursor-pointer hover:shadow-3xl transition-all"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Avatar/Icon */}
        <div className="flex-shrink-0">
          {isGroup ? (
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <MdGroup className="text-white text-2xl" />
            </div>
          ) : (
            <FaUserCircle className="text-gray-400 text-5xl" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">
                {isGroup ? notification.groupName : notification.senderName}
              </p>
              {isGroup && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {notification.senderName}
                </p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <IoClose className="text-xl" />
            </button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
            {notification.message}
          </p>

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {new Date(notification.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
