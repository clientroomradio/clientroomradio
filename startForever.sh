echo "Starting app.js in a loop."
echo 

while :
do
    echo "#### RESTARTING `date` ####"
    bin/app.js >> logs/crr.sys.log 2>&1
    echo "Sleeping one second. Press [CTRL+C] to stop.."
    sleep 1
done