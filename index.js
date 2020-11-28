const express = require('express');
const app = express();
const CORS = require('cors');
const os = require('os');
const mongoose = require('mongoose');
const { execFile } = require("child_process");

app.use(express.json());

app.use(CORS());
// const allowedList = ["localhost", "127.0.0.1"];
// app.use(CORS({
//     origin: function (origin, cb) {
//         if (allowedList.indexOf(origin) !== -1 ) {
//             cb(null, true);
//         } else {
//             cb(new Error('Not allowed by CORS'));
//         }
//     }
// }));

// connect to db
mongoose.connect(
    "mongodb+srv://project_user:e33b23f8df1c366eccf2@cluster0.itzk5.gcp.mongodb.net/manageDocker?retryWrites=true&w=majority",
    { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true }
).then((val) => console.log("connect to db"));

const DockerInstance = require('./Model');

app.post("/docker", async (req, res) => {
    const { port, docker } = req.body;
    if (port !== undefined && docker !== undefined) {
        // beware command injection !!!!
        const command = `${__dirname}/manage-docker.sh`;
        const args = ['deploy', docker, port];

        try {
            await DockerInstance.create({ name: docker, port: port, status: "deploying" });
        } catch (error) {
            console.error(error);
            await DockerInstance.updateOne({ name: docker }, { status: "deploying" });
        }

        execFile(command, args, async (err, outputs) => {

            if (err) {
                await DockerInstance.updateOne({ name: docker }, { status: "failed to deploy" });
                console.log("err", err);
                return;
            }

            await DockerInstance.updateOne({ name: docker }, { status: "deployed" });

            console.log("outputs", outputs);
        });

        return res.json({ "status": "deploying docker" });
    }

    return res.status(400).json({ "status": "wrong types of input" });
});


app.get("/docker/:docker", async (req, res) => {
    const docker = req.params.docker;
    const instance = await DockerInstance.findOne({ name: docker });

    if (instance !== null) {
        return res.json({ "data": instance, "url": `http://${os.hostname}:${instance.port}` });
    } else {
        return res.status(404).json({ "err": `docker image ${docker} not exists on server` });
    }
});

app.delete("/docker/:docker", async (req, res) => {
    const docker = req.params.docker;

    const instance = await DockerInstance.findOne({ name: docker });

    if (instance !== null) {
        const command = `${__dirname}/manage-docker.sh`;
        const args = ['delete', docker, "bruh"];

        execFile(command, args, async (err, outputs) => {

            if (err) {
                console.log("err", err);
                await DockerInstance.updateOne({ name: docker }, { status: "fail to delete" })
                return;
            }

            console.log("outputs", outputs);
            await DockerInstance.updateOne({ name: docker }, { status: "remove from server" });
        });

        return res.json({ "status": "deleting the container" });

    } else {
        return res.status(404).json({ "err": "docker images not exists" });
    }

})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("server start"));