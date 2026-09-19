const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET =
  process.env.JWT_SECRET || "freelance-marketplace-development-secret";

const db = new sqlite3.Database("./marketplace.db");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initializeDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('freelancer', 'client')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS gigs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      freelancer_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      delivery_days INTEGER NOT NULL,
      image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (freelancer_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gig_id INTEGER NOT NULL,
      client_id INTEGER NOT NULL,
      freelancer_id INTEGER NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN (
          'pending',
          'in_progress',
          'delivered',
          'completed',
          'cancelled'
        )),
      requirements TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (gig_id) REFERENCES gigs(id),
      FOREIGN KEY (client_id) REFERENCES users(id),
      FOREIGN KEY (freelancer_id) REFERENCES users(id)
    )
  `);

  const userCount = await get(`SELECT COUNT(*) AS count FROM users`);

  if (userCount.count === 0) {
    const freelancerPassword = await bcrypt.hash("password123", 10);
    const clientPassword = await bcrypt.hash("password123", 10);

    await run(
      `INSERT INTO users (name, email, password, role)
       VALUES (?, ?, ?, ?)`,
      [
        "Demo Freelancer",
        "freelancer@example.com",
        freelancerPassword,
        "freelancer"
      ]
    );

    await run(
      `INSERT INTO users (name, email, password, role)
       VALUES (?, ?, ?, ?)`,
      [
        "Demo Client",
        "client@example.com",
        clientPassword,
        "client"
      ]
    );

    const freelancer = await get(
      `SELECT id FROM users WHERE email = ?`,
      ["freelancer@example.com"]
    );

    await run(
      `INSERT INTO gigs
       (freelancer_id, title, description, category, price, delivery_days, image)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        freelancer.id,
        "Build a Responsive Website",
        "I will build a modern responsive website using HTML, CSS and JavaScript.",
        "Web Development",
        5000,
        5,
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085"
      ]
    );

    await run(
      `INSERT INTO gigs
       (freelancer_id, title, description, category, price, delivery_days, image)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        freelancer.id,
        "Create a Professional Logo",
        "I will create a clean and professional logo for your business.",
        "Graphic Design",
        2000,
        3,
        "https://images.unsplash.com/photo-1626785774573-4b799315345d"
      ]
    );

    await run(
      `INSERT INTO gigs
       (freelancer_id, title, description, category, price, delivery_days, image)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        freelancer.id,
        "Build a Node.js API",
        "I will create a REST API using Node.js and Express.",
        "Programming",
        7500,
        7,
        "https://images.unsplash.com/photo-1555066931-4365d14bab8c"
      ]
    );
  }

  console.log("Database initialized successfully");
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid or expired token"
    });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "You do not have permission for this action"
      });
    }

    next();
  };
}

/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Freelance Marketplace API is running"
  });
});

/* =========================
   AUTHENTICATION
========================= */

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        error: "All fields are required"
      });
    }

    if (!["freelancer", "client"].includes(role)) {
      return res.status(400).json({
        error: "Invalid role"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must contain at least 6 characters"
      });
    }

    const existingUser = await get(
      `SELECT id FROM users WHERE email = ?`,
      [email.toLowerCase()]
    );

    if (existingUser) {
      return res.status(409).json({
        error: "Email is already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await run(
      `INSERT INTO users (name, email, password, role)
       VALUES (?, ?, ?, ?)`,
      [name.trim(), email.toLowerCase().trim(), hashedPassword, role]
    );

    const user = await get(
      `SELECT id, name, email, role FROM users WHERE id = ?`,
      [result.id]
    );

    const token = createToken(user);

    res.status(201).json({
      message: "Registration successful",
      token,
      user
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Registration failed"
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }

    const user = await get(
      `SELECT * FROM users WHERE email = ?`,
      [email.toLowerCase().trim()]
    );

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      return res.status(401).json({
        error: "Invalid email or password"
      });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = createToken(safeUser);

    res.json({
      message: "Login successful",
      token,
      user: safeUser
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Login failed"
    });
  }
});

