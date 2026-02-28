const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth.routes');
const passport = require('./utils/passport');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();

app.use(cors({
  origin: '*',
}));
app.use(helmet());
app.use(express.json());
app.use(passport.initialize());
app.use(errorMiddleware);


const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many auth attempts. Try again later.'
});

app.use('/api/auth', authLimiter);

app.use('/api/auth', authRoutes);

module.exports = app;