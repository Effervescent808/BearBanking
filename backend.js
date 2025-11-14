// server.js
import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

// open SQLite database file
const db = await open({
  filename: "./database.db",
  driver: sqlite3.Database
});

// Create a table if not exists
await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nameFirst TEXT,
    nameLast TEXT,
    username TEXT UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS finance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    income DECIMAL, 
    expenses DECIMAL
  );
`);

// Endpoint to get all users
app.get("/users", async (req, res) => {
  const users = await db.all("SELECT * FROM users");
  res.json(users);
});

app.post("/users", async (req, res) => {
  const { nameFirst, nameLast, username, password } = req.body;
  const existingUser = await db.get("SELECT username FROM users WHERE username = ?", [username]);
  
  if (existingUser) {
    return res.status(400).json({ error: "Username already exists" });
  }
  
  await db.run("INSERT INTO users (nameFirst, nameLast, username, password) VALUES (?,?,?,?)", [nameFirst, nameLast, username, password]);
  await db.run("INSERT INTO finance (username, income, expenses) VALUES (?,?,?)", [username, 0, 0]);
  res.json({ message: "User added" });
});

app.get("/get-income", async (req, res) => {
  const { username } = req.query;

  if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

  const income = await db.get("SELECT * FROM finance WHERE username = ?", [username]);
  res.json(income || null)
});

app.post("/set-income", async (req, res) => {
  const { username, income } = req.body;
  await db.run("UPDATE finance SET income = ? WHERE username = ?", [income, username])
  res.json({ message: "Income updated" })
});

app.use(express.static('.'));
app.listen(3000, () => console.log("Server running at http://localhost:3000"));

