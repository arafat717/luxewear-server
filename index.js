const express = require("express");
const app = express();
require("dotenv").config();
var jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
let cors = require("cors");
const port = process.env.PORT || 3000;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const veritytoken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "forbidden access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(401).send({ message: "forbidden access" });
    }
    req.user = decoded;
    next();
  });
};

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
    const cartCollection = client.db("luxewear").collection("carts");
    const wishCollection = client.db("luxewear").collection("wishs");
    const userCollection = client.db("luxewear").collection("users");

    const verifyAdmin = async (req, res, next) => {
      const email = req.user.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(401).send({ message: "forbidden access" });
      }
      next();
    };

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;

      if (!user || !user.email) {
        return res.status(400).json({ error: "Invalid user data" });
      }

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.cookie("token", token, { httpOnly: true, secure: false });
      res.json({ success: true });
    });

    // clear token after logout
    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", { httpOnly: true, secure: false })
        .send({ success: true });
    });

    // users related api
    app.post("/user/add", async (req, res) => {
      const data = req.body;
      const result = await userCollection.insertOne(data);
      res.send(result);
    });

    app.get("/user", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };

      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.get("/users", veritytoken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.delete("/user/:id", veritytoken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/user/admin/:id", veritytoken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.get("/user/admin/:email", veritytoken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.user.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    // Update User API
    app.put("/update-user/:email", async (req, res) => {
      const { email } = req.params;
      const { name, phone, country, image } = req.body;

      const filter = { email: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          name: name,
          phone: phone,
          country: country,
          image: image,
        },
      };
      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    app.get("/products", async (req, res) => {
      const { sort, filterType, category, brand, size, minPrice, maxPrice } =
        req.query;

      let filter = {};
      // sort data
      let sortCriteria = {};

      // Filter by category
      if (category) {
        filter.category = category;
      }

      if (brand) {
        const brandArray = brand.split(",");
        filter.brand = { $in: brandArray };
      }

      // Filter by size
      if (size) {
        filter.sizes = size;
      }

      // Filter by price range
      if (maxPrice) {
        filter.discount_price = { $lte: parseFloat(maxPrice) };
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

    app.post("/product/add", veritytoken, async (req, res) => {
      const data = req.body;
      const result = await productCollection.insertOne(data);
      res.send(result);
    });

    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(filter);
      res.send(result);
    });

    app.post("/cart/add", veritytoken, async (req, res) => {
      const data = req.body;
      const result = await cartCollection.insertOne(data);
      res.send(result);
    });

    app.post("/wish/add", veritytoken, async (req, res) => {
      const data = req.body;
      const result = await wishCollection.insertOne(data);
      res.send(result);
    });

    app.delete("/cart/:id", veritytoken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    app.delete("/wish/:id", veritytoken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/carts", veritytoken, async (req, res) => {
      const email = req.query.email;
      const query = { email };

      if (req?.user?.email !== email) {
        return res.status(401).send({ message: "forbidden access" });
      }

      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/wishs", veritytoken, async (req, res) => {
      const email = req.query.email;
      const query = { email };

      if (req?.user?.email !== email) {
        return res.status(401).send({ message: "forbidden access" });
      }

      const result = await wishCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    app.get("/wish/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishCollection.findOne(query);
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
