# -*- mode: ruby -*-
# vi: set ft=ruby :
# NB, do this:
# vagrant plugin install vagrant-omnibus
# vagrant plugin install vagrant-berkshelf
# Select a nice box from this list: https://github.com/opscode/bento
BOXNAME = "opscode_ubuntu-12.04"
BOX_VAG = "http://opscode-vm-bento.s3.amazonaws.com/vagrant/virtualbox/opscode_ubuntu-12.04_chef-provisionerless.box"
BOX_VMW = "http://opscode-vm-bento.s3.amazonaws.com/vagrant/vmware/opscode_ubuntu-12.04_chef-provisionerless.box"
RAM = 512
HOSTNAME = "crr"
PROVIDER = (ARGV[2] || ENV['VAGRANT_DEFAULT_PROVIDER'] || :virtualbox).to_sym

# I'm using vmware fusion with the commercial vagrant plugin, to test some
# enterprise stuff. I use this command:
# VAGRANT_DEFAULT_PROVIDER=vmware_fusion vagrant up
# instead of plain old "vagrant up"

# provider-specific box config
def set_box(config)
    if PROVIDER == :vmware_fusion 
        config.vm.provider "vmware_fusion" do |v| 
            v.vmx["memsize"] = "#{RAM}"
            config.vm.box_url = BOX_VMW
            config.vm.box = "#{BOXNAME}-vmware"
        end
    end
    if PROVIDER == :virtualbox
        config.vm.provider "virtualbox"    do |v|
            v.customize ["modifyvm", :id, "--memory", RAM]
            config.vm.box_url = BOX_VAG
            config.vm.box = "#{BOXNAME}-virtualbox"
        end
    end
end

Vagrant.configure("2") do |config|
    # Install latest chef-client onto vm
    config.omnibus.chef_version = "11.10.4"  # :latest
    # Bershelf manages cookbooks and deps
    config.berkshelf.enabled = true
    config.berkshelf.berksfile_path = "cookbooks/Berksfile"

    set_box(config)
    config.vm.hostname = HOSTNAME
    config.vm.network :public_network #, ip: "10.0.0.10"
    config.ssh.forward_agent = true

    recipes = ["basebox", "clientroomradio"]
    config.vm.provision "chef_solo" do |chef|
        recipes.each { |r| chef.add_recipe r }
    end
end