app.get("/api/auth/me", authenticate, async (req, res) => {
  const user = await get(
    `SELECT id, name, email, role FROM users WHERE id = ?`,
    [req.user.id]
  );

  res.json(user);
});

/* =========================
   GIGS
========================= */

app.get("/api/gigs", async (req, res) => {
  try {
    const {
      search = "",
      category = "",
      minPrice = "",
      maxPrice = ""
    } = req.query;

    let sql = `
      SELECT
        gigs.*,
        users.name AS freelancer_name
      FROM gigs
      JOIN users ON gigs.freelancer_id = users.id
      WHERE 1 = 1
    `;

    const params = [];

    if (search) {
      sql += `
        AND (
          gigs.title LIKE ?
          OR gigs.description LIKE ?
          OR gigs.category LIKE ?
        )
      `;

      const searchTerm = `%${search}%`;

      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (category) {
      sql += ` AND gigs.category = ?`;
      params.push(category);
    }

    if (minPrice !== "") {
      sql += ` AND gigs.price >= ?`;
      params.push(Number(minPrice));
    }

    if (maxPrice !== "") {
      sql += ` AND gigs.price <= ?`;
      params.push(Number(maxPrice));
    }

    sql += ` ORDER BY gigs.created_at DESC`;

    const gigs = await all(sql, params);

    res.json(gigs);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to load gigs"
    });
  }
});

app.get("/api/gigs/:id", async (req, res) => {
  try {
    const gig = await get(
      `
      SELECT
        gigs.*,
        users.name AS freelancer_name,
        users.email AS freelancer_email
      FROM gigs
      JOIN users ON gigs.freelancer_id = users.id
      WHERE gigs.id = ?
      `,
      [req.params.id]
    );

    if (!gig) {
      return res.status(404).json({
        error: "Gig not found"
      });
    }

    res.json(gig);
  } catch (error) {
    res.status(500).json({
      error: "Failed to load gig"
    });
  }
});

