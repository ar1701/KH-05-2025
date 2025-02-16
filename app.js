if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const http = require('http');
const express = require("express");
const Message = require('./model/Message');
const socketIO = require('socket.io');
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
const Admin = require("./model/admin");
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
const { generateResponse } = require("./test");
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

const server = http.createServer(app);
const io = socketIO(server);
const userSockets = new Map();

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

// Configure Passport to use different strategies for User and Admin
passport.use("user-local", new LocalStrategy(User.authenticate()));
passport.use("admin-local", new LocalStrategy(Admin.authenticate()));

passport.serializeUser((user, done) => {
  done(null, { id: user.id, type: user.constructor.modelName });
});

passport.deserializeUser(async (obj, done) => {
  try {
    if (obj.type === "User") {
      const user = await User.findById(obj.id);
      done(null, user);
    } else if (obj.type === "Admin") {
      const admin = await Admin.findById(obj.id);
      done(null, admin);
    }
  } catch (err) {
    done(err);
  }
});

// Middleware to make user data available in templates
app.use((req, res, next) => {
  res.locals.user = req.user; // `user` will now be available in all EJS templates
  next();
});

// Connect to the database
async function connectDB() {
  try {
    await mongoose.connect(dbUrl, {});
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


app.get('/socket.io/socket.io.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules/socket.io/client-dist/socket.io.js'));
});
// Utility for file to generative part
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
}

io.on('connection', (socket) => {
  socket.on('register', (data) => {
    userSockets.set(data.userId, socket.id);
  });
  
  socket.on('private message', async (data) => {
    const receiverSocket = userSockets.get(data.receiver);
    if (receiverSocket) {
      io.to(receiverSocket).emit('private message', {
        content: data.content,
        sender: socket.userId
      });
    }
  });
  
  socket.on('disconnect', () => {
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
  });
});

// Add these routes to your Express app
app.get('/messages/:userId', async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id }
      ]
    }).sort('createdAt');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

app.post('/messages', async (req, res) => {
  try {
    const message = new Message({
      sender: req.user._id,
      receiver: req.body.receiver,
      content: req.body.content
    });
    await message.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error saving message' });
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get('/messages/:userId/:otherUserId', async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.params.userId, receiver: req.params.otherUserId },
        { sender: req.params.otherUserId, receiver: req.params.userId }
      ]
    }).sort('createdAt');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

app.post("/login", async (req, res, next) => {
  passport.authenticate("user-local", async (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return passport.authenticate("admin-local", (err, admin, info) => {
        if (err) return next(err);
        if (!admin) {
          return res.redirect("/login");
        }
        req.logIn(admin, (err) => {
          if (err) return next(err);
          return res.redirect("/admin");
        });
      })(req, res, next);
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect("/index");
    });
  })(req, res, next);
});

app.get("/signup", async (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
  try {
    const { username, email, name, phone, password, role, adminKey } = req.body;

    if (role === "admin") {
      if (adminKey === process.env.ADMIN_KEY) {
        const newAdmin = new Admin({ username, email, name, phone });
        await Admin.register(newAdmin, password); // `passport-local-mongoose` handles hashing

        passport.authenticate("admin-local")(req, res, () => {
          res.redirect("/admin");
        });
      } else {
        res.status(401).send("Invalid Admin Key");
      }
    } else {
      const newUser = new User({ username, email, name, phone });
      await User.register(newUser, password); // `passport-local-mongoose` handles hashing

      passport.authenticate("user-local")(req, res, () => {
        res.redirect("/index");
      });
    }
  } catch (err) {
    console.error("Error signing up:", err);
    res.redirect("/signup");
  }
});

app.get("/index", async (req, res) => {
  try {
    res.render("index", { user: req.user });
  } catch (error) {
    console.error(error);
    res.render("index", { user: null });
  }
});

