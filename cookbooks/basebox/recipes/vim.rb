cookbook_file "/etc/vim/vimrc.local" do
        source "vimrc"
        owner "root"
        mode 0644
end

