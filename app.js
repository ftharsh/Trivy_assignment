const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();

mongoose.connect('mongodb://localhost:27017/users', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  sessionID: String,
});

const User = mongoose.model('User', userSchema);

function sendResponse(res, status, message, data = null) {
  res.status(status).json({ status, message, data });
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'nhi_batauga',
  resave: false,
  saveUninitialized: true,
}));

app.get('/', (req, res) => {
  if (req.session.username) {
    sendResponse(res, 200, `Hello, ${req.session.username}!`, { link: '/profile', action: 'View Profile', logout: '/logout' });
  } else {
    sendResponse(res, 200, 'You are not logged in.', { login: '/login' });
  }
});

app.use((req, res, next) => {
  if (!req.session.username) {
    return sendResponse(res, 401, 'Unauthorized');
  }
  next();
});

app.get('/profile', (req, res) => {
  const username = req.session.username;
  sendResponse(res, 200, `Profile of ${username}.`, { logout: '/logout' });
});

app.post('/post-action', (req, res) => {
  const username = req.session.username;
  sendResponse(res, 200, `POST action for ${username}.`, { logout: '/logout' });
});

app.put('/put-action', (req, res) => {
  const username = req.session.username;
  sendResponse(res, 200, `PUT action for ${username}.`, { logout: '/logout' });
});

app.patch('/patch-action', (req, res) => {
  const username = req.session.username;
  sendResponse(res, 200, `PATCH action for ${username}.`, { logout: '/logout' });
});

app.delete('/delete-action', (req, res) => {
  const username = req.session.username;
  sendResponse(res, 200, `DELETE action for ${username}.`, { logout: '/logout' });
});

app.route('/login')
  .get((req, res) => {
    res.sendFile(__dirname + '/login.html');
  })
  .post(async (req, res) => {
    const { username, password } = req.body;

    try {
      const user = await User.findOne({ username, password });

      if (user) {
        if (user.sessionID !== null && user.sessionID !== req.sessionID) {
          sendResponse(res, 400, 'User already logged in on another device.');
        } else {
          req.session.username = user.username;
          user.sessionID = req.sessionID;
          await user.save();
          sendResponse(res, 200, 'Login successful.', { redirect: '/' });
        }
      } else {
        sendResponse(res, 401, 'Invalid username or password.');
      }
    } catch (error) {
      console.error(error);
      sendResponse(res, 500, 'Internal Server Error');
    }
  });

app.get('/logout', async (req, res) => {
  if (req.session.username) {
    try {
      const user = await User.findOne({ username: req.session.username });
      if (user) {
        user.sessionID = null;
        await user.save();
      }

      req.session.destroy();
      sendResponse(res, 200, 'Logout successful.', { redirect: '/' });
    } catch (error) {
      console.error(error);
      sendResponse(res, 500, 'Internal Server Error');
    }
  } else {
    sendResponse(res, 401, 'Not logged in.');
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  sendResponse(res, 500, 'Internal Server Error');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
