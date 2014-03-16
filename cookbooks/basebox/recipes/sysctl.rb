node.default[:sysctl][:attributes][:fs]['file-max'] = 1048576
# Make keepalive take 60s + (15*8)s  ie. 3 mins, instead of linux default of 2hrs 12mins
node.default[:sysctl][:attributes][:net][:ipv4][:tcp_keepalive_time]   = 60 ## if no data sent in N seconds, start doing keepalive packets
node.default[:sysctl][:attributes][:net][:ipv4][:tcp_keepalive_intvl]  = 15 ## send keepalive packets every N seconds
node.default[:sysctl][:attributes][:net][:ipv4][:tcp_keepalive_probes] = 8  ## if this many keepalive packets are missed, boom.
# Increase pid range a bit because why the hell not
node.default[:sysctl][:attributes][:kernel][:pid_max] = 999999
# General gigabit tuning
node.default[:sysctl][:attributes][:net][:core][:rmem_max] = 16777216
node.default[:sysctl][:attributes][:net][:core][:wmem_max] = 16777216
node.default[:sysctl][:attributes][:net][:ipv4][:tcp_rmem] = "4096 65536 16777216"
node.default[:sysctl][:attributes][:net][:ipv4][:tcp_wmem] = "4096 65536 16777216"

include_recipe "sysctl"

chef_gem "chef-rewind"
require 'chef/rewind'

rewind "cookbook_file[/etc/sysctl.d/69-chef-static.conf]" do
    cookbook "basebox"
end
