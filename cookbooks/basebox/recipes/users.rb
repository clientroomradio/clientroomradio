include_recipe "users"

group "sysadmin" do
    gid "2300"
end

users_manage "sysadmin" do
    group_id 2300
    action :create
end

node.set['authorization']['sudo']['groups'] = ['sysadmin']
node.set['authorization']['sudo']['passwordless'] = true
node.set['authorization']['sudo']['users'] = ['vagrant']
node.set['authorization']['sudo']['agent_forwarding'] = true
node.set['authorization']['sudo']['include_sudoers_d'] = true

include_recipe "sudo"

