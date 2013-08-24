#!/bin/bash 

echo "Provision"

# Current folder
cwd=$(pwd)

# Dependencies and helpers
sudo apt-get install python-software-properties python g++ make vim screen curl -q -y

# Node
if hash node 2>/dev/null; then
	echo "Node is already installed. Skipping..."
else
	tempNodeInstallDir=mktemp -d
	cd $tempNodeInstallDir
	sudo apt-get install g++ make -q -y
	mkdir node-latest && cd node-latest
	curl http://nodejs.org/dist/node-latest.tar.gz | tar xz --strip-components=1
	./configure
	make
	sudo make install
	cd $cwd
	rm -rf $tempNodeInstallDir
fi

cd backend
npm install --no-bin-link
cd $cwd

cd frontend
npm install --no-bin-link
cd $cwd
