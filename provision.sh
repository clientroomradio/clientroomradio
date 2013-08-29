#!/bin/bash 

echo "Provision"

# Current folder
cwd=$(pwd)

# Dependencies and helpers
sudo apt-get update
sudo apt-get install vim screen curl vlc -q -y



# Node
if hash node 2>/dev/null; then
	echo "Node is already installed. Skipping..."
else
#	tempNodeInstallDir=mktemp -d
#	cd $tempNodeInstallDir
#	sudo apt-get install g++ make -q -y
#	mkdir node-latest && cd node-latest
#	curl http://nodejs.org/dist/node-latest.tar.gz | tar xz --strip-components=1
#	./configure
#	make
#	sudo make install
#	cd $cwd
#	rm -rf $tempNodeInstallDir

	sudo add-apt-repository ppa:chris-lea/node.js  -y
	sudo apt-get update  
	sudo apt-get install nodejs -y
fi

# Libspotify
wget https://developer.spotify.com/download/libspotify/libspotify-12.1.51-Linux-x86_64-release.tar.gz
tar zxfv libspotify-12.1.51-Linux-x86_64-release.tar.gz
cd libspotify-12.1.51-Linux-x86_64-release/
sudo make install prefix=/usr/local
sudo ldconfig
cd $cwd

# Make sure this script works both with and without vagrant
if [ -d "/vagrant" ]; then
	cd /vagrant
fi

cd backend
sudo npm install #--no-bin-link
cd ../frontend
sudo npm install #--no-bin-link
cd $cwd

#sudo screen -dmS frontend "frontend/startForever.sh"
#sudo screen -dmS backend "backend/startForever.sh"