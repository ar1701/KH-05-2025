if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const axios = require("axios");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const multer = require("multer");
const session = require("express-session");
const bodyParser = require("body-parser");
const cors = require("cors");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const fs = require("fs");
const User = require("./model/user");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const { isLoggedIn } = require("./middleware.js");
const PORT = process.env.PORT;
const apiKey = process.env.API_KEY;
const app = express();
const dbUrl = process.env.ATLASDB_URL;
const genAI = new GoogleGenerativeAI("apiKey");
app.locals.AppName = "WMS";
const fileManager = new GoogleAIFileManager(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const { generateResponse } = require('./test');
const { storage1, cloudinary } = require("./cloudConfig");
const Waste = require("./model/waste");

const upload1 = multer({ storage: storage1 });

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

// Configure session store
const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: { secret: process.env.SECRET },
  touchAfter: 24 * 60 * 60,
});
store.on("error", (error) => {
  console.error("Error in MONGO SESSION STORE:", error);
});

// Session options
const sessionOptions = {
  store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

// Middleware setup
app.use(cors());
app.use(bodyParser.json());
app.use(session(sessionOptions));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

// Passport setup
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Middleware to make user data available in templates
app.use((req, res, next) => {
  res.locals.user = req.user; // `user` will now be available in all EJS templates
  next();
});

// Connect to the database
async function connectDB() {
  try {
    await mongoose.connect(dbUrl, {
    });
    console.log("Database connection successful");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
}

connectDB();

// Error handling utility
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}


// async function uploadToGemini(filePath, mimeType) {
//   const uploadResult = await fileManager.uploadFile(filePath, { mimeType, displayName: path.basename(filePath) });
//   return uploadResult.file;
// }

// const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
// const generationConfig = {
//   temperature: 1,
//   topP: 0.95,
//   topK: 40,
//   maxOutputTokens: 8192,
//   responseMimeType: "text/plain",
// };


// Utility for file to generative part
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
}


app.get("/login", (req, res) => {
  res.render("login");
});

app.post(
  "/login",
  passport.authenticate("local", { failureRedirect: "/login", failure: true }),
  (req, res) => {
    const { username } = req.body;
    req.session.user = { username };
    res.redirect("/index");
  }
);


app.get("/signup", async (req, res) => {
  res.render("signup");
});

app.get("/index", async (req, res) => {
  try {
    res.render("index", { user: req.user });
  } catch (error) {
    console.error(error);
    res.render("index", { user: null });
  }
});



app.post("/signup", async (req, res) => {
  try {
    const { username, email, name, phone, password } = req.body;
    const newUser = new User({ username, email, name, phone });

    await User.register(newUser, password); // `passport-local-mongoose` handles hashing

    passport.authenticate("local")(req, res, () => {
      res.redirect("/index");
    });
  } catch (err) {
    console.error("Error signing up:", err);
    res.redirect("/signup");
  }
});

app.get("/waste-classification", isLoggedIn, async (req, res) => {
  res.render("waste-classification");
});



// Logout route
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      console.error("Error logging out:", err);
      return next(err);
    }
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
      }
      res.redirect("/index");
    });
  });
});


// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).send("Internal Server Error");
});



