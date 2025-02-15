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
const MongoStore = require("connect-mongo");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const fs = require("fs");
const User = require("./model/user");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const { isLoggedIn } = require("./middleware.js");
const PORT = process.env.PORT;

const app = express();
const dbUrl = process.env.ATLASDB_URL;
const genAI = new GoogleGenerativeAI("AIzaSyAB7blS2dxS4vZk83B0f-CbhRpwfOgyiWM");
app.locals.AppName = "WMS";

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


// app.post("/waste-classification", upload.single("file"), (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ error: "No file uploaded" });
//   }

//   const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
//     req.file.filename
//   }`;
//   console.log("Uploaded file URL:", fileUrl); // Log downloadable link

//   // Send response to the frontend
//   res.json({ message: "File uploaded successfully", fileUrl });
// });

// Form submission route
// ...existing code...

// Form submission route
app.post('/waste-classification', upload.single('image'), async (req, res) => {
  console.log('Endpoint /waste-classification hit');
  try {
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    console.log('File received:', req.file);
    
    // Initialize the file manager with your API key
    const fileManager = new GoogleAIFileManager("AIzaSyBA7aUkaByxGSDjmBcbOoc4lzmOD59qLN8");
    
    // Upload the file using its path and metadata
    const uploadResult = await fileManager.uploadFile(req.file.path, {
      mimeType: req.file.mimetype,
      displayName: req.file.originalname,
    });
    
    console.log(
      `Uploaded file ${uploadResult.file.displayName} as: ${uploadResult.file.uri}`
    );
    
    // Initialize the generative AI client with your API key
    const genAI = new GoogleGenerativeAI(process.env.API_KEY);
    // Use the specified model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Generate content using the uploaded file's URI
    const result = await model.generateContent([
      "Tell me about this image.",
      {
        fileData: {
          fileUri: uploadResult.file.uri,
          mimeType: uploadResult.file.mimeType,
        },
      },
    ]);
    
    // Extract and log the text response
    const responseText = result.response.text();
    console.log(responseText);
    
    return res.json({ 
      message: "File processed successfully", 
      result: responseText 
    });
    
  } catch (error) {
    console.error("Error processing image:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});





app.get("*", (req, res) => {  
  res.redirect("/index");
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});



