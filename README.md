# Client Room Radio [![Build Status](https://travis-ci.org/clientroomradio/clientroomradio.svg?branch=master)](https://travis-ci.org/clientroomradio/clientroomradio)

## Development Setup Instructions

Bring up a vagrant instance which will do the provisioning then ssh into it.

```
vagrant up
vagrant ssh
```

Once inside the box we have to do a final bit of manual setup.

```
sudo crr-setup <lfmApiKey> <lfmSecret> <spUsername> <spPassword>
sudo start crr
```

You should now have Client Room Radio running in a VM.

## Server Setup Instructions

This is mostly manually doing what the provision.sh script does. Could probably automate it too...

I've set this up on an Ubuntu 14.04 server. Some of the instructions below will be wrong elsewhere. Mostly Apache I suppose.

### Install Dependencies

First install libspotify, which is all a bit manual. You should be able to find a version for you [here](https://developer.spotify.com/technologies/libspotify/). You can probably follow the instructions there, but for me it was.

```
wget https://developer.spotify.com/download/libspotify/libspotify-12.1.51-Linux-x86_64-release.tar.gz
tar xzf libspotify-12.1.51-Linux-x86_64-release.tar.gz
cd libspotify-12.1.51-Linux-x86_64-release
make install prefix=/usr/local
```

Install some more dependencies through apt-get. 

```
apt-get install apache2 nodejs npm libmp3lame-dev libvlc-dev vlc
```

### Install Client Room Radio

Some of the Client Room Radio dependencies rely on the node binary being called `node` and not `nodejs` so create a symlink

```
ln -s `which nodejs` /usr/bin/node
```

now you can npm install us from git!

```
npm install -g git+ssh://git@github.com:clientroomradio/clientroomradio.git`
```

To run the setup script you'll need a Last.fm web services account. You'll also need a Spotify app key placed in here `/etc/crr/spotify_appkey.key`.

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

And also link in the static files to an area apache likes serving from .

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
