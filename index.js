const express = require('express');
const app = express();
const CORS = require('cors');

app.use(express.json());

app.use(CORS());
// only allow these doamin
const allowedList = ["http://localhost:8000", "http://127.0.0.1:8000"];
const corsOption = {
    origin: function (origin, cb) {
        if (allowedList.indexOf(origin) !== -1) {
            cb(null, true);
        } else {
            cb(new Error('Error'));
        }
    }
}
// dont forget to add cors option
app.use("/manage", CORS(corsOption), require('./docker'));

app.use(function (err, req, res, next) {
    res.status(400).json({
        error: err.message
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("server start"));

