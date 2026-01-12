import { useState } from "react";
import API from "../api/axios";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [data, setData] = useState({ name: "", email: "", password: "", about: "" });
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const register = async () => {
    // Basic validation
    if (!data.name || !data.email || !data.password) {
      setError("Name, email and password are required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("email", data.email);
      formData.append("password", data.password);
      formData.append("about", data.about || "Hey there! I am using Ahmad's ChatApp.");
      if (profileImage) {
        formData.append("profileImage", profileImage);
      }

      await API.post("/auth/signup", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      alert("Account created successfully!");
      navigate("/login");
    } catch (err) {
      const msg =
        err.response?.data?.message || "Something went wrong. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-4 text-green-600">
          Create Account
        </h2>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="bg-red-100 text-red-600 p-2 mb-3 text-sm rounded">
            {error}
          </div>
        )}

        {/* Profile Image Upload */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-2">
            {imagePreview ? (
              <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl text-gray-400">👤</span>
            )}
          </div>
          <label className="cursor-pointer text-green-600 text-sm font-semibold hover:underline">
            Choose Profile Picture
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Name Input */}
        <input
          className="w-full p-2 border mb-3 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Full Name"
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
        />

        {/* Email Input */}
        <input
          className="w-full p-2 border mb-3 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Email"
          value={data.email}
          onChange={(e) => setData({ ...data, email: e.target.value })}
        />

        {/* Password Input */}
        <input
          className="w-full p-2 border mb-3 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
          type="password"
          placeholder="Password"
          value={data.password}
          onChange={(e) => setData({ ...data, password: e.target.value })}
        />

        {/* About Input */}
        <input
          className="w-full p-2 border mb-3 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="About (optional)"
          value={data.about}
          onChange={(e) => setData({ ...data, about: e.target.value })}
        />

        {/* Register Button */}
        <button
          onClick={register}
          disabled={loading}
          className="w-full bg-green-500 text-white py-2 rounded disabled:opacity-50 hover:bg-green-600"
        >
          {loading ? "Creating..." : "Register"}
        </button>

        {/* Login Link */}
        <p className="text-sm mt-3 text-center text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-green-600 font-semibold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
