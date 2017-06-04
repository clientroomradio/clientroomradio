# Client Room Radio [![Build Status](https://travis-ci.org/clientroomradio/clientroomradio.svg?branch=master)](https://travis-ci.org/clientroomradio/clientroomradio)

## Development Setup Instructions

Bring up a vagrant instance which will do the provisioning, then ssh into it:

```bash
vagrant up # this will take a while to provision everything on first run 
vagrant ssh
```

Once inside the box we have to do a final bit of manual setup.

```bash
/vagrant/bin/setup.js <lfmApiKey> <lfmSecret>
/vagrant/bin/app.js
```

You should now have Client Room Radio running in a VM.

## Server Setup Instructions

This is mostly manually doing what the provision.sh script does. Could probably automate it too...

I've set this up on an Ubuntu 14.04 server. Some of the instructions below will be wrong elsewhere. Mostly Apache I suppose.

### Install Dependencies

Install some more dependencies through apt-get. 

```bash
apt-get install apache2 build-essential
```

Install nodejs 8.0.0 through [nvm](https://github.com/creationix/nvm). Once nvm is installed:

```bash
nvm install 8.0.0
nvm alias default 8.0.0
```

### Install Client Room Radio

now you can npm install us from git!

```bash
npm install -g git+ssh://git@github.com:clientroomradio/clientroomradio.git`
```

Now run `crr-setup` with your Last.fm api account key and secret. This will ask you to log into Last.fm as the host user (the user who's account all tracks will be scrobbled to) and then create the config file `/etc/crr/config.js`. By default the config is set to not scrobble to the host user, but you can turn that on there.

```bash
crr-setup <lfm_key> <lfm_secret>
```

### Serve Client Room Radio

I think most of this can be an npm post-install script, but for now it's manual and this documents whatever that script will become.

We use Apache2 and Upstart. Config files for these are installed in our node package and you can symlink them into place as below.

```bash
ln -s /usr/local/lib/node_modules/clientroomradio/config/apache2.conf /etc/apache2/sites-available/clientroomradio.conf
ln -s /usr/local/lib/node_modules/clientroomradio/config/upstart.conf /etc/init/crr.conf
```

And also link in the static files to an area apache likes serving from.

```bash
mkdir -p /var/www/clientroomradio
ln -s /usr/local/lib/node_modules/clientroomradio/static /var/www/clientroomradio/html
```

Upstart doesn't seem to see our symlink in `/etc/init/crr.conf` automatically so you'll probably have to do this `initctl reload-configuration`. Client Room Radio can now be started and stopped with `start crr` and `stop crr`.

Now that crr is running we can start serving it with apache which requires an ssl ceritificate placed here: `/etc/crr/crr.pem`. We can then enable the site and reloading the apache service as below.

```bash
a2enmod proxy proxy_http ssl rewrite
a2ensite clientroomradio.conf
service apache2 restart
```

I think we're done!
