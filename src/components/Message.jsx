import { format } from 'date-fns';

export default function Message({ msg, userId, isGroup }) {
  const isMine = msg.senderId?._id === userId || msg.senderId === userId;
  const senderName = msg.senderId?.name || 'Unknown';
  
  // Format time (e.g., "10:30 AM")
  const messageTime = msg.createdAt 
    ? format(new Date(msg.createdAt), 'h:mm a')
    : '';

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
          isMine
            ? 'bg-green-500 text-white'
            : 'bg-gray-200 text-gray-800'
        }`}
      >
        {/* Show sender name in groups (if not mine) */}
        {isGroup && !isMine && (
          <p className="text-xs font-semibold mb-1 opacity-70">
            {senderName}
          </p>
        )}
        
        {/* Message text */}
        <p className="text-sm break-words">{msg.message}</p>
        
        {/* Time and status */}
        <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${isMine ? 'text-white/70' : 'text-gray-500'}`}>
          <span>{messageTime}</span>
        </div>
      </div>
    </div>
  );
}

