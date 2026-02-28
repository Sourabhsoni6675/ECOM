const pool = require("../config/db");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const { sendOTPEmail } = require("../utils/email");
const { generateAccessToken, generateRefreshToken } = require("../config/jwt");

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await pool.query("SELECT id FROM users WHERE email=$1", [
      email,
    ]);
    if (existing.rows.length) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await pool.query(
      "INSERT INTO users (id, name, email, password) VALUES ($1,$2,$3,$4)",
      [userId, name, email, hashed],
    );

    res.status(201).json({ message: "Signup successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signup failed" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const userRes = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);

    if (!userRes.rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRes.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken({ userId: user.id });
    const refreshToken = generateRefreshToken({ userId: user.id });

    await pool.query(
      "INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES ($1,$2,$3, NOW() + INTERVAL '7 days')",
      [uuidv4(), user.id, refreshToken],
    );

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    await pool.query("DELETE FROM refresh_tokens WHERE expires_at < NOW()");

    const tokenRes = await pool.query(
      "SELECT * FROM refresh_tokens WHERE token=$1",
      [refreshToken],
    );

    if (!tokenRes.rows.length) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const userId = decoded.userId;


    await pool.query("DELETE FROM refresh_tokens WHERE token=$1", [
      refreshToken,
    ]);

    const newAccessToken = generateAccessToken({ userId });
    const newRefreshToken = generateRefreshToken({ userId });

    await pool.query(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
      [uuidv4(), userId, newRefreshToken],
    );

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: "Refresh Failed" });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token required" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const tokenRes = await pool.query(
      "SELECT * FROM refresh_tokens WHERE token=$1 AND user_id=$2",
      [refreshToken, decoded.userId],
    );

    if (!tokenRes.rows.length) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    await pool.query(
      "DELETE FROM refresh_tokens WHERE token=$1 AND user_id=$2",
      [refreshToken, decoded.userId],
    );

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(403).json({ message: "Logout failed or token invalid" });
  }
};

exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const userRes = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);

    if (!userRes.rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRes.rows[0];
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await pool.query(
      "INSERT INTO otp_requests (id, user_id, otp, expires_at) VALUES ($1,$2,$3, NOW() + INTERVAL '10 minutes')",
      [uuidv4(), user.id, otp],
    );

    await sendOTPEmail(user.email, otp);

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const userRes = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);

    if (!userRes.rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRes.rows[0];

    const otpRes = await pool.query(
      `SELECT * FROM otp_requests 
       WHERE user_id=$1 AND otp=$2 AND is_used=false 
       AND expires_at > NOW()`,
      [user.id, otp],
    );

    if (!otpRes.rows.length) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await pool.query("UPDATE users SET password=$1 WHERE id=$2", [
      hashed,
      user.id,
    ]);

    await pool.query("UPDATE otp_requests SET is_used=true WHERE id=$1", [
      otpRes.rows[0].id,
    ]);

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Reset failed" });
  }
};