// Form submission route
app.post('/waste-classification', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    // console.log('File received:', req.file);
    
    // Initialize the file manager with your API key
    const fileManager = new GoogleAIFileManager(process.env.API_KEY);
    
    // Upload the file using its path and metadata
    const uploadResult = await fileManager.uploadFile(req.file.path, {
      mimeType: req.file.mimetype,
      displayName: req.file.originalname,
    });
    
    // console.log(
    //   `Uploaded file ${uploadResult.file.displayName} as: ${uploadResult.file.uri}`
    // );
    
    // Initialize the generative AI client with your API key
    const genAI = new GoogleGenerativeAI(process.env.API_KEY);
    // Use the specified model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Generate content using the uploaded file's URI
    const result = await model.generateContent([
      `Provide the classification of the uploaded image in a properly formatted bullet point list. Use the following structure:

Biodegradable/Non-biodegradable/Hazardous: [Your Answer]
Type of Waste: [Your Answer]
Appropriate Bin: [Your Answer]
Proper Method for Decomposition: [Your Answer]`,
      {
        fileData: {
          fileUri: uploadResult.file.uri,
          mimeType: uploadResult.file.mimeType,
        },
      },
    ]);
    
    // Extract and log the text response
    const responseText = result.response.text();
    // console.log(responseText);
    
    const formattedOutput = formatToBulletPoints(responseText);


    return res.json({ 
      message: "File processed successfully", 
      result: formattedOutput 
    });
    
  } catch (error) {
    console.error("Error processing image:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/waste/:id/edit", isLoggedIn, async (req, res) => {
  try {
    const waste = await Waste.findById(req.params.id);
    if (!waste || waste.user.toString() !== req.user._id.toString()) {
      return res.status(403).send("Unauthorized access");
    }
    res.render("waste/edit", { waste });
  } catch (error) {
    res.status(500).send("Error fetching waste data");
  }
});

app.get("/chatbot", isLoggedIn,(req, res) => {
  res.render("chatbot");
});

app.post('/chatbot', async (req, res) => {
  try {
      const prompt = req.body.message;
      const response = await generateResponse(prompt);
      // console.log(response);
      res.json({ message: response });
  } catch (error) {
      res.status(500).json({ message: "Internal server error" });
  }
});


app.post("/waste", isLoggedIn, upload1.single("image"), async (req, res) => {
  try {
    const { name, quantity, city, sector } = req.body;
    
    if (!req.file) {
      return res.status(400).send("Image is required");
    }

    const imageUrl = req.file.path; // Cloudinary automatically provides a URL

    const waste = new Waste({
      name,
      quantity,
      city,
      sector,
      imageUrl, // Store Cloudinary URL
      user: req.user._id,
    });

    await waste.save();
    res.redirect("/waste/all"); // Redirect to show all waste posts
  } catch (error) {
    console.error("Error posting waste:", error);
    res.status(500).send("Internal Server Error");
  }
});



app.get("/marketplace", async (req, res) => {
  try {
    res.render("waste/index");
  } catch (error) {
    console.error(error);
    res.render("/index");
  }
});

app.get("/waste", async (req, res) => {
  try {
    const wastes = await Waste.find().populate("user", "name email");
    res.json(wastes);
  } catch (error) {
    res.status(500).json({ error: "Error fetching waste data" });
  }
});

app.get("/waste/all", async (req, res) => {
  try {
    const wastes = await Waste.find({});
    res.render("waste/allPosts", { wastes, user: req.user });
  } catch (error) {
    res.status(500).json({ error: "Error fetching waste posts" });
  }
});

app.get("/waste/:id/edit", isLoggedIn, async (req, res) => {
  try {
    const waste = await Waste.findById(req.params.id);
    if (!waste || waste.user.toString() !== req.user._id.toString()) {
      return res.status(403).send("Unauthorized access");
    }
    res.render("waste/edit", { waste });
  } catch (error) {
    res.status(500).send("Error fetching waste data");
  }
});

// READ - View a user's waste posts
app.get("/waste/myposts", isLoggedIn, async (req, res) => {
  try {
    const myWastes = await Waste.find({ user: req.user._id });
    res.render("waste/myPosts", { wastes: myWastes, user: req.user });
  } catch (error) {
    res.status(500).json({ error: "Error fetching user waste posts" });
  }
});

app.get("/waste/new", isLoggedIn, (req, res) => {
  res.render("waste/new");
});



app.put("/waste/:id", isLoggedIn, upload1.single("image"), async (req, res) => {
  try {
    const { name, quantity, city, sector } = req.body;
    const waste = await Waste.findById(req.params.id);

    if (!waste || waste.user.toString() !== req.user._id.toString()) {
      return res.status(403).send("Unauthorized update");
    }

    waste.name = name;
    waste.quantity = quantity;
    waste.city = city;
    waste.sector = sector;

    if (req.file) {
      // Delete old image from Cloudinary
      const oldImageId = waste.imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(oldImageId);

      // Update with new image URL
      waste.imageUrl = req.file.path;
    }

    await waste.save();
    res.redirect("/waste/all");
  } catch (error) {
    res.status(500).send("Error updating waste details");
  }
});




// DELETE - Remove a waste post
app.delete("/waste/:id", isLoggedIn, async (req, res) => {
  // console.log("User attempting delete:", req.user);

  try {
    const { id } = req.params;
    const waste = await Waste.findOneAndDelete({ _id: id, user: req.user._id });

    if (!waste) return res.status(403).json({ error: "Unauthorized delete" });

    if (waste.imageUrl) {
      const imagePublicId = waste.imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(imagePublicId);
    }
    res.redirect("/waste/all");
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Post Deleted" });
    res.redirect("/waste/all");
  }
});

app.get("/carbon", async (req, res) => {
  res.render("carbon");
});

app.get("/admin", async (req, res) => {
  res.render("admin");
});

app.get("*", (req, res) => {  
  res.redirect("/index");
});

function formatToBulletPoints(text) {
  // Ensure bullet points are formatted properly
  let formattedText = text
      .replace(/\* \*\*(.*?)\*\*:/g, '\n- **$1:**') // Fix headers
      .replace(/\* /g, '\n- '); // Ensure new bullet points
  
  return formattedText.trim();
}


const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});



