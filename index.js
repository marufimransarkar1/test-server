const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 3000
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

//middleware
app.use(cors());
app.use(express.json());




//const uri = process.env.MONGODB_URI; 
const uri = "mongodb+srv://badhonbiswast_db_user:XMpr2kj5ljskeQy2@cluster0.vsobqwr.mongodb.net/?appName=Cluster0";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // mongodb database collection products
     const productsCollection = client.db('dealbuzzzDB').collection('products')

    /*/ get product api
    app.get('/products', async (req, res) => {
        const cursor = productsCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })*/

        app.get('/api/products', async (req, res) => {
  const cursor = productsCollection.find();
  const result = await cursor.toArray();
  res.send(result);
});

    //post product api
    app.post("/products", async (req, res) => {
    const product = req.body;

    if (!product.name || !product.price) {
    return res.status(400).send({ message: "Missing required fields" });
    }

    const result = await productsCollection.insertOne(product);
    res.send(result);
    });





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello World!')
})

/* app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
}) */

module.exports = app;