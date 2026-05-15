import React, { useState, useRef } from "react";
import "./BookIntro.css";

function BookIntro({ onEnter }) {
  const [flip, setFlip] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayHiding, setOverlayHiding] = useState(false);
  const [mode, setMode] = useState("login"); // login | register | otp
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpHint, setOtpHint] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const audioRef = useRef(null);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(() => {});
    }
  };

  const doFlipAndEnter = (data) => {
    // Hide overlay with animation
    setOverlayHiding(true);
    setTimeout(() => {
      setShowOverlay(false);
      // Start page flip
      setTimeout(playSound, 80);
      setFlip(true);
      // After flip completes, enter dashboard
      setTimeout(() => {
        onEnter(data);
      }, 1300);
    }, 450);
  };

  const api = async (path, body) => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/auth/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      // Check if response is JSON before parsing
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server error. Please ensure the backend is running.");
      }
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Request failed");
      return data;
    } catch (err) {
      // Handle network errors and JSON parse errors
      if (err.name === "TypeError" && err.message.includes("fetch")) {
        setError("Cannot connect to server. Please check if the backend is running.");
      } else if (err instanceof SyntaxError) {
        setError("Server returned invalid response. Please try again.");
      } else {
        setError(err.message);
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    const data = await api("register", { name, email, password });
    if (data) {
      setMessage("Account created! Please login.");
      setMode("login");
      setPassword("");
      setName("");
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }
    const data = await api("login", { email, password });
    if (data) {
      setMode("otp");
      setMessage(data.msg || "OTP sent.");
      setOtpHint(data.otp ? `Your code: ${data.otp}` : "Check your email.");
    }
  };

  const handleVerify = async () => {
    if (!otp) {
      setError("Please enter the OTP.");
      return;
    }
    const data = await api("verify-otp", { email, otp });
    if (data) {
      doFlipAndEnter(data);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (mode === "register") handleRegister();
      else if (mode === "otp") handleVerify();
      else handleLogin();
    }
  };

  return (
    <div className="intro-container">
      <audio ref={audioRef} src="/sound/pageturning.mp3" preload="auto" />

      {/* ── Login Overlay ── */}
      {showOverlay && (
        <div className={`login-overlay ${overlayHiding ? "hide" : ""}`}>
          <div className="login-card">
            <div className="login-logo">📚</div>
            <h2 className="login-title">
              {mode === "register"
                ? "Create Account"
                : mode === "otp"
                ? "Verify OTP"
                : "Library Login"}
            </h2>

            {error && <div className="status error">{error}</div>}
            {message && <div className="status success">{message}</div>}

            {mode === "register" && (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Full Name"
                className="login-input"
              />
            )}

            {(mode === "login" || mode === "register") && (
              <>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Email Address"
                  className="login-input"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Password"
                  className="login-input"
                />
              </>
            )}

            {mode === "otp" && (
              <>
                {otpHint && <div className="otp-hint">{otpHint}</div>}
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter 6-digit OTP"
                  className="login-input"
                  maxLength={6}
                />
              </>
            )}

            <button
              className="login-btn"
              onClick={
                mode === "register"
                  ? handleRegister
                  : mode === "otp"
                  ? handleVerify
                  : handleLogin
              }
              disabled={loading}
            >
              {loading
                ? "Please wait…"
                : mode === "register"
                ? "Create Account"
                : mode === "otp"
                ? "Verify & Enter"
                : "Login"}
            </button>

            {mode !== "otp" && (
              <div className="toggle-row">
                {mode === "login" ? (
                  <>
                    <span>New here?</span>
                    <button
                      className="link-btn"
                      onClick={() => {
                        setMode("register");
                        setError("");
                        setMessage("");
                      }}
                    >
                      Create account
                    </button>
                  </>
                ) : (
                  <>
                    <span>Have an account?</span>
                    <button
                      className="link-btn"
                      onClick={() => {
                        setMode("login");
                        setError("");
                        setMessage("");
                      }}
                    >
                      Login
                    </button>
                  </>
                )}
              </div>
            )}

            {mode === "otp" && (
              <button
                className="link-btn"
                style={{ marginTop: 10 }}
                onClick={() => {
                  setMode("login");
                  setOtp("");
                  setError("");
                  setMessage("");
                }}
              >
                ← Back to login
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Book ── */}
      <div className="book">
        {/* Left page */}
        <div className="page left-page">
          <div className="page-inner">
            <div className="page-decoration">
              <div className="lib-icon">📖</div>
              <h1 className="lib-title">Library</h1>
              <p className="lib-subtitle">Your gateway to knowledge</p>
              <div className="page-lines">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="page-line" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Flip page */}
        <div className={`page flip-page ${flip ? "flipped" : ""}`}>
          <div className="front">
            <div className="page-inner">
              <div className="page-decoration">
                <div className="lib-icon">✨</div>
                <h2>Welcome</h2>
                <p>Sign in to explore thousands of books</p>
                <div className="page-lines">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="page-line" />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="back">
            <div className="page-inner">
              <div className="page-decoration">
                <div className="lib-icon">🎉</div>
                <h2>Opening…</h2>
                <p>Loading your library</p>
              </div>
            </div>
          </div>
        </div>

        {/* Spine */}
        <div className="spine" />
      </div>
    </div>
  );
}

export default BookIntro;
