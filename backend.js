import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import cors from "cors";

async function startServer() {
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
      password TEXT,
      income DECIMAL
    );

    CREATE TABLE IF NOT EXISTS finance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  console.log("Tables Created");

  // GET ALL USER INFORMATION
  app.get("/users", async (req, res) => {
    const users = await db.all("SELECT * FROM users");
    res.json(users);
  });

  // CHECK TO SEE IF USER EXISTS, THEN CREATES NEW USER ENTRY 
  app.post("/users", async (req, res) => { 
    const { nameFirst, nameLast, username, password } = req.body;
    const existingUser = await db.get("SELECT username FROM users WHERE username = ?", [username]);
    
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }
    
    await db.run("INSERT INTO users (nameFirst, nameLast, username, password, income) VALUES (?,?,?,?,?)", [nameFirst, nameLast, username, password, 0]);
    res.json({ message: "User added" });
  });

  // GET ALL FINANCE ENTRIES THAT CONTAIN THE SAME USER_ID
  app.get("/get-finance", async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ error: 'User is required' });
      }

    const income = await db.all("SELECT * FROM finance WHERE user_id = ? ORDER BY timestamp DESC", [user_id]);
    res.json(income || null)
  });
  // GET FINANCE ENTIRES, BUT ONLY 5 MOST RECENT FROM DASHBOARD
  app.get("/dashboard-finance", async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
    	return res.status(400).json({ error: "User is required" });
    }
    
    const transactions = await db.all("SELECT * FROM finance WHERE user_id = ? ORDER BY timestamp DESC LIMIT 5", [user_id]);
    res.json(transactions || null);
  });

  // SET INCOME
  app.post("/set-income", async (req, res) => {
    const { user_id, income } = req.body;
    await db.run("UPDATE users SET income = ? WHERE id = ?", [income, user_id])
    res.json({ message: "Income updated" })
  });

  // ADD TRANSACTION
  app.post("/add-transaction", async (req, res) => {
    const { user_id, amount, category, description } = req.body;
    await db.run(
      "INSERT INTO finance (user_id, amount, category, description) VALUES (?, ?, ?, ?)",[user_id, amount, category, description]);
    res.json({ message: "Transaction added" });
  });

  // CREATES SERVER
  app.use(express.static('.'));
  app.listen(3000, () => console.log("Server running at http://localhost:3000"));
}

// Start the server and catch any errors
startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
