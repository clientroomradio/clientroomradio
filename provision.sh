# update repo and install out dependencies
sudo apt-get update
sudo apt-get install -y apache2 make clang libvlc-dev vlc phantomjs

# mocha-phantomjs only seems to look in /usr/bin so instead of 
# passing a -p flag, lets symlink it here in this special case
sudo ln -s /usr/bin/phantomjs /usr/local/bin/phantomjs

# install node 5.7.1 via nvm
wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.31.0/install.sh | bash
echo "source /home/vagrant/.nvm/nvm.sh" >> /home/vagrant/.profile
source /home/vagrant/.profile
nvm install 5.7.1
nvm alias default 5.7.1

# create our hidden home dir dirs
sudo mkdir /etc/crr
sudo mkdir /var/crr
sudo mkdir /var/crr/data
sudo touch /var/log/crr.log
sudo touch /var/log/crr.winston.log
sudo chown vagrant /etc/crr
sudo chown vagrant /var/crr
sudo chown vagrant /var/crr/data
sudo chown vagrant /var/log/crr.log
sudo chown vagrant /var/log/crr.winston.log


# install Client Room Radio as a node package
(cd /vagrant && rm -rf node_modules && npm install)

# link the installed files into the correct places  
sudo ln -fs /vagrant/config/apache2.vagrant.conf /etc/apache2/sites-available/clientroomradio.conf
sudo ln -fs /vagrant/config/upstart.conf /etc/init/crr.conf
sudo mkdir -p /var/www/clientroomradio
sudo ln -fs /vagrant/static /var/www/clientroomradio/html

# make sure upstart sees our config file
sudo initctl reload-configuration

# enable the site and reload the config
sudo a2enmod proxy proxy_http proxy_wstunnel ssl rewrite
sudo a2dissite 000-default.conf
sudo a2ensite clientroomradio.conf
sudo service apache2 restart
