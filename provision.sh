# update repo and install out dependencies
sudo apt-get update
sudo apt-get install -y apache2 nodejs npm libmp3lame-dev libvlc-dev vlc

# fix node
sudo ln -fs `which nodejs` /usr/bin/node

# can't get libspotify on apt-get so install it ourself
wget https://developer.spotify.com/download/libspotify/libspotify-12.1.51-Linux-x86_64-release.tar.gz
tar xzf libspotify-12.1.51-Linux-x86_64-release.tar.gz
(cd libspotify-12.1.51-Linux-x86_64-release && sudo make install prefix=/usr/local)

# create our hidden home dir dirs
sudo mkdir /var/crr
sudo mkdir /var/crr/data

# install Cleint Room Radio as a node package
sudo npm install -g /vagrant

# put our keys in place so we can run the setup and crr itself
sudo mkdir -p /etc/crr
sudo ln -fs /home/vagrant/dropbox/spotify_appkey.key /etc/crr/spotify_appkey.key
sudo ln -fs /home/vagrant/dropbox/crr.pem /etc/crr/crr.pem

# link the installed files into the correct places  
sudo ln -s /usr/local/lib/node_modules/clientroomradio/config/apache2.conf /etc/apache2/sites-available/clientroomradio.conf
sudo ln -s /usr/local/lib/node_modules/clientroomradio/config/upstart.conf /etc/init/crr.conf
sudo mkdir -p /var/www/clientroomradio
sudo ln -s /usr/local/lib/node_modules/clientroomradio/static /var/www/clientroomradio/html

# make sure upstart sees our config file
sudo initctl reload-configuration

# enable the site and reload the config
sudo a2enmod proxy proxy_http ssl rewrite
sudo a2dissite 000-default.conf
sudo a2ensite clientroomradio.conf
sudo service apache2 restart
