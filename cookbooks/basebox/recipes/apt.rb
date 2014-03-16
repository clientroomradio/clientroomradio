## Ensure updated apt stuff
include_recipe "apt"

## Ensure various cool packages are installed.
pkgs = [ 
        "vim",
        "curl",
        "sysstat",
        "unzip",
        "ack-grep",
        "git",
        "telnet",
        "screen",
        "host",
        "manpages-dev",
        "build-essential",
        "libcap2-bin", # for setcap
        "pkg-config",
        "libtool",
        "autoconf"
]

pkgs.each do |pkg|
    apt_package pkg
end

extra_pkgs = node["basebox"]["extra_packages"]
extra_pkgs.each do |pkg|
    apt_package pkg
end
