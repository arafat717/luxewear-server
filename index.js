const express = require("express");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
let cors = require("cors");
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

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
    const productCollection = client.db("luxewear").collection("eproducts");

    app.get("/products", async (req, res) => {
      const { sort, filterType, category, brand, size, minPrice, maxPrice } =
        req.query;
      console.log("from bac", category);

      let filter = {};
      // sort data
      let sortCriteria = {};

      // Filter by category
      if (category) {
        filter.category = category;
      }

      // Modify filter to allow multiple brands
      if (brand) {
        const brandArray = brand.split(","); // Convert query string into an array
        filter.brand = { $in: brandArray }; // MongoDB filter to match any selected brand
      }

      // Filter by size
      if (size) {
        filter.sizes = size; // Checks if the size exists in the sizes array
      }

      // Filter by price range
      if (maxPrice) {
        filter.discount_price = { $lte: parseFloat(maxPrice) }; // Filter products within maxPrice
      }

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

      // filter data

      if (filterType === "new-arrivals") {
        filter.isNewArrival = true;
      } else if (filterType === "best-seller") {
        filter.best_seller = true;
      } else if (filterType === "on-sale") {
        filter.on_sale = true;
      }

      const result = await productCollection
        .find(filter)
        .sort(sortCriteria)
        .toArray();
      res.send(result);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
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
