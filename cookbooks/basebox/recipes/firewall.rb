## Goodbye UFW
package "ufw" do
  action :remove
end

## Block brute force attempts
include_recipe "fail2ban"

## Default AFW settings
node.override[:afw][:enable] = true
node.override[:afw][:enable_output_drop] = false
node.override[:afw][:enable_output_drop_log] = false
node.override[:afw][:enable_input_drop_log] = false
node.override[:afw][:use_rule_comments] = true

rules = {
  'Always allow SSH' => {
      :table => 'filter',
      :rule => '-A INPUT -p tcp --dport 22 -j ACCEPT -m comment --comment "Allow SSH from anywhere"'
  },
  'Allow ICMP for PING' => {
      :table => 'filter',
      :rule => '-A INPUT -p icmp -j ACCEPT -m comment --comment "All ICMP is allowed"'
  },
# 'Allow port 443 from specific IP' => {
#     :table => 'filter',
#     :rule => '-A INPUT -p tcp --dport 443 -s 1.2.3.4 -j ACCEPT'
# },
# 'Munin poller' => {
#     :protocol => 'tcp',
#     :direction => 'in',
#     :user => 'root',
#     :source => 'roles:monitoring',
#     :dport => '4949',
#     :options => ['disable_env_limit']
# },
}

rules.each do |k,v|
    node.override[:afw][:rules][k] = v
end

include_recipe 'afw'


file "/etc/network/if-up.d/ip6tables" do
  content "#!/bin/bash\nip6tables-restore < /etc/firewall/rules.ip6tables"
  user "root"
  mode "0555"
end

bash "reloadv6fw" do
    action :nothing
    code "/etc/network/if-up.d/ip6tables"
    user "root"
end

cookbook_file "/etc/firewall/rules.ip6tables" do
    action :create
    owner "root"
    source "rules.ip6tables"
    notifies :run, "bash[reloadv6fw]", :immediately
end


