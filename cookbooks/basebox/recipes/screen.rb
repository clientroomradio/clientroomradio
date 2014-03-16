cookbook_file "/etc/screenrc" do
        source "screenrc"
        owner "root"
        mode 0644
end

