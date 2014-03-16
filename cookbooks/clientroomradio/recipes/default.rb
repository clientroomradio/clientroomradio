include_recipe "basebox"

directory "/etc/clientroomradio" do
    owner "root"
    action :create
end

if not File.exist?("/etc/clientroomradio/crr.pem")
    file "/etc/clientroomradio/crr.pem" do
        owner "root"
        group "root"
        mode 0644
        action :create
        content ::File.open(node['clientroomradio']['pem_path']).read
    end
end

include_recipe "clientroomradio::node"
include_recipe "clientroomradio::libspotify"
include_recipe "clientroomradio::redis"
include_recipe "clientroomradio::haproxy"


AFW.create_rule(node,
        "Allow http",
        {'table' => 'filter',
        'rule'  => '-A INPUT -p tcp --dport 80 -j ACCEPT'
        })
AFW.create_rule(node,
        "Allow http",
        {'table' => 'filter',
        'rule'  => '-A INPUT -p tcp --dport 443 -j ACCEPT'
        })


