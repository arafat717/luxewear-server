const express = require("express");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
let cors = require("cors");
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const productCollection = client.db("luxewear").collection("products");

    app.get("/products", async (req, res) => {
      const { sort } = req.query;
      console.log("from bac", sort);

      let sortCriteria = {};

      if (sort === "title_asc") {
        sortCriteria = { name: 1 };
      } else if (sort === "title_desc") {
        sortCriteria = { name: -1 };
      } else if (sort === "price_asc") {
        sortCriteria = { discount_price: 1 };
      } else if (sort === "price_desc") {
        sortCriteria = { discount_price: -1 };
      } else if (sort === "rating_asc") {
        sortCriteria = { rating: 1 };
      } else if (sort === "rating_desc") {
        sortCriteria = { rating: -1 };
      } else if (sort === "default") {
        sortCriteria = { _id: 1 };
      }

      const result = await productCollection
        .find()
        .sort(sortCriteria)
        .toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
