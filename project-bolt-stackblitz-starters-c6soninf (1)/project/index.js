const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const app = express();
const port = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static('public'));

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Routes
app.get('/', (req, res) => {
  res.render('index', { user: req.session.user });
});

app.get('/login', (req, res) => {
  res.render('login', { messages: req.flash() });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  // Demo login - replace with actual authentication
  if (email === 'demo@example.com' && password === 'password') {
    req.session.user = { email };
    res.redirect('/');
  } else {
    req.flash('error', 'Invalid credentials');
    res.redirect('/login');
  }
});

app.get('/signup', (req, res) => {
  res.render('signup', { messages: req.flash() });
});

app.post('/signup', (req, res) => {
  const { email, password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    req.flash('error', 'Passwords do not match');
    return res.redirect('/signup');
  }
  // Demo signup - replace with actual user creation
  req.session.user = { email };
  res.redirect('/');
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Protected routes
app.get('/waste-classification', isAuthenticated, (req, res) => {
  res.render('waste-classification', { user: req.session.user });
});

app.get('/chatbot', isAuthenticated, (req, res) => {
  res.render('chatbot', { user: req.session.user });
});

app.get('/eco-score', isAuthenticated, (req, res) => {
  res.render('eco-score', { user: req.session.user });
});

app.get('/pickup-scheduling', isAuthenticated, (req, res) => {
  res.render('pickup-scheduling', { user: req.session.user });
});

app.get('/marketplace', isAuthenticated, (req, res) => {
  res.render('marketplace', { user: req.session.user });
});

app.get('/waste-data', isAuthenticated, (req, res) => {
  res.render('waste-data', { user: req.session.user });
});

app.get('/disposal-guide', isAuthenticated, (req, res) => {
  res.render('disposal-guide', { user: req.session.user });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});