const express= require('express');
const bodyParser= require('body-parser');
const ejs = require('ejs');


const app= express();

app.use(express.urlencoded({extended:true}));
app.set('view engine', 'ejs');
app.use(express.static("public"));

app.get('/',(req,res)=>{
    res.render('home');
});

app.get('/login',(req,res)=>{
    res.render('login');
});
app.get('/register',(req,res)=>{
    res.render('register');
});

app.get('/dash',(req,res)=>{
    res.render('dashboard');
});
app.listen('3000', ()=>{
    console.log('server strated');
});