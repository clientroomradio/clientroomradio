clientroomradio
===============

Client Room Radio


## Setting up the dev environment

* Install vagrant, virtualbox
* Git clone this repo, cd to it, then:
* `vagrant plugin install vagrant-omnibus`
* `vagrant plugin install vagrant-berkshelf`
* `vagrant plugin install vagrant-multiprovider-snap` (optional)
* `vagrant up` (this will download and install stuff, takes time)

This will download and install stuff. It will take a while the first
time. Assuming it completes successfully, i suggest snapshotting the VM
so you can break things and easily roll back:

* `vagrant snap take`

Now ssh in:

* `vagrant ssh`
* `cd /vagrant/`

Install the node modules:

* `npm install`

Now run the app:

* `.startForever.sh`
