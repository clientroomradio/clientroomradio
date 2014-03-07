directory "/etc/postgresql-common" do
    owner "root"
    mode 0755
end

cookbook_file "/etc/postgresql-common/psqlrc" do
    owner "root"
    mode 0644
    source "psqlrc"
end

