const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5000',
        'https://car-doctor-a0f87.web.app',
        'https://car-doctor-a0f87.firebaseapp.com'
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser())


// console.log(process.env.DB_PASS)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ornkcqn.mongodb.net/?retryWrites=true&w=majority`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
//middleware
const logger = (req, res, next) => {
    console.log("log info", req.method, req.url);
    next()
}

const verifyToken = (req, res, next) => {
    const token = req.cookies.token
    console.log("verify", token);
    if (!token) {
        return res.status(401).send({ message: "Unauthorized access" })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Unauthorized access" })
        }
        req.user = decoded
        next()
    })
}
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        client.connect();

        const serviceCollection = client.db('carDoctor').collection('services');
        const bookingCollection = client.db('carDoctor').collection('bookings');

        //api of jwt
        app.post('/jwt', async (req, res) => {
            console.log(req.body);
            const user = req.body
            const cookie = req.cookies
            console.log('cookie parser', cookie);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none'
                })
                .send({ success: true })

        })

        app.post('/logout', async (req, res) => {
            const user = req.body
            console.log(user);
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })

        })

        //this is services data
        app.get('/services', async (req, res) => {
            const filter = req.query
            console.log(filter);
            // const query = {price: {$lte: 40 , $gt: 20}}
            // db.InspirationalWomen.find({first_name: { $regex: /Harriet/i} })
            const query = {
                // title: {$regex: filter.search , $options: 'i'}
            }
            console.log(query);
            // const query = {}
            const options = {
                sort: {price: filter.sort === 'asc' ? 1 : -1}
            }
            const cursor = serviceCollection.find(query, options);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }

            const options = {
                // Include only the `title` and `imdb` fields in the returned document
                projection: { title: 1, price: 1, service_id: 1, img: 1 },
            };

            const result = await serviceCollection.findOne(query, options);
            res.send(result);
        })


        // bookings 
        app.get('/bookings', logger, verifyToken, async (req, res) => {
            console.log(req.query.email);
            console.log("cook cook cookies", req.cookies);
            console.log("get user in jwt", req.user);
            if (req.user.email !== req.query.email) {
                return res.status(403).send({ message: "forbidden access" })
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            console.log(booking);
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        });

        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedBooking = req.body;
            console.log(updatedBooking);
            const updateDoc = {
                $set: {
                    status: updatedBooking.status
                },
            };
            const result = await bookingCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('doctor is running')
})

app.listen(port, () => {
    console.log(`Car Doctor Server is running on port ${port}`)
})