app.post(
  "/api/gigs",
  authenticate,
  authorize("freelancer"),
  async (req, res) => {
    try {
      const {
        title,
        description,
        category,
        price,
        delivery_days,
        image
      } = req.body;

      if (
        !title ||
        !description ||
        !category ||
        price === undefined ||
        !delivery_days
      ) {
        return res.status(400).json({
          error: "All gig fields are required"
        });
      }

      const result = await run(
        `
        INSERT INTO gigs
        (freelancer_id, title, description, category, price, delivery_days, image)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          req.user.id,
          title.trim(),
          description.trim(),
          category.trim(),
          Number(price),
          Number(delivery_days),
          image || ""
        ]
      );

      const gig = await get(
        `SELECT * FROM gigs WHERE id = ?`,
        [result.id]
      );

      res.status(201).json(gig);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Failed to create gig"
      });
    }
  }
);

app.put(
  "/api/gigs/:id",
  authenticate,
  authorize("freelancer"),
  async (req, res) => {
    try {
      const gig = await get(
        `SELECT * FROM gigs WHERE id = ?`,
        [req.params.id]
      );

      if (!gig) {
        return res.status(404).json({
          error: "Gig not found"
        });
      }

      if (gig.freelancer_id !== req.user.id) {
        return res.status(403).json({
          error: "You can only edit your own gigs"
        });
      }

      const {
        title,
        description,
        category,
        price,
        delivery_days,
        image
      } = req.body;

      await run(
        `
        UPDATE gigs
        SET
          title = ?,
          description = ?,
          category = ?,
          price = ?,
          delivery_days = ?,
          image = ?
        WHERE id = ?
        `,
        [
          title,
          description,
          category,
          Number(price),
          Number(delivery_days),
          image || "",
          req.params.id
        ]
      );

      const updatedGig = await get(
        `SELECT * FROM gigs WHERE id = ?`,
        [req.params.id]
      );

      res.json(updatedGig);
    } catch (error) {
      res.status(500).json({
        error: "Failed to update gig"
      });
    }
  }
);

app.delete(
  "/api/gigs/:id",
  authenticate,
  authorize("freelancer"),
  async (req, res) => {
    try {
      const gig = await get(
        `SELECT * FROM gigs WHERE id = ?`,
        [req.params.id]
      );

      if (!gig) {
        return res.status(404).json({
          error: "Gig not found"
        });
      }

      if (gig.freelancer_id !== req.user.id) {
        return res.status(403).json({
          error: "You can only delete your own gigs"
        });
      }

      const activeOrders = await get(
        `
        SELECT COUNT(*) AS count
        FROM orders
        WHERE gig_id = ?
        AND status NOT IN ('completed', 'cancelled')
        `,
        [req.params.id]
      );

      if (activeOrders.count > 0) {
        return res.status(400).json({
          error: "Cannot delete a gig with active orders"
        });
      }

      await run(
        `DELETE FROM gigs WHERE id = ?`,
        [req.params.id]
      );

      res.json({
        message: "Gig deleted successfully"
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to delete gig"
      });
    }
  }
);

/* =========================
   ORDERS
========================= */

app.post(
  "/api/orders",
  authenticate,
  authorize("client"),
  async (req, res) => {
    try {
      const { gig_id, requirements } = req.body;

      if (!gig_id) {
        return res.status(400).json({
          error: "Gig ID is required"
        });
      }

      const gig = await get(
        `SELECT * FROM gigs WHERE id = ?`,
        [gig_id]
      );

      if (!gig) {
        return res.status(404).json({
          error: "Gig not found"
        });
      }

      const result = await run(
        `
        INSERT INTO orders
        (gig_id, client_id, freelancer_id, price, requirements)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          gig.id,
          req.user.id,
          gig.freelancer_id,
          gig.price,
          requirements || ""
        ]
      );

      const order = await get(
        `
        SELECT
          orders.*,
          gigs.title AS gig_title,
          users.name AS freelancer_name
        FROM orders
        JOIN gigs ON orders.gig_id = gigs.id
        JOIN users ON orders.freelancer_id = users.id
        WHERE orders.id = ?
        `,
        [result.id]
      );

      res.status(201).json({
        message: "Order placed successfully",
        order
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Failed to place order"
      });
    }
  }
);

app.get(
  "/api/orders/client",
  authenticate,
  authorize("client"),
  async (req, res) => {
    try {
      const orders = await all(
        `
        SELECT
          orders.*,
          gigs.title AS gig_title,
          gigs.category,
          users.name AS freelancer_name
        FROM orders
        JOIN gigs ON orders.gig_id = gigs.id
        JOIN users ON orders.freelancer_id = users.id
        WHERE orders.client_id = ?
        ORDER BY orders.created_at DESC
        `,
        [req.user.id]
      );

      res.json(orders);
    } catch (error) {
      res.status(500).json({
        error: "Failed to load client orders"
      });
    }
  }
);

app.get(
  "/api/orders/freelancer",
  authenticate,
  authorize("freelancer"),
  async (req, res) => {
    try {
      const orders = await all(
        `
        SELECT
          orders.*,
          gigs.title AS gig_title,
          gigs.category,
          users.name AS client_name,
          users.email AS client_email
        FROM orders
        JOIN gigs ON orders.gig_id = gigs.id
        JOIN users ON orders.client_id = users.id
        WHERE orders.freelancer_id = ?
        ORDER BY orders.created_at DESC
        `,
        [req.user.id]
      );

      res.json(orders);
    } catch (error) {
      res.status(500).json({
        error: "Failed to load freelancer orders"
      });
    }
  }
);

