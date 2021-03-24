const router = require('express').Router();

const { Docker } = require('./Model');
const os = require('os');
const { execFile } = require("child_process");

// change this to your server domain
const mainDomain = "localhost";

// deploy new image
router.post("/docker", async (req, res) => {
    const { port, docker } = req.body;

    if (port !== undefined && docker !== undefined) {
        // beware command injection !!!!
        const command = `${__dirname}/manage-docker.sh`;
        const args = ['deploy', docker, port];

        let instance = await Docker.findOne({ where: { name: docker } });

        if (instance !== null) {
            // check port
            if (instance.port !== null) {
                // already deploy this docker image
                return res.status(400).json({status: `Deploy '${docker}' ใน port ${instance.port} ไปแล้ว กรุณาลบแล้วทำใหม่`});
            }

            instance.status = "deploying";
            instance.isOperating = true;
            await instance.save();

        } else {
            instance = await Docker.create({
                name: docker,
                status: "deploying"
            });
        }

        execFile(command, args, async (err, stdout, stderr) => {

            if (err) {
                instance.status = `Error: ${err}`;
            } else if (stderr) {
                if (stderr.indexOf("repository does not exist") >= 0) {
                    instance.status = "ไม่พบ docker repo นี้";
                } else if (stderr.indexOf("port is already allocated") >= 0) {
                    instance.status = "deploy ด้วย port นี้ไปแล้ว";
                } else if (stderr.indexOf("Downloaded newer image for") >= 0) {
                    instance.port = port;
                    instance.status = "deployed";
                } else {
                    instance.status = stderr;
                }
            }
            else if (stdout) {
                instance.port = port;
                instance.status = "deployed";
            }
            
            instance.isOperating = false;
            await instance.save();
        });

        return res.json({ "status": "deploying docker" });
    }

    return res.status(400).json({ "status": "input ผิด ({docker, port})" });
});

// get deploying status
router.get("/docker/:docker", async (req, res) => {
    const docker = req.params.docker;
    const instance = await Docker.findOne({ where: {name: docker} });
    if (instance !== null) {
        return res.json({ "data": instance, "url": `http://${mainDomain}:${instance.port}` });
    } else {
        return res.status(404).json({ "status": "ไม่มีใน Server" });
    }
});

// undeploy and delete the image
router.delete("/docker/:docker", async (req, res) => {
    const docker = req.params.docker;

    const instance = await Docker.findOne({ where: {name: docker} });

    if (instance !== null) {
        const command = `${__dirname}/manage-docker.sh`;
        const args = ['delete', docker, "bruh"];

        instance.isOperating = true;
        instance.status = "กำลัง Delete";
        await instance.save();

        execFile(command, args, async (err, stdout, stderr) => {

            try {

                if (err) {
                    instance.status = "fail to delete";
                } else if (stderr) {
                    if (stderr.indexOf("Remove one or more containers") >= 0) {
                        instance.port = null;
                        instance.status = "remove from server";
                    } else {
                        instance.status = stderr;
                    }
                } else if (stdout) {
                    instance.port = null;
                    instance.status = "remove from server"
                }

            } catch (error) {
                instance.status = error.message;
            }

            instance.isOperating = false;
            await instance.save();
        });

        return res.json({ "status": "deleting the container" });

    } else {
        return res.status(404).json({ "err": "ไม่มีอยู่ใน Server" });
    }

});


module.exports = router;
