'use strict';

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'missing_client_id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'missing_client_secret',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // 1. Check if user already exists with this Google ID
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        return done(null, user);
      }

      // 2. If not, check if user exists with the same email
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      
      if (email) {
        user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
          // Link Google ID to existing account
          user.googleId = profile.id;
          if (!user.avatarUrl && profile.photos && profile.photos[0]) {
            user.avatarUrl = profile.photos[0].value;
          }
          await user.save({ validateBeforeSave: false });
          return done(null, user);
        }
      }

      // 3. Create a new user
      const newUser = await User.create({
        name: profile.displayName,
        email: email || `${profile.id}@google.com`,
        googleId: profile.id,
        avatarUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : ''
      });

      return done(null, newUser);

    } catch (error) {
      console.error('[passport] Google Auth Error:', error);
      return done(error, null);
    }
  }
));

module.exports = passport;
