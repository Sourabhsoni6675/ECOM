const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth.routes');
const passport = require('./utils/passport');
const errorMiddleware = require('./middlewares/error.middleware');
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./utils/swagger-output.json');

const app = express();
app.set('trust proxy', 1); // Fix for Render proxy

app.use(cors({
  origin: '*',
}));
app.use(helmet());
app.use(express.json());
app.use(passport.initialize());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many auth attempts. Try again later.'
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

app.use('/api/auth', authLimiter);

app.use('/api/auth', authRoutes);

app.use(errorMiddleware);

module.exports = app;