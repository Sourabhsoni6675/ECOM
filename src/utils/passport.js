const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        let userRes = await pool.query(
          'SELECT * FROM users WHERE email=$1',
          [email]
        );

        let user;

        if (!userRes.rows.length) {
          const newUser = await pool.query(
            'INSERT INTO users (id, name, email, provider, is_varified) VALUES ($1,$2,$3,$4,true) RETURNING *',
            [uuidv4(), profile.displayName, email, 'google']
          );
          user = newUser.rows[0];
        } else {
          user = userRes.rows[0];
        }

        done(null, user);

      } catch (err) {
        done(err, null);
      }
    }
  )
);

module.exports = passport;