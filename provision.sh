#!/bin/bash 

echo "Provision"

# Current folder
cwd=$(pwd)

# Dependencies and helpers
sudo apt-get install python-software-properties python g++ make vim screen curl vlc -q -y

# Node
if hash node 2>/dev/null; then
	echo "Node is already installed. Skipping..."
else
	#tempNodeInstallDir=mktemp -d
	#cd $tempNodeInstallDir
	#sudo apt-get install g++ make -q -y
	#mkdir node-latest && cd node-latest
	#curl http://nodejs.org/dist/node-latest.tar.gz | tar xz --strip-components=1
	#./configure
	#make
	#sudo make install
	#cd $cwd
	#rm -rf $tempNodeInstallDir

	sudo add-apt-repository ppa:chris-lea/node.js  -y
	sudo apt-get update  
	sudo apt-get install nodejs -y
fi

# Make sure this script works both with and without vagrant
if [ -d "/vagrant" ]; then
	cd /vagrant
fi

cd backend
npm install --no-bin-link
cd ../frontend
npm install --no-bin-link
cd $cwd
