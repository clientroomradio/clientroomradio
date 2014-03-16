file "/etc/default/cpufrequtils" do
  owner "root"
  content 'GOVERNOR="performance"'
end
package "cpufrequtils"

