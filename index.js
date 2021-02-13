const express = require('express');
const app = express();
const CORS = require('cors');
const os = require('os');
const mongoose = require('mongoose');
const { execFile } = require("child_process");

app.use(express.json());

// app.use(CORS());
const allowedList = ["http://localhost:8000", "http://127.0.0.1:8000"];
app.use(CORS({
    origin: function (origin, cb) {
        console.log("origin", origin);
        if (allowedList.indexOf(origin) !== -1) {
            cb(null, true);
        } else {
            console.log("not allowed", origin);
            cb(new Error('Not allowed by CORS'));
        }
    }
}));

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
            await DockerInstance.create({ name: docker, port: port, status: "deploying", isError: false });
        } catch (error) {
            // unique on docker and port
            console.table(error);
            console.log(error);
            if (error.keyValue && error.keyValue.port) {
                return res.status(400).json({ err: "duplicate port " + error.keyValue.port })
            }
            await DockerInstance.updateOne({ name: docker }, { status: "deploying", port: port, isError: false });
        }

        execFile(command, args, async (err, stdout, stderr) => {

            if (err) {
                await DockerInstance.updateOne({ name: docker }, { status: "isError to deploy", isError: true });
                console.log("err", err);
            } else if (stderr) {
                if (stderr.indexOf("repository does not exist") >= 0) {
                    await DockerInstance.updateOne({ name: docker }, { status: "repository does not exist", isError: true })
                } else if (stderr.indexOf("port is already allocated") >= 0) {
                    await DockerInstance.updateOne({ name: docker }, { status: "already deployed", isError: true })
                } else if (stderr.indexOf("Downloaded newer image for") >= 0) {
                    await DockerInstance.updateOne({ name: docker }, { status: "deployed" });
                }
                else {
                    await DockerInstance.updateOne({ name: docker }, { status: stderr, isError: true });
                }
            }
            else if (stdout) {
                await DockerInstance.updateOne({ name: docker }, { status: "deployed", isError: false });
            }
        });

        return res.json({ "status": "deploying docker" });
    }

    return res.status(400).json({ "status": "wrong types of input" });
});


app.get("/docker/:docker", async (req, res) => {
    const docker = req.params.docker;
    const instance = await DockerInstance.findOne({ name: docker });

    if (instance !== null) {
        return res.json({ "data": instance, "url": `http://${os.networkInterfaces()['eth0'][0].address}:${instance.port}` });
    } else {
        return res.status(404).json({ "status": `remove from server` });
    }
});

app.delete("/docker/:docker", async (req, res) => {
    const docker = req.params.docker;

    const instance = await DockerInstance.findOne({ name: docker });

    if (instance !== null) {
        const command = `${__dirname}/manage-docker.sh`;
        const args = ['delete', docker, "bruh"];

        execFile(command, args, async (err, stdout, stderr) => {
            try {

                if (err) {
                    console.log("err", err);
                    await DockerInstance.updateOne({ name: docker }, { status: "fail to delete", isError: true })
                } else if (stderr) {
                    if (stderr.indexOf("Remove one or more containers") >= 0) {
                        await DockerInstance.updateOne({ name: docker }, { status: "remove from server", port: null, isError: false });
                    } else {
                        await DockerInstance.updateOne({ name: docker }, { status: stderr, isError: true });
                    }
                } else if (stdout) {
                    await DockerInstance.updateOne({ name: docker }, { status: "remove from server", port: null, isError: false });
                    setTimeout(() => DockerInstance.deleteOne({name: docker}), 5000)
                }

            } catch (error) {
                await DockerInstance.updateOne({ name: docker }, { status: error.message, isError: true });
            }

            console.log("stdout", stdout);
            console.log("stderr", stderr);
        });

        await DockerInstance.updateOne({ name: docker }, { status: "deleting", isError: false })
        return res.json({ "status": "deleting the container" });

    } else {
        return res.status(404).json({ "err": "docker images not exists" });
    }

});

// handle error
app.use("*", (req, res) => {
    res.end();
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("server start"));

// pm2 --name vuln-manager start npm -- dev
// sudo kill -9 $(sudo lsof -t -i:3000) kill port 300