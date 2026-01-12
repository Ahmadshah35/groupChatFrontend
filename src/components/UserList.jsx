export default function UserList({ users, selectUser, onlineUsers }) {
  return (
    <div>
      <h3>Users</h3>
      {users.map((u) => (
        <div key={u._id} onClick={() => selectUser(u)}>
          {u.name}
          {onlineUsers.includes(u._id) && " 🟢"}
        </div>
      ))}
    </div>
  );
}
