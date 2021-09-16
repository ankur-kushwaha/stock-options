
const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://ankur:ankur@cluster0.wgb6k.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
  console.log(err);
  const collection = client.db("myFirstDatabase").collection("users");
  // perform actions on the collection object
  console.log(collection)
  client.close();
});
