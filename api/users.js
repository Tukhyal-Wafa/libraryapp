const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "library_secret_key_2024";

export default async function (req, res) {
  const db = require("./_db");

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ msg: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  let user;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    user = db.users.find((u) => u.id === decoded.id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ msg: "Admin access required" });
    }
  } catch (err) {
    return res.status(401).json({ msg: "Invalid token" });
  }

  if (req.method === "GET") {
    res.json(db.users);
  } else if (req.method === "PUT" && req.url.endsWith("/role")) {
    const id = req.url.split("/")[1];
    const user = db.users.find((u) => u.id == id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    const { role } = req.body;
    user.role = role;
    res.json(user);
  } else if (req.method === "DELETE") {
    const id = req.url.slice(1);
    const index = db.users.findIndex((u) => u.id == id);
    if (index === -1) {
      return res.status(404).json({ msg: "User not found" });
    }
    db.users.splice(index, 1);
    res.json({ msg: "User deleted" });
  } else {
    res.status(405).json({ msg: "Method not allowed" });
  }
}
