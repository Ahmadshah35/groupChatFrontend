import Message from "./Message";

export default function ChatBox({ messages, userId }) {
  return (
    <div>
      {messages.map((msg) => (
        <Message key={msg._id} msg={msg} userId={userId} />
      ))}
    </div>
  );
}
