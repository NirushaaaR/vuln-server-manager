#!/bin/bash

# dont forget to chmod 774

if [ $# -lt 3 ]; then
    1>&2 echo "usage deploy-docker.sh <deploy/delete> <docker> <port>"
    exit 1
else
    if [ $1 == "deploy" ]; then
        docker run -p $3:$3 -d $2
        echo "Finish deploy!!"
    elif [ $1 == "delete" ]; then
        docker rm -f $(docker ps -q --filter ancestor=$2)
        echo "Finish delete!!"
    fi 
fi