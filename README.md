# Client Room Radio [![Build Status](https://travis-ci.org/clientroomradio/clientroomradio.svg?branch=master)](https://travis-ci.org/clientroomradio/clientroomradio)

## Development Setup Instructions

Bring up a vagrant instance which will do the provisioning then ssh into it.

```
vagrant up
vagrant ssh
```

Once inside the box we have to do a final bit of manual setup.

```
/vagrant/bin/setup.js <lfmApiKey> <lfmSecret> <spUsername> <spPassword>
/vagrant/bin/app.js
```

Run tests!

```
sudo npm test
```

You should now have Client Room Radio running in a VM.

## Server Setup Instructions

This is mostly manually doing what the provision.sh script does. Could probably automate it too...

I've set this up on an Ubuntu 14.04 server. Some of the instructions below will be wrong elsewhere. Mostly Apache I suppose.

### Install Dependencies

Install some more dependencies through apt-get. 

```
apt-get install apache2 build-essential libvlc-dev vlc
```

Install node 5.7.1 from source. Something like this
```
# install node 5.7.1 binaries
wget https://nodejs.org/dist/v5.7.1/node-v5.7.1.tar.gz
tar xzf node-v5.7.1.tar.gz
(cd node-v5.7.1 && ./configure && make install)
```

### Install Client Room Radio

now you can npm install us from git!

```
npm install -g git+ssh://git@github.com:clientroomradio/clientroomradio.git`
```

Now run `crr-setup` with your Last.fm and Spotify details. This will log you in to Spotify and allow you to log in to Last.fm as the host user (the user who's account all tracks will be scrobbled to). This will create a config file here `/etc/crr/config.js`. By deault it won't scrobble to the host user, but you can turn that on there.

```
crr-setup <lfm_key> <lfm_secret> <sp_user> <sp_pass>
```

### Serve Client Room Radio

I think most of this can be an npm post-install script, but for now it's manual and this documents whatever that script will become.

We use Apache2 and Upstart. Config files for these are installed in our node package and you can symlink them into place as below.

```
ln -s /usr/local/lib/node_modules/clientroomradio/config/apache2.conf /etc/apache2/sites-available/clientroomradio.conf
ln -s /usr/local/lib/node_modules/clientroomradio/config/upstart.conf /etc/init/crr.conf
```

And also link in the static files to an area apache likes serving from.

```
mkdir -p /var/www/clientroomradio
ln -s /usr/local/lib/node_modules/clientroomradio/static /var/www/clientroomradio/html
```

Upstart doesn't seem to see our symlink in `/etc/init/crr.conf` automatically so you'll probably have to do this `initctl reload-configuration`. Client Room Radio can now be started and stopped with `start crr` and `stop crr`.

Now that crr is running we can start serving it with apache which requires an ssl ceritificate placed here: `/etc/crr/crr.pem`. We can then enable the site and reloading the apache service as below.

```
a2enmod proxy proxy_http ssl rewrite
a2ensite clientroomradio.conf
service apache2 restart
```

I think we're done!
