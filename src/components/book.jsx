import React, { useState, useRef } from "react";
import "./book.css";

function Book() {
  const [flip, setFlip] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [animating, setAnimating] = useState(false);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [otpHint, setOtpHint] = useState("");
  const [token, setToken] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const audioRef = useRef(null);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 0.4;
      audioRef.current.play().catch(() => {});
    }
  };

  const doFlip = () => {
    setAnimating(true);
    setTimeout(playSound, 120);
    setTimeout(() => {
      setShowLogin(false);
      setFlip(true);
    }, 500);
  };

  const sendRequest = async (path, body) => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/auth/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Request failed");
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      setError("Please enter an email and password.");
      return;
    }
    const data = await sendRequest("register", { email, password });
    if (data) {
      setMessage(data.msg || "Registered successfully.");
      setMode("login");
      setPassword("");
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter an email and password.");
      return;
    }
    const data = await sendRequest("login", { email, password });
    if (data) {
      setMode("otp");
      setMessage(data.msg || "OTP sent to your email.");
      setOtpHint(
        data.otp ? `Use code: ${data.otp}` : "Check your email for the code.",
      );
    }
  };

  const handleVerify = async () => {
    if (!otp) {
      setError("Please enter the OTP.");
      return;
    }
    const data = await sendRequest("verify-otp", { email, otp });
    if (data) {
      setToken(data.token);
      setUserEmail(email);
      setMessage("Welcome! You are now logged in.");
      setOtp("");
      setMode("dashboard");
      doFlip();
    }
  };

  const handleLogout = () => {
    setToken("");
    setUserEmail("");
    setEmail("");
    setPassword("");
    setOtp("");
    setMessage("");
    setError("");
    setOtpHint("");
    setMode("login");
    setFlip(false);
    setShowLogin(true);
    setAnimating(false);
  };

  return (
    <div className="container">
      {showLogin && mode !== "dashboard" && (
        <div className={`login-overlay ${animating ? "hide" : ""}`}>
          <div className="login-card">
            <h2>
              {mode === "register"
                ? "Create Account"
                : mode === "otp"
                  ? "Verify OTP"
                  : "Login"}
            </h2>
            {error && <div className="status error">{error}</div>}
            {message && <div className="status success">{message}</div>}

            {(mode === "login" || mode === "register") && (
              <>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                />
              </>
            )}

            {mode === "otp" && (
              <>
                <div className="otp-hint">{otpHint}</div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP"
                />
              </>
            )}

            <button
              onClick={
                mode === "register"
                  ? handleRegister
                  : mode === "otp"
                    ? handleVerify
                    : handleLogin
              }
            >
              {loading
                ? "Please wait..."
                : mode === "register"
                  ? "Register"
                  : mode === "otp"
                    ? "Verify OTP"
                    : "Login"}
            </button>

            {mode !== "otp" && (
              <div className="toggle-row">
                {mode === "login" ? (
                  <>
                    <span>Need an account?</span>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => {
                        setMode("register");
                        setError("");
                        setMessage("");
                      }}
                    >
                      Register
                    </button>
                  </>
                ) : (
                  <>
                    <span>Already have an account?</span>
                    <button
                      type="button"
                      className="link-button"
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
          </div>
        </div>
      )}

      <div className="book">
        <div className="page left">
          <div className="page-content">
            <h1>Welcome</h1>
            <p>
              Open the book to access your personal dashboard and continue your
              story.
            </p>
            {mode === "dashboard" && (
              <p className="small">Logged in as {userEmail}</p>
            )}
          </div>
        </div>

        <div className={`page flip-page ${flip ? "flipped" : ""}`}>
          <div className="front">
            <div className="page-content">
              <h2>Magic Book</h2>
              <p>Sign in to unlock the next chapter.</p>
            </div>
          </div>

          <div className="back">
            <div className="page-content dashboard">
              <h2>Your Dashboard</h2>
              <p>Everything is ready for you to explore.</p>
              {mode === "dashboard" ? (
                <>
                  <div className="card">
                    Welcome back, <strong>{userEmail}</strong>!
                  </div>
                  <div className="card">Your secure session is active.</div>
                  <button className="logout-button" onClick={handleLogout}>
                    Logout
                  </button>
                </>
              ) : (
                <div className="card">Use the login panel to continue.</div>
              )}
            </div>
          </div>
        </div>

        <audio
          ref={audioRef}
          src="/public/sound/pageturning.mp3"
          preload="auto"
        />
      </div>
    </div>
  );
}

export default Book;