app.get("/admin", async (req, res) => {
  res.render("admin");
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

app.get("/flashcard", isLoggedIn, (req, res) => {
  res.render("flashcard");
});

app.get("/waste-classification", isLoggedIn, async (req, res) => {
  res.render("waste-classification");
});
// Form submission route
app.post("/waste-classification", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      console.log("No file uploaded");
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
Proper Method for Decomposition: [Your Answer]. Don't give any preambles or explanations, just the answers.`,
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
      result: formattedOutput,
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

app.get("/chatbot", isLoggedIn, (req, res) => {
  res.render("chatbot");
});

// app.post("/chatbot", async (req, res) => {
//   try {
//     const prompt = req.body.message;
//     const response = await generateResponse(prompt);
//     // console.log(response);
//     res.json({ message: response });
//   } catch (error) {
//     res.status(500).json({ message: "Internal server error" });
//   }
// });

app.post("/chatbot", async (req, res) => {
  try {
    const userInput = req.body.message;
    // console.log("User input:", userInput);
    const response = await axios.post('https://groclake.onrender.com/chat', {
      "user_input": userInput
    });
    // console.log("Response from external chatbot:", response.data.bot_reply);

    res.json({ message: response.data.bot_reply });
  } catch (error) {
    console.error("Error communicating with external chatbot:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


app.post("/waste", isLoggedIn, upload1.single("image"), async (req, res) => {
  try {
    const { name, category, quantity, city, sector } = req.body;

    if (!req.file) {
      return res.status(400).send("Image is required");
    }

    const imageUrl = req.file.path; // Cloudinary automatically provides a URL

    const waste = new Waste({
      name,
      category,
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
    const { name, category, quantity, city, sector } = req.body;
    const waste = await Waste.findById(req.params.id);

    if (!waste || waste.user.toString() !== req.user._id.toString()) {
      return res.status(403).send("Unauthorized update");
    }

    waste.name = name;
    waste.category = category;
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

app.get("/admin/analytics", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalWaste = await Waste.aggregate([{ $group: { _id: null, total: { $sum: "$quantity" } } }]);

    const cityWiseWaste = await Waste.aggregate([
      { $group: { _id: "$city", totalWaste: { $sum: "$quantity" } } },
      { $sort: { totalWaste: -1 } },
    ]);

    const sectorWiseWaste = await Waste.aggregate([
      { $group: { _id: "$sector", totalWaste: { $sum: "$quantity" } } },
      { $sort: { totalWaste: -1 } },
    ]);

    const topContributors = await Waste.aggregate([
      { $group: { _id: "$user", totalWaste: { $sum: "$quantity" } } },
      { $sort: { totalWaste: -1 } },
      { $limit: 5 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "userData" } },
      { $unwind: "$userData" },
    ]);

    const categoryWiseWaste = await Waste.aggregate([
      { $group: { _id: "$category", totalWaste: { $sum: "$quantity" } } },
      { $sort: { totalWaste: -1 } },
    ]);

    res.json({
      totalUsers,
      totalWaste: totalWaste[0]?.total || 0,
      cityWiseWaste,
      sectorWiseWaste,
      topContributors,
      categoryWiseWaste,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.get("/admin/waste-overview", async (req, res) => {
  try {
    const result = await Waste.aggregate([
      {
        $group: {
          _id: {
            city: "$city",
            // Format date as YYYY-MM-DD
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            user: "$user",
            category: "$category"
          },
          totalWaste: { $sum: "$quantity" }
        }
      },
      { $sort: { totalWaste: -1 } }, // Sort in descending order
      {
        $lookup: {
          from: "users",
          localField: "_id.user",
          foreignField: "_id",
          as: "userData"
        }
      },
      { $unwind: "$userData" }
    ]);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.get("/carbon", async (req, res) => {
  res.render("carbon");
});

app.get("*", (req, res) => {
  res.redirect("/index");
});

function formatToBulletPoints(text) {
  // Ensure bullet points are formatted properly
  let formattedText = text
    .replace(/\* \*\*(.*?)\*\*:/g, "\n- **$1:**") // Fix headers
    .replace(/\* /g, "\n- "); // Ensure new bullet points

  return formattedText.trim();
}

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
