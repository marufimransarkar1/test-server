// index.js
/**
 * 🚀 Dealbuzzz Backend
 * Node.js + Express + MongoDB
 * Fully professional structure with async/await, MongoDB storage for all entities
 */

const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");
const cors = require("cors");
const moment = require("moment-timezone");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());

// ================= DATABASE =================
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let usersCollection,
    productsCollection,
    cartsCollection,
    ordersCollection,
    wishlistsCollection,
    categoriesCollection;

async function connectDB() {
  try {
    await client.connect();
    const db = client.db("dealbuzzzDB");

    usersCollection = db.collection("users");
    productsCollection = db.collection("products");
    cartsCollection = db.collection("carts");
    ordersCollection = db.collection("orders");
    wishlistsCollection = db.collection("wishlists");
    categoriesCollection = db.collection("categories");

    console.log("✅ Connected to MongoDB successfully");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
}

// ================= UTILS =================
const getCurrentTime = () => moment().tz("Asia/Dhaka").format();

// ================= USERS =================

// GET ALL USERS
app.get("/api/users", async (req, res) => {
  try {
    const users = await usersCollection.find({}).toArray();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE USER
app.post("/api/users", async (req, res) => {
  try {
    const { name, email, password, uid } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: "Missing required fields" });

    // Check if email already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "Email already registered" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user object with role = 'user' by default
    const newUser = {
      id: uuid(),
      name,
      email,
      uid: uid || null,
      password: hashedPassword,
      role: "user",           // ✅ Automatically assign role
      createdAt: getCurrentTime(),
    };

    await usersCollection.insertOne(newUser);

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      }, // don't send password hash
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE USER
app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    await usersCollection.updateOne({ id }, { $set: updateData });
    res.json({ message: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= PRODUCTS =================

// GET ALL PRODUCTS (optional category filter)
app.get("/api/products", async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const products = await productsCollection.find(filter).toArray();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET SINGLE PRODUCT BY SLUG
app.get("/api/products/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const product = await productsCollection.findOne({ slug });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE PRODUCT
app.post("/api/products", async (req, res) => {
  try {
    const newProduct = {
      id: uuid(),
      createdAt: getCurrentTime(),
      ...req.body,
    };
    await productsCollection.insertOne(newProduct);
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE PRODUCT
app.put("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await productsCollection.updateOne({ id }, { $set: req.body });
    res.json({ message: "Product updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE PRODUCT
app.delete("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await productsCollection.deleteOne({ id });
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= CATEGORIES =================

// GET ALL CATEGORIES
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await categoriesCollection.find({}).toArray();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE CATEGORY
app.post("/api/categories", async (req, res) => {
  try {
    const newCategory = { id: uuid(), ...req.body };
    await categoriesCollection.insertOne(newCategory);
    res.status(201).json(newCategory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= CART =================

// GET USER CART
app.get("/api/cart/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    let cart = await cartsCollection.findOne({ userId });
    if (!cart) cart = { userId, items: [] };
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD TO CART
app.post("/api/cart", async (req, res) => {
  try {
    const { userId, productId, quantity, variants } = req.body;

    let userCart = await cartsCollection.findOne({ userId });
    const product = await productsCollection.findOne({ id: productId });
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (!userCart) {
      userCart = { userId, items: [] };
      await cartsCollection.insertOne(userCart);
    }

    const existingItem = userCart.items.find(
      (item) =>
        item.productId === productId &&
        JSON.stringify(item.variants || {}) === JSON.stringify(variants || {})
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      userCart.items.push({
        productId,
        quantity,
        variants: variants || {},
        priceAtAdd: product.salePrice || product.price,
        title: product.title,
        image: product.images?.[0],
      });
    }

    await cartsCollection.updateOne({ userId }, { $set: { items: userCart.items } });
    res.json(userCart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= ORDERS =================

// GET ALL ORDERS
app.get("/api/orders", async (req, res) => {
  try {
    const orders = await ordersCollection.find({}).toArray();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE ORDER
app.post("/api/orders/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const userCart = await cartsCollection.findOne({ userId });
    if (!userCart || userCart.items.length === 0)
      return res.status(400).json({ message: "Cart is empty" });

    const total = userCart.items.reduce(
      (sum, item) => sum + item.priceAtAdd * item.quantity,
      0
    );

    const newOrder = {
      id: uuid(),
      userId,
      items: userCart.items,
      total,
      status: "pending",
      createdAt: getCurrentTime(),
      shippingAddress: req.body.shippingAddress || {},
    };

    await ordersCollection.insertOne(newOrder);
    await cartsCollection.deleteOne({ userId }); // clear cart after order

    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= WISHLIST =================

// GET USER WISHLIST
app.get("/api/wishlist/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    let wishlist = await wishlistsCollection.findOne({ userId });
    if (!wishlist) wishlist = { userId, items: [] };
    res.json(wishlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD TO WISHLIST
app.post("/api/wishlist", async (req, res) => {
  try {
    const { userId, productId } = req.body;
    let userWishlist = await wishlistsCollection.findOne({ userId });

    const product = await productsCollection.findOne({ id: productId });
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (!userWishlist) {
      userWishlist = { userId, items: [] };
      await wishlistsCollection.insertOne(userWishlist);
    }

    const exists = userWishlist.items.find((item) => item.productId === productId);
    if (!exists) {
      userWishlist.items.push({
        productId,
        title: product.title,
        image: product.images?.[0],
        price: product.salePrice || product.price,
      });
    }

    await wishlistsCollection.updateOne({ userId }, { $set: { items: userWishlist.items } });
    res.json(userWishlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE WISHLIST ITEM
app.delete("/api/wishlist", async (req, res) => {
  try {
    const { userId, productId } = req.body;
    let userWishlist = await wishlistsCollection.findOne({ userId });

    if (!userWishlist) return res.json({ message: "Wishlist empty" });

    userWishlist.items = userWishlist.items.filter((item) => item.productId !== productId);
    await wishlistsCollection.updateOne({ userId }, { $set: { items: userWishlist.items } });

    res.json(userWishlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= SERVER =================
app.listen(PORT, async () => {
  await connectDB();
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
