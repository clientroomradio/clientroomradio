## Install cool packages from apt
include_recipe "basebox::apt"
## Set up ssh known hosts
include_recipe "basebox::ssh"
## Firewall with default settings, using AFW cookbook
include_recipe "basebox::firewall"
## Configure timezone
include_recipe "basebox::timezone"
## Configure NTP so clock stays correct
include_recipe "basebox::ntp"
## Tweak useful sysctl things
include_recipe "basebox::sysctl"
## CPU frequency scaling tuning
include_recipe "basebox::cpufreq"

## Set up common global config files
include_recipe "basebox::bash"
include_recipe "basebox::psql"
include_recipe "basebox::vim"
include_recipe "basebox::screen"


## Sudo, sysadmin group
include_recipe "basebox::users"

