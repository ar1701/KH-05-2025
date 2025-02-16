const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index");
});

let users = {}; // Store users with socket IDs

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("register", (username) => {
    users[username] = socket.id;
    console.log(`${username} registered with ID: ${socket.id}`);
  });

  socket.on("private_message", ({ sender, receiver, message }) => {
    const receiverSocket = users[receiver];
    if (receiverSocket) {
      io.to(receiverSocket).emit("receive_message", { sender, message });
    }
  });

  socket.on("disconnect", () => {
    Object.keys(users).forEach((user) => {
      if (users[user] === socket.id) delete users[user];
    });
    console.log("User disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