app.patch(
  "/api/orders/:id/status",
  authenticate,
  async (req, res) => {
    try {
      const { status } = req.body;

      const allowedStatuses = [
        "pending",
        "in_progress",
        "delivered",
        "completed",
        "cancelled"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          error: "Invalid order status"
        });
      }

      const order = await get(
        `SELECT * FROM orders WHERE id = ?`,
        [req.params.id]
      );

      if (!order) {
        return res.status(404).json({
          error: "Order not found"
        });
      }

      const isClient = order.client_id === req.user.id;
      const isFreelancer = order.freelancer_id === req.user.id;

      if (!isClient && !isFreelancer) {
        return res.status(403).json({
          error: "You cannot modify this order"
        });
      }

      if (isFreelancer) {
        const freelancerTransitions = {
          pending: ["in_progress", "cancelled"],
          in_progress: ["delivered", "cancelled"],
          delivered: [],
          completed: [],
          cancelled: []
        };

        if (
          !freelancerTransitions[order.status]?.includes(status)
        ) {
          return res.status(400).json({
            error: `Cannot change order from ${order.status} to ${status}`
          });
        }
      }

      if (isClient) {
        const clientTransitions = {
          pending: ["cancelled"],
          in_progress: ["cancelled"],
          delivered: ["completed"],
          completed: [],
          cancelled: []
        };

        if (!clientTransitions[order.status]?.includes(status)) {
          return res.status(400).json({
            error: `Cannot change order from ${order.status} to ${status}`
          });
        }
      }

      await run(
        `
        UPDATE orders
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [status, req.params.id]
      );

      const updatedOrder = await get(
        `SELECT * FROM orders WHERE id = ?`,
        [req.params.id]
      );

      res.json({
        message: "Order status updated",
        order: updatedOrder
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Failed to update order"
      });
    }
  }
);

/* =========================
   DASHBOARD
========================= */

app.get(
  "/api/dashboard/freelancer",
  authenticate,
  authorize("freelancer"),
  async (req, res) => {
    try {
      const gigs = await get(
        `SELECT COUNT(*) AS count FROM gigs WHERE freelancer_id = ?`,
        [req.user.id]
      );

      const orders = await get(
        `
        SELECT COUNT(*) AS count
        FROM orders
        WHERE freelancer_id = ?
        `,
        [req.user.id]
      );

      const completed = await get(
        `
        SELECT COUNT(*) AS count
        FROM orders
        WHERE freelancer_id = ?
        AND status = 'completed'
        `,
        [req.user.id]
      );

      const earnings = await get(
        `
        SELECT COALESCE(SUM(price), 0) AS total
        FROM orders
        WHERE freelancer_id = ?
        AND status = 'completed'
        `,
        [req.user.id]
      );

      res.json({
        gigs: gigs.count,
        orders: orders.count,
        completed: completed.count,
        earnings: earnings.total
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to load dashboard"
      });
    }
  }
);

app.get(
  "/api/dashboard/client",
  authenticate,
  authorize("client"),
  async (req, res) => {
    try {
      const orders = await get(
        `
        SELECT COUNT(*) AS count
        FROM orders
        WHERE client_id = ?
        `,
        [req.user.id]
      );

      const active = await get(
        `
        SELECT COUNT(*) AS count
        FROM orders
        WHERE client_id = ?
        AND status NOT IN ('completed', 'cancelled')
        `,
        [req.user.id]
      );

      const completed = await get(
        `
        SELECT COUNT(*) AS count
        FROM orders
        WHERE client_id = ?
        AND status = 'completed'
        `,
        [req.user.id]
      );

      const spending = await get(
        `
        SELECT COALESCE(SUM(price), 0) AS total
        FROM orders
        WHERE client_id = ?
        AND status = 'completed'
        `,
        [req.user.id]
      );

      res.json({
        orders: orders.count,
        active: active.count,
        completed: completed.count,
        spending: spending.total
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to load dashboard"
      });
    }
  }
);

/* =========================
   SPA FALLBACK
========================= */

app.get("*splat", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* =========================
   START SERVER
========================= */

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Freelance Marketplace running on port ${PORT}`);
      console.log(`Open http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });