## So we know which environemnt this machine is in, for bash prompt
file "/etc/chef_environment" do
    owner "root"
    group "root"
    mode 0755
    action :create
    content "CHEF_ENVIRONMENT=\"#{node.chef_environment}\""
end

cookbook_file "/etc/skel/.bashrc" do
    source "skel-bashrc"
    owner "root"
    mode "0644"
end

cookbook_file "/etc/bashrc_global" do
    source "bashrc"
    owner "root"
    mode "0644"
end

bash "source bashrc upgrade" do
    only_if "test -f /home/vagrant/.bashrc && ! grep bashrc_global /home/vagrant/.bashrc"
    user "root"
    code <<-EOF
    echo "source /etc/bashrc_global" >> /home/vagrant/.bashrc
    EOF
end
