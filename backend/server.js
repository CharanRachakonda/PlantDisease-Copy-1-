const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const axios = require("axios");
const sharp = require("sharp");
const cloudinary = require('cloudinary').v2;
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());

// Cloudinary Configuration (using environment variables)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dh13ovagy',
  api_key: process.env.CLOUDINARY_API_KEY || '263981214276339',
  api_secret: process.env.CLOUDINARY_API_SECRET || '_PrZi_o4GksmSYnp9tlMZMNsjIA'
});

// MongoDB Atlas connection
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://rajasri:rajasri@cluster0.irmyw.mongodb.net/users?retryWrites=true&w=majority&appName=Cluster0";
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

// Diagnosis Schema (updated to use Cloudinary URL)
const diagnosisSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  imageUrl: { 
    type: String, 
    required: true 
  },
  diagnosis: [{
    label: String,
    score: Number
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const Diagnosis = mongoose.model("Diagnosis", diagnosisSchema);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY", (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Signup route
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(403).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "SECRET_KEY", { expiresIn: "1h" });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Forgot password route
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate a reset token (in production, email it to the user)
    const resetToken = jwt.sign({ id: user._id }, "RESET_KEY", { expiresIn: "15m" });
    res.json({ message: "Reset token generated", resetToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Image upload for Hugging Face API with Cloudinary
app.post("/api/upload", authenticateToken, async (req, res) => {
  if (!req.files || !req.files.image) {
    return res.status(400).send({ message: "No image file uploaded" });
  }

  const image = req.files.image;
  const buffer = image.data;

  const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY || 'default_placeholder_key';
  const HUGGING_FACE_MODEL_URL = process.env.HUGGING_FACE_MODEL_URL || 
    "https://api-inference.huggingface.co/models/ozair23/mobilenet_v2_1.0_224-finetuned-plantdisease";

  try {
    // Compress the image before processing
    const compressedBuffer = await sharp(buffer).resize(224, 224).jpeg({ quality: 80 }).toBuffer();

    // Upload to Cloudinary
    const cloudinaryResponse = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { 
          folder: 'plant-disease-diagnoses',
          resource_type: 'image'
        }, 
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(compressedBuffer);
    });

    // Send compressed image to Hugging Face model
    const huggingFaceResponse = await axios.post(
      HUGGING_FACE_MODEL_URL,
      compressedBuffer,
      {
        headers: {
          Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
          "Content-Type": "application/octet-stream",
        },
      }
    );

    // Save diagnosis to database with Cloudinary URL
    const newDiagnosis = new Diagnosis({
      userId: req.user.id,
      imageUrl: cloudinaryResponse.secure_url,
      diagnosis: huggingFaceResponse.data
    });
    await newDiagnosis.save();

    res.json({ 
      diagnosis: huggingFaceResponse.data,
      imageUrl: cloudinaryResponse.secure_url
    });
  } catch (error) {
    console.error("Error processing image:", error.message);
    res.status(500).send({ message: "Error processing image", error: error.message });
  }
});

// Diagnosis history route
app.get("/diagnosis-history", authenticateToken, async (req, res) => {
  try {
    const diagnoses = await Diagnosis.find({ userId: req.user.id })
      .sort({ createdAt: -1 }); // Sort by most recent first
    res.json(diagnoses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/history", authenticateToken, async (req, res) => {
  try {
    const diagnoses = await Diagnosis.find({ userId: req.user.id })
      .sort({ createdAt: -1 }); // Sort by most recent first
    res.render("history", { diagnoses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));