//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const url = require("url");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();
mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });

app.use(
  session({
    secret: " Jaldoot : The Drought Predictors ",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

const userSchema = new mongoose.Schema({
  usertype : Boolean,
  location : String,
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username, usertype : user.usertype,location : user.location });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "https://experience.arcgis.com/experience/bf35781a088f46a7a6c7a32a544afe90/",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.APP_ID,
      clientSecret: process.env.APP_SECRET,
      callbackURL: "https://experience.arcgis.com/experience/bf35781a088f46a7a6c7a32a544afe90/",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ facebookId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.get("/", function (req, res) {
  res.render("home");
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});


app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: ["public_profile"] })
);

app.get("/logout", function (req, res) {
  req.logout(function (err) {});
  res.redirect("/");
});

app.get(
  "https://experience.arcgis.com/experience/bf35781a088f46a7a6c7a32a544afe90/",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect secrets.
    var pathname = url.parse(req.url).pathname;
    res.writeHead(301, {
      Location:
        "https://experience.arcgis.com/experience/bf35781a088f46a7a6c7a32a544afe90/" +
        pathname,
    });
    res.end();
  }
);

app.get(
  "https://experience.arcgis.com/experience/bf35781a088f46a7a6c7a32a544afe90/",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect secrets.
    var pathname = url.parse(req.url).pathname;
    res.writeHead(301, {
      Location:
        "https://experience.arcgis.com/experience/bf35781a088f46a7a6c7a32a544afe90/" +
        pathname,
    });
    res.end();
  }
);

app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function (req, res) {
  const submittedSecret = req.body.secret;
  console.log(req.user.id);
  User.findById(req.user.id, function (err, foundUser) {
    console.log(1);
    if (err) {
      console.log(2);
      console.log(err);
    } else {
      console.log(3);
      if (foundUser.id == req.user.id) {
        console.log(4);
        console.log(foundUser);
        foundUser.secret = submittedSecret;
        foundUser.save(function () {
          res.redirect("secrets");
        });
      }
    }
  });
});

app.post("/register", function (req, res) {

  User.register(
    { username: req.body.username ,usertype : req.body.usertype,location : req.body.location },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
          res.redirect("/login");
        }
      }
    
  );
});

app.post("/login", function (req, res) {

  const user = new User({
    username: req.body.username,
    password: req.body.password,
    usertype : req.body.usertype,
    location : req.body.location
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
      res.redirect("/login");
    } else {
      passport.authenticate("local")(req, res, function () {
        var pathname = url.parse(req.url).pathname;
        res.writeHead(301, {
          Location:
            "https://experience.arcgis.com/experience/bf35781a088f46a7a6c7a32a544afe90/" +
            pathname,
        });
        res.end();
      });
    }
  });
});

app.listen(3000, function () {
  console.log("Server started successfully on port 3000");
});
