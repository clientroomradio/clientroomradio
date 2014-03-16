f = "libspotify-12.1.51-Linux-x86_64-release.tar.gz"
remote_file "#{Chef::Config[:file_cache_path]}/#{f}" do
    source "https://developer.spotify.com/download/libspotify/#{f}"
    #checksum "5771c5300c2e8ca808c61a5a29505637d872e8d546b758361a6ca50cf2500bbb"
end

bash "make install libspotify" do
    not_if "test -d #{Chef::Config[:file_cache_path]}/libspotify-12.1.51-Linux-x86_64-release"
    user "root"
    cwd Chef::Config[:file_cache_path]
    code <<-EOH
    tar xzf #{f}
    cd libspotify-12.1.51-Linux-x86_64-release
    make install prefix=/usr/local
    ldconfig
EOH
end
