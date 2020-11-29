const mongoose = require('mongoose');

const dockerInstanceSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
    },
    port: {
        type: Number,
        unique: true,
    },
    isError: Boolean,
    status: String,
}, { timestamps: true });

module.exports = mongoose.model('DockerInstance', dockerInstanceSchema);