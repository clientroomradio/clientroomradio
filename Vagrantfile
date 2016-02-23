# -*- mode: ruby -*-
# vi: set ft=ruby :
Vagrant.configure(2) do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.hostname = "crr"
  config.vm.network :public_network
  config.ssh.insert_key = true
  config.vm.synced_folder "~/Dropbox/clientroomradio/", "/home/vagrant/dropbox"
  config.vm.provision "shell", path: "provision.sh", :privileged => false
end
