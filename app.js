require('dotenv').config();
const express= require('express');
const bodyParser= require('body-parser');
const ejs = require('ejs');
const mongoose= require('mongoose');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const saltRounds = 10;



const app= express();
  
mongoose.connect('mongodb://localhost:27017/billmanagerDB');
const userSchema= new mongoose.Schema({
    name:String,
    password: String,
    email: String,
    bills:[{
        billName:String,
        billItems: [{
            date: String,
            amount: Number,
            units:Number,
            description: String
        }]

    }]
});



app.use(express.urlencoded({extended:true}));
app.set('view engine', 'ejs');
app.use(express.static(__dirname+"/public"));
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
  }));


app.use(passport.initialize());
app.use(passport.session());


passport.serializeUser(function(user, done) {
    done(null, user.id);
    });
    
passport.deserializeUser(function(id, done) {
User.findById(id, function (err, user) {
    done(err, user);
});
});


const User= new mongoose.model('User',userSchema);

passport.use(new LocalStrategy(
    function(username, password, done) {
      User.findOne({ email: username }, function (err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        
        bcrypt.compare(password, user.password, function(err, result) { 
            if(!result){return done(null, false);}
            return done(null, user);
        });
        
      });
    }
));

passport.use(new GoogleStrategy({
    clientID:     "904127080568-9prb5gmovui38aoth07c6ao34gmsa31d.apps.googleusercontent.com",
    clientSecret: "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",
    callbackURL: "http://localhost:3000/google/callback",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    
    User.findOne({email:profile.email }, (err, user)=>{
        if(err){ return done(err)}
        if(!user){
            const newUser= new User({
                name: profile.displayName,
                email: profile.email
            });
            newUser.save(err=>{
                if(err){return done(err)}
            });
            User.findOne({email:profile.email }, (er,user)=>{
                if(er){ return done(er)}
                return done(null, user);
            });
        } return done(null, user);
    });
    
  }
));

function checkAuth(req,res,next){
    if(req.isAuthenticated()){
        //req.isAuthenticated() will return true if user is logged in
        next();
    } else{
        res.redirect("/login");
    }
}

app.get('/',(req,res)=>{
    res.render('home');
});

app.get('/login',(req,res)=>{
    res.render('login');
    
});

app.post('/login', 
  passport.authenticate('local', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/dashboard/welcome');
  });

app.get('/register',(req,res)=>{

    res.render('register');
});

app.post('/register',(req,res)=>{
    bcrypt.hash(req.body.pass, saltRounds, function(err, hash) {
        const newUSer= new User({
            name: req.body.name,
            password: hash,
            email: req.body.email
        });
        newUSer.save(err=>{
            if(err){
                res.redirect('/register?err=true');
            }else{
                res.redirect('/login');
            }
        });
    });
   
});

app.get('/google',
  passport.authenticate('google', { scope:
      [ 'email', 'profile' ] }
));

app.get( '/google/callback',
    passport.authenticate( 'google', {
        successRedirect: '/dashboard/welcome',
        failureRedirect: '/login'
}));
app.get('/dashboard/welcome',checkAuth,(req,res)=>{
    res.render('dashboard',{user:req.user,pageID:'welcome'});
});
app.get('/dashboard/:billID',checkAuth, (req,res)=>{
    // console.log(req.user);
    // const billItems= req.user.bills;
    const pageID=req.params.billID;
    const bill= req.user.bills.find(x=> x._id==pageID);

    res.render('dashboard',{user:req.user,pageID:pageID,bill:bill});
});

app.post('/addbill',checkAuth, (req,res)=>{
    const newBill= {
        billName:req.body.billName,
        billItems:[]
    }
    User.updateOne({email: req.user.email},{$push : {bills:newBill}},err=>{
        if(!err){
            res.redirect('/dashboard/welcome');
        }
    });
    
    


});

app.post('/addexpence',checkAuth, (req,res)=>{
    const newExpence= {
        date: req.body.date,
        amount: Number(req.body.amount),
        units: Number(req.body.units),
        description: req.body.desc
    }
    const billID= req.body.submit;
    // User.updateOne({email:req.user.email, "bills._id":})
    User.updateOne({email:req.user.email, "bills._id": new mongoose.Types.ObjectId(billID) }, {$push:{"bills.$.billItems":newExpence}}, err=>{
        if(!err){
            res.redirect('/dashboard/'+billID);
        }
    });
    

});

app.get('/logout',checkAuth ,function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });
app.listen('3000', ()=>{
    console.log('server started');
});