const express = require('express');
const jwt = require('jsonwebtoken');
const secretKey = require('./secretKey.js').key;
const myApp= express();
myApp.use(express.json());

const { initializeApp,  cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const serviceAccount = require('./all-about-api-s-smp-2024key.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const userCollection= db.collection('users');

myApp.listen(3000, ()=>{
    console.log("Running on port 3000");
});

myApp.get("/", (req,res)=>{
    res.send("Welcome to my API page. Go to /home for more details");
});

myApp.get("/home", (req,res)=>{
    res.send("Please register first at /register. Then you can login using your password at /login. Then you can create your dream list at /list.")
});

myApp.use(async(req,res,next)=>{
    if(!(req.body.hasOwnProperty("name") || req.body.hasOwnProperty("email") || req.body.hasOwnProperty("age") || req.body.hasOwnProperty("password"))){
        next();
    }
    else{
        if((req.path==='/register'&&req.method==='POST')||(req.path==='/user'&&req.method==='PUT')){
            const searchId=req.query.uid;
            let uName=req.body.name;
            if(uName===undefined){
                uName=(await userCollection.doc(searchId).get()).data().name;
            }
            let uMail=req.body.email;
            if(uMail===undefined){
                uMail=(await userCollection.doc(searchId).get()).data().email;
            }
            let uAge=req.body.age;
            if(uAge===undefined){
                uAge=(await userCollection.doc(searchId).get()).data().age;
            }
            const conditions = [
                { field: 'email', value: uMail },
                { field: 'name', value: uName },
                { field: 'age', value: uAge}
            ];
            let query = userCollection;
            conditions.forEach((condition) => {
            query = query.where(condition.field, '==', condition.value);
            });
            const querySnapshot= await query.get();
            if (!querySnapshot.empty) {
                res.status(400).send(`User already exists!`);
            }
            else {
                next();                    
            }
        }
        else{
            next();
        }
    }
});

myApp.use((req,res,next)=>{
    if(req.path==="/list"&&req.method==="PUT"){
        if(req.query.item===undefined){
            res.status(400).send(`Add your item to replace as "item" as query parameters!`);
        }
        else if(!(req.body.hasOwnProperty("item"))){
            res.status(400).send("Please add to your dream list as item");
        }
        else{
            next();
        }
    }
    else if(req.path==="/list"&&req.method==="DELETE"){
        if(req.query.item===undefined){
            res.status(400).send(`Add your item to replace as "item" as query parameters!`);
        }
        else{
            next();
        }
    }
    else if((req.path==="/list"&&req.method==="POST")){
        if(!(req.body.hasOwnProperty("item"))){
            res.status(400).send("Please add to your dream list as item");
        }
        else{
            next();
        }
    }
    else{
        next();
    }
});

myApp.post("/register", async (req,res)=>{
    const uName=req.body.name;
    const uMail=req.body.email;
    const uAge=req.body.age;
    const uPassword=req.body.password;
    if(!(req.body.hasOwnProperty("name") && req.body.hasOwnProperty("email") && req.body.hasOwnProperty("age") && req.body.hasOwnProperty("password"))){
        res.status(400).send("Please enter name, email, age and password");
    }
    else{
        const user={
            "name":uName,
            "email":uMail,
            "age":uAge,
            "password":uPassword
        };
    userCollection.add(user).then((doc)=>{
        doc.update({
        "userid":doc.id
    });            
    userCollection.doc(doc.id).get().then((doc)=>{
        res.send(`${JSON.stringify(doc.data())} was created successfully!\n\nPlease remember your user id. If forgotten, you will not be able to retrieve your data!`);
    });
    });
}
});

myApp.use((req, res, next)=>{
    const searchId=req.query.uid;
    if(searchId===undefined){
        res.status(400).send(`Please add the user id as "uid" as a query parameter.`);
    }
    else{
        next();
    }
});

myApp.use(async (req, res, next)=>{
    const searchId= req.query.uid;
    const doc= await(userCollection.doc(searchId).get());
    if(doc.exists){
        next();
    }
    else{
        res.status(404).send(`Usser Id: ${searchId} not found!`);
    }
});

myApp.post("/login", async (req, res)=>{
    const searchId=req.query.uid;
    const pswd=req.body.password;
    const doc= await userCollection.doc(searchId).get();
    const password= doc.data().password;
    if(pswd===undefined){
        res.status(400).send(`Please enter password as a JSON body!`);
    }
    else{
        if(pswd===password){
            const token= jwt.sign(doc.data().password,secretKey);
            res.send(`Secret Token for login: ${token}\n`);
        }
        else{
            res.status(401).send(`Incorrect password!`);
        }
    }
});

myApp.use(async (req, res, next)=>{
    const token= req.headers['token'];
    const searchId=req.query.uid;
    const password= (await userCollection.doc(searchId).get()).data().password;
    if(token){
        try{
            const pswd=jwt.verify(token,secretKey);
            if(pswd===password){
                next();
            }
            else{
                throw Error;
            }
        }
        catch{
            res.status(401).send(`Invalid token!`);
        }
    }
    else{
        res.status(400).send(`Please enter access token as a header: token`);
    } 
});

myApp.get("/user", async (req,res)=>{
    const searchId=req.query.uid;
    const doc= await userCollection.doc(searchId).get();
    const usr={
        "name":doc.data().name,
        "email":doc.data().email,
        "age":doc.data().age,
        "userid":doc.data().userid,
        "password":doc.data().password
    };
    res.send(`${JSON.stringify(usr)}`);
});

myApp.put("/user", async (req,res)=>{
    const searchId=req.query.uid;
    const uName=req.body.name;
    const uMail=req.body.email;
    const uAge=req.body.age;
    const uPassword=req.body.password;
    const doc = await userCollection.doc(searchId).get();
        if(!(req.body.hasOwnProperty("name") || req.body.hasOwnProperty("email") || req.body.hasOwnProperty("age") || req.body.hasOwnProperty("password"))){
            res.status(400).send("Please enter name, email, age or password to be updated");
        }
        else{
            if(uAge!==undefined||uMail!==undefined||uName!==undefined||uPassword!==undefined){
                    if(uAge!==undefined){
                        doc.ref.update({
                            age:uAge
                        });
                    }
                    if(uName!==undefined){
                        doc.ref.update({
                            name:uName
                        });
                    }
                    if(uMail!==undefined){
                        doc.ref.update({
                            email:uMail
                        });
                    }
                    if(uPassword!==undefined){
                        doc.ref.update({
                            password:uPassword
                        });
                    }
                    res.send(`All updates made successfully!`);
            }
            else{
                res.status(400).send(`Please enter one of the fields to be changed!`);
            }
        }
});

myApp.get("/list",async (req,res)=>{
    const searchId=req.query.uid;
    const doc=await userCollection.doc(searchId).get();
    res.send(doc.data().itemList);
});

myApp.post("/list", async (req,res)=>{
    const usrId=req.query.uid;
    const item=req.body.item;
    const doc=await userCollection.doc(usrId).get(); 
    doc.ref.update({
        itemList: FieldValue.arrayUnion(item)
    })
    .then(()=>{
        res.send(`${item} added successfully!`);
    });
});

myApp.put("/list", async (req,res)=>{
    const searchId=req.query.uid;
    const searchItem=req.query.item;
    const newItem=req.body.item;
    const doc=await userCollection.doc(searchId).get();
    const index=doc.data().itemList.indexOf(searchItem);
    if(index>-1){
        const itemRem= await doc.ref.update({
            itemList: FieldValue.arrayRemove(searchItem)
        });
        const itemAdd= await doc.ref.update({
            itemList: FieldValue.arrayUnion(newItem)
        });
        res.send(`${searchItem} successfully replaced by ${newItem}!`);
    }
    else{
        res.status(404).send(`${searchItem} not found!`);
    }
});

myApp.delete("/list", async (req,res)=>{
    const searchId=req.query.uid;
    const searchItem=req.query.item;
    const doc=await userCollection.doc(searchId).get();
    const index=doc.data().itemList.indexOf(searchItem);
    if(index>-1){
        const updatedList=doc.data().itemList.filter(item => item !== searchItem);
        doc.ref.update({
            itemList: updatedList
        })
        .then(()=>{
            res.send(`${searchItem} successfully deleted!`);
        });
    }
    else{
        res.status(404).send(`${searchItem} not found!`);
    }
});

myApp.delete("/user", async (req,res)=>{
    const searchId=req.query.uid;
    userCollection.doc(searchId).get().then((doc)=>{
        doc.ref.delete();
        res.send(`User with uid: ${searchId} successfully deleted!`);
    });
});