# update repo and install out dependencies
sudo apt-get update
sudo apt-get install -y apache2 build-essential libmp3lame-dev libvlc-dev vlc

# install node 5.7.1 binaries
wget https://nodejs.org/dist/v5.7.1/node-v5.7.1.tar.gz
tar xzf node-v5.7.1.tar.gz
(cd node-v5.7.1 && ./configure && sudo make install)

# create our hidden home dir dirs
sudo mkdir /var/crr
sudo mkdir /var/crr/data

# install Client Room Radio as a node package
(cd /vagrant && sudo rm -rf node_modules && sudo npm install)

# put our keys in place so we can run the setup and crr itself
sudo mkdir -p /etc/crr
sudo ln -fs /home/vagrant/dropbox/crr.pem /etc/crr/crr.pem

# link the installed files into the correct places  
sudo ln -fs /vagrant/config/apache2.conf /etc/apache2/sites-available/clientroomradio.conf
sudo ln -fs /vagrant/config/upstart.conf /etc/init/crr.conf
sudo mkdir -p /var/www/clientroomradio
sudo ln -fs /vagrant/static /var/www/clientroomradio/html

# make sure upstart sees our config file
sudo initctl reload-configuration

# enable the site and reload the config
sudo a2enmod proxy proxy_http ssl rewrite
sudo a2dissite 000-default.conf
sudo a2ensite clientroomradio.conf
sudo service apache2 restart
