import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./styles.css"; // Import your stylesheet

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post("http://localhost:5000/login", { email, password });
      localStorage.setItem("token", data.token);
      navigate("/ImageUpload");
    } catch (err) {
      console.error(err.response.data.message);
    }
  };

  return (
    <div className="login-container">
      <div className="left-section">
        {/* Left Section: Decorative Background */}
      </div>
      <div className="right-section">
        <form onSubmit={handleSubmit}>
          <h2>Welcome!</h2>
          <input
            type="email"
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Login</button>
          <a href="/signup">Don't have an account? Signup</a>
          <a href="/forgot-password">Forgot Password?</a>
        </form>
      </div>
    </div>
  );
}

export default Login;
