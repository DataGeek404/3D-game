import express from "express";
import http from "http";
import * as socket from "socket.io";
import cors from 'cors';
import dotenv from 'dotenv';
import mainsocket from './socket-io/main.js'

dotenv.config()
const PORT = process.env.PORT || 80
const app = express();
const server = http.createServer(app)

const io = new socket.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
})

app.use(cors())
app.use(express.json({limit: "30mb", extended: true}))
app.use(express.urlencoded({limit: "30mb", extended: true}))

mainsocket(io)

app.get('/', (req, res) => {
    res.send('running')
})

server.listen(3000, function () {
    console.log("listening");
})
