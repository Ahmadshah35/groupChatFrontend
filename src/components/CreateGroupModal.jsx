import { useState } from "react";
import API from "../api/axios";
import { MdClose } from "react-icons/md";

export default function CreateGroupModal({ users, onClose, onGroupCreated }) {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleMember = (userId) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }

    if (selectedMembers.length === 0) {
      setError("Please select at least one member");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await API.post("/group/create", {
        name: groupName,
        description: groupDescription,
        members: selectedMembers,
      });

      onGroupCreated(res.data);
    } catch (err) {
      console.error("Error creating group:", err);
      setError(err.response?.data?.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-green-600 text-white flex items-center justify-between">
          <h2 className="text-xl font-bold">Create New Group</h2>
          <button
            onClick={onClose}
            className="hover:bg-green-700 p-1 rounded-full"
          >
            <MdClose size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto">
          {error && (
            <div className="bg-red-100 text-red-600 p-2 mb-3 text-sm rounded">
              {error}
            </div>
          )}

          {/* Group Name */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">
              Group Name *
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          {/* Group Description */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">
              Description (Optional)
            </label>
            <textarea
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Enter group description"
              rows="3"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
            />
          </div>

          {/* Select Members */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">
              Select Members * ({selectedMembers.length} selected)
            </label>
            <div className="border rounded max-h-60 overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user._id}
                  onClick={() => toggleMember(user._id)}
                  className={`flex items-center p-3 cursor-pointer hover:bg-gray-100 border-b ${
                    selectedMembers.includes(user._id) ? "bg-green-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(user._id)}
                    onChange={() => {}}
                    className="mr-3 w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <div className="flex items-center flex-1">
                    {user.profileImage ? (
                      <>
                        <img
                          src={`https://chat.apiforapp.link/api/${user.profileImage}`}
                          // src={`http://localhost:2000/api/${user.profileImage}`}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover mr-3"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="w-10 h-10 rounded-full bg-gray-300 text-white items-center justify-center text-lg font-bold mr-3 hidden">
                          {user.name?.[0]?.toUpperCase()}
                        </div>
                      </>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 text-white flex items-center justify-center text-lg font-bold mr-3">
                        {user.name?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.about}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={createGroup}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
