apt_repository "nodejs" do
    uri "http://ppa.launchpad.net/richarvey/nodejs/ubuntu"
    distribution "precise"
    components ["main"]
    keyserver "keyserver.ubuntu.com"
    key "20B1B760"
    notifies :run, "execute[apt-get update]", :immediately
end

package "nodejs"
package "npm"
