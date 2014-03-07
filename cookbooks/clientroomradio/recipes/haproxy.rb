chef_gem "chef-rewind"
require 'chef/rewind'

package "libpcre3-dev"
package "libssl1.0.0"
package "libssl-dev"

node.override['haproxy']['install_method'] = 'source'
node.override['haproxy']['source']['version'] = '1.5-dev18'
node.override['haproxy']['source']['url'] = 'http://haproxy.1wt.eu/download/1.5/src/devel/haproxy-1.5-dev18.tar.gz'
node.override['haproxy']['source']['checksum'] = 'b18bf513585d36b9c4c8a74c3c7b4ad5ac6ebe86339d70894a1cdee74071629f'
node.override['haproxy']['source']['target_os'] = 'linux2628 USE_OPENSSL=1' ## INJECT THIS OPTION
node.override['haproxy']['source']['use_pcre'] = true
node.override['haproxy']['source']['prefix'] = "/usr/local/haproxy"
node.override['haproxy']['conf_dir'] = "/usr/local/haproxy/etc"
# use our haproxy.cfg from this cookbook:
node.override['haproxy']['conf_cookbook'] = 'clientroomradio'

include_recipe "haproxy"

# https://hynek.me/articles/hardening-your-web-servers-ssl-ciphers/
cipherstring = "ECDH+AESGCM:DH+AESGCM:ECDH+AES256:DH+AES256:ECDH+AES128:DH+AES:ECDH+3DES:DH+3DES:RSA+AESGCM:RSA+AES:RSA+3DES:!aNULL:!MD5:!DSS:!AES256"

rewind :template => "#{node['haproxy']['conf_dir']}/haproxy.cfg" do
    cookbook "clientroomradio"
    variables :ssl_path => "???",
              :cipherstring => cipherstring
end
