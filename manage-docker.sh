#!/bin/bash

# dont forget to chmod 774

if [ $# -lt 3 ]; then
    1>&2 echo "usage deploy-docker.sh <deploy/delete> <docker> <port>"
    exit 1
else
    PORT=$3
    IMAGE=$2
    if [ $1 == "deploy" ]; then
        docker run -p ${PORT}:${PORT} -d --restart unless-stopped ${IMAGE}
        echo "Finish deploy!!"
    elif [ $1 == "delete" ]; then
        docker rm -f $(docker ps -q --filter ancestor=${IMAGE})
        docker rmi ${IMAGE}
        echo "Finish delete!!"
    fi 
fi